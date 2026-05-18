const { Server } = require('socket.io');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const SupportMember = require('../models/SupportMember');
const logger = require('../utils/logger');

// Store map of supportMemberId -> array of socketIds
const activeUsers = new Map();
let io;

/**
 * Initialize Socket.IO Server
 */
const init = (server) => {
  io = new Server(server, {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', process.env.PUBLIC_URL],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  logger.info('[SOCKET] Socket.IO server initialized successfully');

  io.on('connection', (socket) => {
    logger.info(`[SOCKET] User connected: ${socket.id}`);

    // 1. Authenticate & Bind support member identity
    socket.on('auth', async ({ supportMemberId }) => {
      if (!supportMemberId) return;

      socket.supportMemberId = supportMemberId;

      // Add to active map
      if (!activeUsers.has(supportMemberId)) {
        activeUsers.set(supportMemberId, []);
      }
      activeUsers.get(supportMemberId).push(socket.id);

      // Dynamically toggle agent status in DB to "online"
      try {
        await SupportMember.findByIdAndUpdate(supportMemberId, { status: 'online', lastActiveAt: new Date() });
        // Broadcast presence update to everyone
        io.emit('presence_update', { supportMemberId, status: 'online' });
        logger.info(`[SOCKET] Support Agent online: ${supportMemberId}`);
      } catch (err) {
        logger.error(`[SOCKET] Failed to update agent status: ${err.message}`);
      }
    });

    // 2. Join a dynamic Conversation Channel Room
    socket.on('join_room', ({ conversationId }) => {
      if (!conversationId) return;
      socket.join(conversationId);
      logger.info(`[SOCKET] Socket ${socket.id} joined conversation: ${conversationId}`);
    });

    // 3. Leave a Conversation Channel Room
    socket.on('leave_room', ({ conversationId }) => {
      if (!conversationId) return;
      socket.leave(conversationId);
      logger.info(`[SOCKET] Socket ${socket.id} left conversation: ${conversationId}`);
    });

    // 4. Handle Live Typing Alerts
    socket.on('typing', ({ conversationId, isTyping, fullName }) => {
      if (!conversationId || !socket.supportMemberId) return;
      socket.to(conversationId).emit('typing_status', {
        conversationId,
        supportMemberId: socket.supportMemberId,
        fullName,
        isTyping
      });
    });

    // 5. Handle Real-Time Message Transmission
    socket.on('send_message', async ({ conversationId, message, attachments }) => {
      if (!conversationId || !socket.supportMemberId || !message) return;

      try {
        // Save message inside DB
        const newMessage = await Message.create({
          conversationId,
          sender: socket.supportMemberId,
          message,
          attachments: attachments || [],
          readBy: [socket.supportMemberId]
        });

        // Populate sender info before broadcasting
        const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'fullName avatar role designation');

        // Update Conversation's lastMessage fields
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessageText: message,
          lastMessageAt: new Date()
        });

        // Broadcast to everyone in the room (including sender to confirm receipt)
        io.to(conversationId).emit('new_message', populatedMessage);
        
        // Broadcast global update for unread updates/recent list indicators
        io.emit('conversation_updated', {
          conversationId,
          lastMessageText: message,
          lastMessageAt: new Date()
        });

      } catch (err) {
        logger.error(`[SOCKET] Message delivery error: ${err.message}`);
        socket.emit('message_error', { message: 'Failed to deliver message' });
      }
    });

    // 6. Handle Disconnection
    socket.on('disconnect', async () => {
      logger.info(`[SOCKET] User disconnected: ${socket.id}`);
      
      if (socket.supportMemberId) {
        const supportMemberId = socket.supportMemberId;
        const sockets = activeUsers.get(supportMemberId) || [];
        const index = sockets.indexOf(socket.id);
        
        if (index !== -1) {
          sockets.splice(index, 1);
        }

        if (sockets.length === 0) {
          activeUsers.delete(supportMemberId);
          // Toggle agent status to "offline" in DB
          try {
            await SupportMember.findByIdAndUpdate(supportMemberId, { status: 'offline', lastActiveAt: new Date() });
            io.emit('presence_update', { supportMemberId, status: 'offline' });
            logger.info(`[SOCKET] Support Agent offline: ${supportMemberId}`);
          } catch (err) {
            logger.error(`[SOCKET] Failed to set offline status: ${err.message}`);
          }
        } else {
          activeUsers.set(supportMemberId, sockets);
        }
      }
    });
  });

  return io;
};

/**
 * Check if a Support Agent is currently online
 */
const isUserOnline = (supportMemberId) => {
  return activeUsers.has(supportMemberId.toString());
};

module.exports = {
  init,
  isUserOnline
};
