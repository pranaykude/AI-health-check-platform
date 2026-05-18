const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const SupportMember = require('../models/SupportMember');
const logger = require('../utils/logger');

// Store map of supportMemberId -> array of socketIds
const activeUsers = new Map();
let io;

/**
 * Lightweight cookie parsing utility
 */
const parseCookies = (cookieHeader) => {
  if (!cookieHeader) return {};
  const list = {};
  cookieHeader.split(';').forEach(cookie => {
    let parts = cookie.split('=');
    list[parts.shift().trim()] = decodeURI(parts.join('='));
  });
  return list;
};

/**
 * Initialize Socket.IO Server with JWT Handshake Security
 */
const init = (server) => {
  io = new Server(server, {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', process.env.PUBLIC_URL],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Enforce secure WebSocket authentication boundaries (Phase 7 - Step 2)
  io.use(async (socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie || '');
      const token = cookies.token || socket.handshake.auth?.token;

      if (!token) {
        logger.warn('[SOCKET AUTH] Connection rejected: Missing token');
        return next(new Error('Authentication failed: Token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
      socket.user = decoded; // Attach verified agent payload to connection
      next();
    } catch (err) {
      logger.error(`[SOCKET AUTH] Signature verification failed: ${err.message}`);
      return next(new Error('Authentication failed: Invalid credentials'));
    }
  });

  logger.info('[SOCKET] Socket.IO server secured and initialized successfully');

  io.on('connection', (socket) => {
    logger.info(`[SOCKET] User connected and authenticated: ${socket.id}`);

    // 1. Authenticate & Bind support member identity
    socket.on('auth', async ({ supportMemberId }) => {
      if (!supportMemberId) return;

      // Restrict registration to the authenticated token user only
      if (socket.user && socket.user.id !== supportMemberId.toString()) {
        logger.warn(`[SOCKET AUTH] Agent ${supportMemberId} bypass rejected: User ID mismatch.`);
        return;
      }

      socket.supportMemberId = supportMemberId;

      // Add to active map (supports multiple tabs safely to prevent reconnection storms)
      if (!activeUsers.has(supportMemberId)) {
        activeUsers.set(supportMemberId, []);
      }
      if (!activeUsers.get(supportMemberId).includes(socket.id)) {
        activeUsers.get(supportMemberId).push(socket.id);
      }

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

    // 2. Join a dynamic Conversation Channel Room with authorization controls
    socket.on('join_room', async ({ conversationId }) => {
      if (!conversationId) return;

      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          logger.warn(`[SOCKET ROOM] Room ${conversationId} not found`);
          return;
        }

        // Room access protection: if it's a private chat, enforce participant verification
        if (conversation.type === 'private' && socket.supportMemberId) {
          const isParticipant = conversation.participants.some(
            p => p.toString() === socket.supportMemberId.toString()
          );
          if (!isParticipant) {
            logger.warn(`[SOCKET ROOM] Access denied to room ${conversationId} for agent ${socket.supportMemberId}`);
            return;
          }
        }

        socket.join(conversationId);
        logger.info(`[SOCKET] Socket ${socket.id} joined conversation: ${conversationId}`);
      } catch (err) {
        logger.error(`[SOCKET ROOM] Error checking room authorization: ${err.message}`);
      }
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
 * Send real-time notification to a specific support agent (Phase 6 - Step 1)
 */
const sendNotification = (supportMemberId, notification) => {
  if (io && activeUsers.has(supportMemberId.toString())) {
    const sockets = activeUsers.get(supportMemberId.toString());
    sockets.forEach(socketId => {
      io.to(socketId).emit('notification', notification);
    });
    logger.info(`[SOCKET NOTIFICATION] Broadcast notification to agent: ${supportMemberId}`);
  }
};

/**
 * Check if a Support Agent is currently online
 */
const isUserOnline = (supportMemberId) => {
  return activeUsers.has(supportMemberId.toString());
};

module.exports = {
  init,
  sendNotification,
  isUserOnline
};
