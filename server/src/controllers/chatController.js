const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const InternalNote = require('../models/InternalNote');
const SupportMember = require('../models/SupportMember');
const Client = require('../models/Client');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * Helper to resolve authenticated support member context
 */
const resolveAgent = async (req) => {
  if (!req.user || !req.user.email) return null;
  return await SupportMember.findOne({ email: req.user.email });
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

    // Find existing rooms linked to this client
    let rooms = await Conversation.find({ clientReference: clientId })
      .populate('participants', 'fullName avatar role status')
      .populate('clientReference', 'name product');

    // Dynamically Provision / Seed standard success rooms if they do not exist
    if (rooms.length === 0) {
      const defaultTopics = [
        { name: `#${client.name.toLowerCase().replace(/\s+/g, '-')}-api-issues`, topic: 'client-api-issues' },
        { name: `#${client.name.toLowerCase().replace(/\s+/g, '-')}-billing-support`, topic: 'billing-support' },
        { name: `#${client.name.toLowerCase().replace(/\s+/g, '-')}-technical-escalation`, topic: 'technical-escalation' }
      ];

      const createdRooms = [];
      for (const t of defaultTopics) {
        const room = await Conversation.create({
          name: t.name,
          type: 'room',
          clientReference: clientId,
          roomTopic: t.topic,
          lastMessageText: 'Room created. Welcome to client success coordination channel!',
          lastMessageAt: new Date()
        });
        createdRooms.push(room);
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

    const populatedNote = await InternalNote.findById(newNote._id).populate('author', 'fullName avatar role designation');

    return sendSuccess(res, populatedNote, 'Secure private note saved');
  } catch (err) {
    return sendError(res, err.message || 'Error saving internal note', 500);
  }
};
