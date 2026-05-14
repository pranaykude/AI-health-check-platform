const twilio = require('twilio');
const Call = require('../models/Call');
const logger = require('../utils/logger');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

/**
 * Sync call status with Twilio's real state
 * Useful when webhooks are missed due to tunnel failures.
 */
exports.syncWithTwilio = async (callId) => {
  try {
    const callRecord = await Call.findById(callId);
    if (!callRecord || !callRecord.providerCallId || callRecord.status === 'completed' || callRecord.status === 'failed') {
      return callRecord;
    }

    logger.info(`[SYNC] Fetching Twilio status for ${callRecord.providerCallId}`);
    const twilioCall = await client.calls(callRecord.providerCallId).fetch();
    
    // Map Twilio status to our status
    const statusMapping = {
      'queued': 'queued',
      'ringing': 'ringing',
      'in-progress': 'in-progress',
      'completed': 'completed',
      'failed': 'failed',
      'busy': 'failed',
      'no-answer': 'failed',
      'canceled': 'failed'
    };

    const newStatus = statusMapping[twilioCall.status] || callRecord.status;
    
    // Update record if status changed or duration is available
    if (newStatus !== callRecord.status || twilioCall.duration) {
      callRecord.status = newStatus;
      if (twilioCall.duration) {
        callRecord.duration = parseInt(twilioCall.duration);
      }
      if (twilioCall.price) {
        callRecord.cost = Math.abs(parseFloat(twilioCall.price));
      }
      await callRecord.save();
      logger.info(`[SYNC] Updated call ${callId} to ${newStatus} (${twilioCall.duration}s)`);
    }

    return callRecord;
  } catch (error) {
    logger.error(`[SYNC ERROR] ${error.message}`);
    return null;
  }
};
