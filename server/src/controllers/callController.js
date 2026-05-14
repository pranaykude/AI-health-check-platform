const Client = require('../models/Client');
const Call = require('../models/Call');
const telephonyService = require('../services/telephonyService');
const { sendSuccess, sendError } = require('../utils/response');
const { normalizePhone } = require('../utils/phoneHelper');
const logger = require('../utils/logger');
const voiceController = require('./voiceController');
const { transcribeAudio } = require('../services/voiceService');
const aiService = require('../services/aiService');

/**
 * Helper to process call directly (replacing BullMQ worker)
 */
const processCallDirectly = async (callId, clientId, phone) => {
  try {
    logger.info(`[DIRECT EXECUTION] Starting call process | CallID: ${callId} | ClientID: ${clientId}`);
    
    // 1. Update status to processing
    await Call.findByIdAndUpdate(callId, { status: 'processing' });

    // 2. Initiate Twilio call
    const result = await telephonyService.initiateCall({
      to: phone,
      clientId,
      callId
    });

    // 3. Update record with provider SID
    await Call.findByIdAndUpdate(callId, {
      providerCallId: result.callSid,
      status: 'initiated',
      errorMessage: null
    });

    logger.info(`[DIRECT EXECUTION] Call initiated successfully | SID: ${result.callSid}`);
    return result;
  } catch (error) {
    logger.error(`[DIRECT EXECUTION] Call initiation failed | CallID: ${callId} | Error: ${error.message}`);
    
    await Call.findByIdAndUpdate(callId, {
      status: 'failed',
      errorMessage: error.message
    });
    
    throw error;
  }
};

/**
 * Initiate an outbound call
 * POST /api/calls/initiate
 */
exports.initiateCall = async (req, res) => {
  try {
    const { clientId } = req.body;

    // 1. Validate clientId
    if (!clientId) {
      return sendError(res, 'Client ID is required', 400);
    }

    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return sendError(res, 'Invalid Client ID format', 400);
    }

    // 2. Fetch client from DB
    const client = await Client.findById(clientId);
    
    // 3. Checks
    if (!client) {
      return sendError(res, 'Client not found', 404);
    }

    if (client.status !== 'active') {
      return sendError(res, 'Cannot call an inactive client', 400);
    }

    if (!client.phone) {
      return sendError(res, 'Client phone number is missing', 400);
    }

    // 4. Cooldown Check: Prevent over-contacting clients
    const cooldownHours = process.env.CALL_COOLDOWN_HOURS !== undefined ? parseInt(process.env.CALL_COOLDOWN_HOURS) : 24;
    if (client.lastCallAt) {
      const hoursSinceLastCall = (Date.now() - new Date(client.lastCallAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastCall < cooldownHours) {
        return sendError(res, `Client was recently contacted. Cooldown active for ${Math.ceil(cooldownHours - hoursSinceLastCall)} more hours.`, 429);
      }
    }

    // 5. Idempotency Check: Prevent duplicate active calls
    const activeCall = await Call.findOne({
      clientId: client._id,
      status: { $in: ['queued', 'processing', 'calling'] }
    });

    if (activeCall) {
      return sendError(res, 'A call is already in progress for this client', 409);
    }

    // 5. Normalize phone (E.164)
    let normalizedPhone;
    try {
      normalizedPhone = normalizePhone(client.phone);
    } catch (err) {
      return sendError(res, `Phone validation error: ${err.message}`, 400);
    }

    // 5. Create Call record (Queued)
    const { scheduledAt } = req.body;
    let delay = 0;

    if (scheduledAt) {
      const scheduledTime = new Date(scheduledAt).getTime();
      const currentTime = Date.now();
      
      if (isNaN(scheduledTime)) {
        return sendError(res, 'Invalid scheduledAt timestamp', 400);
      }

      if (scheduledTime < currentTime) {
        return sendError(res, 'Cannot schedule calls in the past', 400);
      }

      delay = scheduledTime - currentTime;
    }

    const callRecord = await Call.create({
      clientId: client._id,
      phone: normalizedPhone,
      status: 'queued',
      provider: 'twilio',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null // Storing for visibility
    });

    // 6. Direct Execution (Replacing Queue)
    if (delay > 0) {
      console.log(`[SCHEDULED] Call scheduled with ${delay}ms delay`);
      setTimeout(() => {
        processCallDirectly(callRecord._id, client._id, normalizedPhone)
          .catch(err => logger.error(`[SCHEDULED ERROR] ${err.message}`));
      }, delay);
    } else {
      // Execute immediately but don't await to keep API responsive
      processCallDirectly(callRecord._id, client._id, normalizedPhone)
        .catch(err => logger.error(`[DIRECT ERROR] ${err.message}`));
    }

    // 7. Update client's lastCallAt
    await Client.findByIdAndUpdate(client._id, { lastCallAt: new Date() });

    // 8. Log success
    logger.info(`[DIRECT] Call process triggered | ClientID: ${client._id}`);

    // 9. Return instant response
    return sendSuccess(res, {
      callId: callRecord._id,
      status: callRecord.status
    }, delay > 0 ? 'Call scheduled successfully' : 'Call initiated successfully');

  } catch (error) {
    logger.error('Queue Call Error:', error);
    return sendError(res, error.message || 'Internal server error', 500);
  }
};

/**
 * Get call logs with pagination and filtering
 * GET /api/calls
 */
exports.getCalls = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const total = await Call.countDocuments(filter);
    const calls = await Call.find(filter)
      .populate('clientId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Sync any non-terminal calls with Twilio (resilience against missed webhooks)
    const syncService = require('../services/syncService');
    const pendingSyncs = calls
      .filter(c => ['initiated', 'ringing', 'in-progress'].includes(c.status) && c.providerCallId)
      .map(c => syncService.syncWithTwilio(c._id));
    
    if (pendingSyncs.length > 0) {
      await Promise.all(pendingSyncs);
      // Re-fetch to get updated statuses for the response
      var finalCalls = await Call.find(filter)
        .populate('clientId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    }

    return sendSuccess(res, {
      calls: (finalCalls || calls).map(c => ({
        id: c._id,
        clientId: c.clientId?._id || c.clientId,
        clientName: c.clientId?.name || 'Unknown',
        phone: c.phone,
        date: c.startedAt || c.createdAt,
        duration: c.duration,
        status: c.status,
        summary: c.summary,
        sentiment: c.sentiment,
        issues: c.issues,
        actionItems: c.actionItems,
        satisfactionScore: c.satisfactionScore,
        businessImpact: c.businessImpact,
        transcript: c.transcript,
        messages: c.messages,
        recordingUrl: c.recordingUrl
      })),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    }, 'Call logs retrieved successfully');
  } catch (error) {
    logger.error('Get Calls Error:', error);
    return sendError(res, 'Failed to fetch call history', 500);
  }
};

/**
 * TwiML Voice Response
 * GET /api/calls/voice
 */
exports.voiceResponse = (req, res) => {
  const VoiceResponse = require('twilio').twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  twiml.say({
    voice: 'alice',
    language: 'en-US'
  }, 'Hello, this is a monthly service health check call from our company. Thank you for your time.');

  const twimlResponse = twiml.toString();
  console.log("[TWIML RESPONSE]", twimlResponse);
  res.type('text/xml');
  res.send(twimlResponse);
};

/**
 * Twilio Call Status Webhook
 * POST /api/calls/webhook
 */
exports.handleWebhook = async (req, res) => {
  try {
    const { CallSid, CallStatus, CallDuration } = req.body;
    
    console.log('[WEBHOOK HIT]');
    logger.info(`[Webhook] SID: ${CallSid} | Status: ${CallStatus}`);

    // 1. Find call in DB
    const existingCall = await Call.findOne({ providerCallId: CallSid });
    if (!existingCall) {
      return res.status(200).send('OK');
    }

    // Idempotency & Safety
    const statusPriority = {
      'pending': 0,
      'queued': 0,
      'processing': 0,
      'initiated': 1,
      'ringing': 2,
      'in-progress': 3,
      'completed': 4,
      'recorded': 4,
      'failed': 4
    };

    let mappedStatus = CallStatus;
    if (CallStatus === 'answered') mappedStatus = 'in-progress';
    if (['busy', 'no-answer', 'canceled'].includes(CallStatus)) mappedStatus = 'failed';

    if ((statusPriority[existingCall.status] || 0) >= (statusPriority[mappedStatus] || 0)) {
      return res.status(200).send('OK');
    }

    const updateData = { status: mappedStatus };

    if (mappedStatus === 'in-progress') {
      updateData.startedAt = new Date();
    }
    
    if (['completed', 'failed'].includes(mappedStatus)) {
      updateData.endedAt = new Date();
      updateData.duration = CallDuration || existingCall.duration || 0;
    }

    await Call.findByIdAndUpdate(existingCall._id, { $set: updateData });

    // 2. Clear conversation memory if call ended
    if (['completed', 'failed'].includes(mappedStatus)) {
      voiceController.clearConversation(CallSid);
    }

    // 3. === CORE FIX: Run AI analysis on completed calls ===
    // We already have the full conversation in messages[], so analyze it NOW
    // without waiting for Twilio recording (which is unreliable with ngrok)
    if (mappedStatus === 'completed') {
      setImmediate(async () => {
        try {
          // Re-fetch the call with latest messages
          const callWithMessages = await Call.findById(existingCall._id);
          
          if (!callWithMessages || callWithMessages.messages.length === 0) {
            logger.warn(`[POST-CALL ANALYSIS] No messages found for call ${existingCall._id}`);
            return;
          }

          // Build transcript from messages[] (already stored turn-by-turn)
          const transcript = callWithMessages.messages
            .filter(m => m.role !== 'system')
            .map(m => `${m.role === 'user' ? 'Client' : 'Alex (AI)'}: ${m.content}`)
            .join('\n');

          logger.info(`[POST-CALL ANALYSIS] Running AI analysis for call ${existingCall._id}`);
          logger.info(`[POST-CALL ANALYSIS] Transcript:\n${transcript}`);

          // Run AI summary
          const summaryData = await aiService.generateSummary(transcript);

          // Save all analysis fields to the DB
          await Call.findByIdAndUpdate(existingCall._id, {
            $set: {
              transcript,
              status: 'recorded',
              summary: summaryData.summary || '',
              sentiment: summaryData.sentiment || 'neutral',
              issues: summaryData.issues || [],
              actionItems: summaryData.action_items || [],
              satisfactionScore: summaryData.satisfaction_score || 5,
              businessImpact: summaryData.business_impact || 'medium',
            }
          });

          logger.info(`[POST-CALL ANALYSIS] ✅ Analysis saved for call ${existingCall._id} | Sentiment: ${summaryData.sentiment}`);
        } catch (analysisError) {
          logger.error(`[POST-CALL ANALYSIS ERROR] ${analysisError.message}`);
        }
      });
    }

    res.status(200).send('OK');

  } catch (error) {
    logger.error('Webhook Handler Error:', error);
    res.status(200).send('OK');
  }
};

/**
 * Bulk initiate calls
 * POST /api/calls/bulk
 */
exports.bulkInitiate = async (req, res) => {
  try {
    const { clientIds } = req.body;
    const mongoose = require('mongoose');

    // 1. Validation & Payload Security
    if (!Array.isArray(clientIds) || clientIds.length === 0) {
      return sendError(res, 'clientIds must be a non-empty array', 400);
    }

    if (clientIds.length > 100) {
      return sendError(res, 'Bulk requests are limited to 100 clients per batch', 400);
    }

    // Validate MongoDB ID format for all IDs
    const invalidIds = clientIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return sendError(res, `Invalid Client ID format detected for ${invalidIds.length} items`, 400);
    }

    // 1. Fetch active clients with valid phones
    const clients = await Client.find({
      _id: { $in: clientIds },
      status: 'active',
      phone: { $exists: true, $ne: '' }
    });

    if (clients.length === 0) {
      return sendError(res, 'No eligible active clients found', 404);
    }

    let queuedCount = 0;
    const errors = [];

    // 2. Process each client
    const cooldownHours = parseInt(process.env.CALL_COOLDOWN_HOURS) || 24;
    
    for (const client of clients) {
      try {
        // Cooldown check for bulk
        if (client.lastCallAt) {
          const hoursSinceLastCall = (Date.now() - new Date(client.lastCallAt).getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastCall < cooldownHours) {
            errors.push({ clientId: client._id, error: `Cooldown active (${Math.ceil(cooldownHours - hoursSinceLastCall)}h left)` });
            continue;
          }
        }

        // Idempotency check for bulk
        const activeCall = await Call.findOne({
          clientId: client._id,
          status: { $in: ['queued', 'processing', 'calling'] }
        });

        if (activeCall) {
          errors.push({ clientId: client._id, error: 'Call already in progress' });
          continue;
        }

        let normalizedPhone = normalizePhone(client.phone);

        // Create Call record
        const callRecord = await Call.create({
          clientId: client._id,
          phone: normalizedPhone,
          status: 'queued',
          provider: 'twilio'
        });

        // Direct execution (Bulk)
        processCallDirectly(callRecord._id, client._id, normalizedPhone)
          .catch(err => logger.error(`[BULK DIRECT ERROR] ${err.message}`));

        logger.info(`[DIRECT] Call initiated (Bulk) | ClientID: ${client._id}`);

        queuedCount++;
      } catch (err) {
        errors.push({ clientId: client._id, error: err.message });
      }
    }

    return sendSuccess(res, {
      totalRequested: clientIds.length,
      totalQueued: queuedCount,
      errors: errors.length > 0 ? errors : undefined
    }, 'Bulk calls queued successfully');

  } catch (error) {
    logger.error('Bulk Initiate Error:', error);
    return sendError(res, 'Internal server error during bulk initiation', 500);
  }
};

/**
 * Retry a failed call
 * POST /api/calls/:id/retry
 */
exports.retryCall = async (req, res) => {
  try {
    const { id } = req.params;

    const call = await Call.findById(id);
    if (!call) {
      return sendError(res, 'Call record not found', 404);
    }

    if (call.status !== 'failed') {
      return sendError(res, `Cannot retry a call with status: ${call.status}`, 400);
    }

    // Direct execution (Retry)
    processCallDirectly(call._id, call.clientId, call.phone)
      .catch(err => logger.error(`[RETRY DIRECT ERROR] ${err.message}`));

    call.status = 'queued';
    call.lastError = null;
    call.errorMessage = null;
    await call.save();

    return sendSuccess(res, {
      callId: call._id,
      status: call.status
    }, 'Call manual retry initiated');
  } catch (error) {
    logger.error('Retry Call Error:', error);
    return sendError(res, 'Failed to retry call', 500);
  }
};

/**
 * Trigger a single test call automatically picking an active client
 * POST /api/calls/trigger
 */
exports.triggerTestCall = async (req, res) => {
  try {
    const client = await Client.findOne({ status: 'active' });
    if (!client) {
      return sendError(res, 'No active clients found to trigger test', 404);
    }

    const normalizedPhone = require('../utils/phoneHelper').normalizePhone(client.phone);

    const callRecord = await Call.create({
      clientId: client._id,
      phone: normalizedPhone,
      status: 'queued',
      provider: 'twilio'
    });

    // Direct execution (Test)
    processCallDirectly(callRecord._id, client._id, normalizedPhone)
      .catch(err => logger.error(`[TEST DIRECT ERROR] ${err.message}`));

    return sendSuccess(res, {
      callId: callRecord._id,
      clientName: client.name
    }, 'Test call triggered and queued');
  } catch (error) {
    logger.error('Trigger Test Error:', error);
    return sendError(res, error.message || 'Internal server error', 500);
  }
};
/**
 * Handle Twilio Recording Status Callback
 * POST /twilio/recording
 */
exports.handleRecording = async (req, res) => {
  try {
    const { CallSid, RecordingSid, RecordingUrl, RecordingStatus, RecordingDuration } = req.body;
    
    console.log('[RECORDING RECEIVED]');
    console.log(`[CALL SID]: ${CallSid}`);
    console.log(`[DURATION]: ${RecordingDuration}s`);

    if (RecordingStatus === 'completed') {
      const call = await Call.findOneAndUpdate(
        { providerCallId: CallSid },
        { 
          recordingSid: RecordingSid,
          recordingUrl: RecordingUrl,
          duration: RecordingDuration || 0,
          status: 'recorded'
        },
        { new: true }
      );

      if (call) {
        logger.info(`[RECORDING STORED] CallID: ${call._id} | URL: ${RecordingUrl}`);
        
        // --- START PIPELINE ---
        console.log('[PIPELINE START]');
        
        try {
          // 1. Transcribe
          const transcript = await transcribeAudio(RecordingUrl);
          console.log('[TRANSCRIPT READY]');
          
          // 2. Summarize
          const summaryData = await aiService.generateSummary(transcript);
          console.log('[SUMMARY READY]');
          
          // 3. Update DB with full data
          await Call.findByIdAndUpdate(call._id, {
            transcript,
            summary: summaryData.summary,
            sentiment: summaryData.sentiment,
            issues: summaryData.issues,
            actionItems: summaryData.action_items,
            satisfactionScore: summaryData.satisfaction_score,
            businessImpact: summaryData.business_impact
          });
          
          console.log('[CALL DATA UPDATED]');
          
        } catch (pipelineError) {
          logger.error(`[PIPELINE ERROR] CallID: ${call._id} | ${pipelineError.message}`);
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    logger.error('[RECORDING ERROR]', error.message);
    res.status(500).send('Error');
  }
};
/**
 * Get single call details by ID
 * GET /api/calls/:id
 */
exports.getCallById = async (req, res) => {
  try {
    const { id } = req.params;
    const call = await Call.findById(id).populate('clientId', 'name email');
    
    if (!call) {
      return sendError(res, 'Call record not found', 404);
    }

    return sendSuccess(res, {
      call: {
        id: call._id,
        clientName: call.clientId?.name || 'Unknown',
        phone: call.phone,
        status: call.status,
        date: call.startedAt || call.createdAt,
        duration: call.duration,
        summary: call.summary,
        sentiment: call.sentiment,
        issues: call.issues,
        actionItems: call.actionItems,
        transcript: call.transcript,
        messages: call.messages,
        recordingUrl: call.recordingUrl,
        languageUsed: call.languageUsed
      }
    }, 'Call details retrieved successfully');

  } catch (error) {
    logger.error('[API ERROR] Get Call Detail:', error.message);
    return sendError(res, 'Error fetching call details', 500);
  }
};
