const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const InternalNote = require('../models/InternalNote');
const SupportMember = require('../models/SupportMember');
const Client = require('../models/Client');
const EmailLog = require('../models/EmailLog');
const Notification = require('../models/Notification');
const { sendSuccess, sendError } = require('../utils/response');
const aiService = require('../services/aiService');
const logger = require('../utils/logger');
const nodemailer = require('nodemailer');
const socketService = require('../services/socketService');

/**
 * Helper to resolve authenticated support member context
 */
const resolveAgent = async (req) => {
  if (!req.user || !req.user.email) return null;
  return await SupportMember.findOne({ email: req.user.email });
};

/**
 * Global helper to create and push real-time alerts (Phase 6 - Step 1)
 */
exports.createNotification = async (supportMemberId, title, message, type, clientReference = null) => {
  try {
    const notification = await Notification.create({
      supportMemberId,
      title,
      message,
      type: type || 'general',
      clientReference
    });

    // Push real-time alert via websocket coordinator
    socketService.sendNotification(supportMemberId, notification);
    return notification;
  } catch (err) {
    logger.error(`[NOTIFICATION HELPER ERROR] ${err.message}`);
    return null;
  }
};

/**
 * Get all conversations/rooms
 * GET /api/v1/conversations
 */
exports.getConversations = async (req, res) => {
  try {
    const agent = await resolveAgent(req);
    const filter = {
      $or: [
        { type: 'room' },
        { participants: agent ? agent._id : null }
      ]
    };

    const conversations = await Conversation.find(filter)
      .populate('participants', 'fullName avatar role status')
      .populate('clientReference', 'name product')
      .sort({ lastMessageAt: -1 });

    return sendSuccess(res, conversations, 'Conversations retrieved successfully');
  } catch (err) {
    return sendError(res, err.message || 'Error fetching conversations', 500);
  }
};

/**
 * Get details of a single conversation
 * GET /api/v1/conversations/:id
 */
exports.getConversationById = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('participants', 'fullName avatar role status')
      .populate('clientReference', 'name product');

    if (!conversation) {
      return sendError(res, 'Conversation not found', 404);
    }

    return sendSuccess(res, conversation, 'Conversation retrieved successfully');
  } catch (err) {
    return sendError(res, err.message || 'Error fetching conversation details', 500);
  }
};

/**
 * Fetch or dynamically seed client-specific chat rooms
 * GET /api/v1/conversations/client/:clientId
 */
exports.getClientConversations = async (req, res) => {
  try {
    const { clientId } = req.params;
    const client = await Client.findById(clientId);
    if (!client) {
      return sendError(res, 'Client corporate account not found', 404);
    }

    let rooms = await Conversation.find({ clientReference: clientId })
      .populate('participants', 'fullName avatar role status')
      .populate('clientReference', 'name product');

    if (rooms.length === 0) {
      const defaultTopics = [
        { name: `#${client.name.toLowerCase().replace(/\s+/g, '-')}-api-issues`, topic: 'client-api-issues' },
        { name: `#${client.name.toLowerCase().replace(/\s+/g, '-')}-billing-support`, topic: 'billing-support' },
        { name: `#${client.name.toLowerCase().replace(/\s+/g, '-')}-technical-escalation`, topic: 'technical-escalation' }
      ];

      for (const t of defaultTopics) {
        await Conversation.create({
          name: t.name,
          type: 'room',
          clientReference: clientId,
          roomTopic: t.topic,
          lastMessageText: 'Room created. Welcome to client success coordination channel!',
          lastMessageAt: new Date()
        });
      }

      rooms = await Conversation.find({ clientReference: clientId })
        .populate('participants', 'fullName avatar role status')
        .populate('clientReference', 'name product');
    }

    return sendSuccess(res, rooms, 'Client corporate collaboration channels loaded');
  } catch (err) {
    return sendError(res, err.message || 'Error loading client channels', 500);
  }
};

/**
 * Get messages inside a conversation
 * GET /api/v1/messages/:conversationId
 */
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await Message.find({ conversationId })
      .populate('sender', 'fullName avatar role designation')
      .sort({ createdAt: 1 });

    return sendSuccess(res, messages, 'Messages retrieved successfully');
  } catch (err) {
    return sendError(res, err.message || 'Error fetching message log', 500);
  }
};

/**
 * Mark messages as read inside a conversation
 * POST /api/v1/messages/:conversationId/read
 */
exports.markRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const agent = await resolveAgent(req);
    if (!agent) {
      return sendError(res, 'Support Specialist profile not mapped', 400);
    }

    await Message.updateMany(
      { conversationId, readBy: { $ne: agent._id } },
      { $addToSet: { readBy: agent._id } }
    );

    return sendSuccess(res, null, 'Message logs marked as read');
  } catch (err) {
    return sendError(res, err.message || 'Error clearing unread logs', 500);
  }
};

/**
 * Get secure internal client success notes
 * GET /api/v1/internal-notes/:clientId
 */
exports.getInternalNotes = async (req, res) => {
  try {
    const { clientId } = req.params;
    const notes = await InternalNote.find({ clientId })
      .populate('author', 'fullName avatar role designation')
      .sort({ createdAt: -1 });

    return sendSuccess(res, notes, 'Internal notes retrieved successfully');
  } catch (err) {
    return sendError(res, err.message || 'Error loading secure notes', 500);
  }
};

/**
 * Create a secure private success note / escalation comment
 * POST /api/v1/internal-notes/:clientId
 */
exports.createInternalNote = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { note, type } = req.body;
    const agent = await resolveAgent(req);

    if (!agent) {
      return sendError(res, 'Unauthorized: Support agent identity not resolved', 401);
    }

    if (!note || !note.trim()) {
      return sendError(res, 'Note content cannot be empty', 400);
    }

    const newNote = await InternalNote.create({
      clientId,
      author: agent._id,
      note,
      type: type || 'general'
    });

    const client = await Client.findById(clientId);

    // Dynamic Alert/Notification Trigger (Phase 6 - Step 1)
    await exports.createNotification(
      agent._id,
      'New Private Note Recorded',
      `Internal private remarks logged under client account: ${client ? client.name : 'Unknown Client'}.`,
      'general',
      clientId
    );

    const populatedNote = await InternalNote.findById(newNote._id).populate('author', 'fullName avatar role designation');

    return sendSuccess(res, populatedNote, 'Secure private note saved');
  } catch (err) {
    return sendError(res, err.message || 'Error saving internal note', 500);
  }
};

/**
 * Generate AI-assisted Client Email Drafts (Phase 4 & 5)
 * POST /api/v1/chat/ai/draft-email
 */
exports.generateAiDraft = async (req, res) => {
  try {
    const { clientId, draftType, customPrompt } = req.body;
    const client = await Client.findById(clientId);
    if (!client) {
      return sendError(res, 'Client not found', 404);
    }

    const openai = aiService.openai;
    const hasOpenAiKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-dummy';

    let subject = "";
    let body = "";

    const clientContext = `
Client Corporate Profile:
Name: ${client.name}
Phone: ${client.phone}
Language: ${client.preferredLanguage}
Product Tier: ${client.product || 'Enterprise Standard'}
`;

    if (hasOpenAiKey) {
      try {
        const response = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are an expert SaaS Customer Success Manager. Generate a professional email draft based on the client type and context.
              
              CRITICAL SAFETY RULES:
              - DO NOT make hallucinated or unsafe promises (e.g. do not offer verified refunds, do not guarantee engineer hotfixes within 1 hour).
              - Remain welcoming, objective, and solution-focused.
              
              RETURN ONLY A JSON OBJECT with:
              - subject: Subject line for the email.
              - body: Fully formatted professional email body.`
            },
            {
              role: "user",
              content: `Client Context:\n${clientContext}\nDraft Type: ${draftType || 'follow_up'}\nAdditional Prompt Instructions: ${customPrompt || 'none'}`
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.4
        });

        const result = JSON.parse(response.choices[0].message.content);
        subject = result.subject || `Follow-up regarding your ${client.product || 'Enterprise Care'} service`;
        body = result.body || "";
      } catch (gptErr) {
        logger.error(`[CHAT GPT DRAFT ERROR]: ${gptErr.message}`);
      }
    }

    // Fallback Mock Draft generation in case GPT is offline/mock mode
    if (!body) {
      const lowerType = (draftType || '').toLowerCase();
      if (lowerType === 'onboarding') {
        subject = `Welcome to ORAI Robotics - Kickstarting your ${client.product || 'Enterprise Care'} plan`;
        body = `Dear ${client.name} team,\n\nWe are absolutely delighted to welcome you to ORAI Robotics! Your ${client.product || 'Enterprise Care'} active plan is now fully set up.\n\nOur engineering team has initialized your integration dashboards. Please let us know if there is a preferred time this week for our customer success kickoff call to configure your primary voice triggers.\n\nBest regards,\nORAI Success Support Team`;
      } else if (lowerType === 'escalation') {
        subject = `IMPORTANT: Update regarding your recent technical service query`;
        body = `Dear ${client.name} management,\n\nI am writing to personally follow up on the integration queries you brought to our attention during our last voice check-in.\n\nOur operations engineering group is currently auditing the pipeline metrics to verify standard alignment. We will provide a structured progress update as soon as the review completes.\n\nThank you for your valuable patience.\n\nWarm regards,\nORAI Escalations Desk`;
      } else {
        // Follow-up fallback
        subject = `Following up on our recent conversation - ORAI Success`;
        body = `Dear ${client.name} team,\n\nThank you for taking the time to complete our voice health audit call. We wanted to confirm that we have logged your technical feedback and integration preferences inside our internal systems.\n\nWe will remain in close contact to ensure all services are performing at maximum levels.\n\nBest regards,\nORAI Customer Success Desk`;
      }
    }

    return sendSuccess(res, { subject, body }, 'AI Email Draft prepared successfully');
  } catch (err) {
    return sendError(res, err.message || 'Error generating AI email draft', 500);
  }
};

/**
 * Send Professional client email (Phase 5 - Step 1 & 2)
 * POST /api/v1/chat/emails/:clientId
 */
exports.sendClientEmail = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { recipientEmail, subject, body, attachments } = req.body;
    const agent = await resolveAgent(req);

    if (!agent) {
      return sendError(res, 'Unauthorized: Support agent identity not verified', 401);
    }

    if (!recipientEmail || !subject || !body) {
      return sendError(res, 'Missing email recipient, subject, or body contents', 400);
    }

    // Try sending email via nodemailer
    let status = 'sent';
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER || '',
          pass: process.env.EMAIL_PASS || '',
        },
      });

      // Verify SMTP credentials before trying to transmit
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await transporter.sendMail({
          from: `"ORAI Robotics Success Desk" <${process.env.EMAIL_USER}>`,
          to: recipientEmail,
          subject: subject,
          text: body,
        });
        status = 'delivered';
        logger.info(`[EMAIL DISPATCH] Email successfully sent to ${recipientEmail}`);
      } else {
        logger.warn('[EMAIL SIMULATION] SMTP details not configured. Simulating delivery.');
        status = 'delivered'; // In developer/preview mode we mark as delivered successfully
      }
    } catch (mailErr) {
      logger.error(`[EMAIL SMTP ERROR] ${mailErr.message}`);
      status = 'failed';
    }

    // Save persistent log record inside database (Step 2)
    const log = await EmailLog.create({
      clientId,
      senderId: agent._id,
      recipientEmail,
      subject,
      body,
      attachments: attachments || [],
      deliveryStatus: status
    });

    const client = await Client.findById(clientId);

    // Dynamic Alert/Notification Trigger (Phase 6 - Step 1)
    await exports.createNotification(
      agent._id,
      'Outbound Email Logged',
      `Outbound professional success email dispatched to: ${recipientEmail} (${status}).`,
      'general',
      clientId
    );

    const populatedLog = await EmailLog.findById(log._id).populate('senderId', 'fullName role designation');

    return sendSuccess(res, populatedLog, status === 'delivered' ? 'Email delivered successfully' : 'Email logged but transmission failed');
  } catch (err) {
    return sendError(res, err.message || 'Error processing email dispatch', 500);
  }
};

/**
 * Get sent emails log history
 * GET /api/v1/chat/emails/:clientId
 */
exports.getEmailHistory = async (req, res) => {
  try {
    const { clientId } = req.params;
    const history = await EmailLog.find({ clientId })
      .populate('senderId', 'fullName avatar role designation')
      .sort({ createdAt: -1 });

    return sendSuccess(res, history, 'Email communications log retrieved');
  } catch (err) {
    return sendError(res, err.message || 'Error fetching email logs history', 500);
  }
};

/**
 * Get active user notifications (Phase 6 & 8 - Step 2 API Optimization)
 * GET /api/v1/chat/notifications
 */
exports.getNotifications = async (req, res) => {
  try {
    const agent = await resolveAgent(req);
    if (!agent) {
      return sendError(res, 'Specialist agent session mismatch', 400);
    }

    // Lazy load constraint - return maximum 25 items for speed optimization
    const notifications = await Notification.find({ supportMemberId: agent._id })
      .populate('clientReference', 'name product')
      .sort({ createdAt: -1 })
      .limit(25);

    return sendSuccess(res, notifications, 'Real-time alert notifications retrieved');
  } catch (err) {
    return sendError(res, err.message || 'Error loading agent notifications', 500);
  }
};

/**
 * Mark Notification as read
 * POST /api/v1/chat/notifications/:id/read
 */
exports.markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndUpdate(id, { read: true }, { new: true });
    if (!notification) {
      return sendError(res, 'Notification alert not found', 404);
    }
    return sendSuccess(res, notification, 'Notification marked as read');
  } catch (err) {
    return sendError(res, err.message || 'Error updating read indicators', 500);
  }
};
