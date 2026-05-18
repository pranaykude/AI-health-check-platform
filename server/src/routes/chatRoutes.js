const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

// 1. Conversations / Rooms Routing
router.get('/conversations', protect, chatController.getConversations);
router.get('/conversations/:id', protect, chatController.getConversationById);
router.get('/conversations/client/:clientId', protect, chatController.getClientConversations);

// 2. Real-Time Messages Routing
router.get('/messages/:conversationId', protect, chatController.getMessages);
router.post('/messages/:conversationId/read', protect, chatController.markRead);

// 3. Secure Private Client Notes / Remarks Routing (Step 5)
router.get('/internal-notes/:clientId', protect, chatController.getInternalNotes);
router.post('/internal-notes/:clientId', protect, chatController.createInternalNote);

// 4. AI-Integrated Intelligence & Emails Routing (Phase 4 & 5)
router.post('/ai/draft-email', protect, chatController.generateAiDraft);
router.post('/emails/:clientId', protect, chatController.sendClientEmail);
router.get('/emails/:clientId', protect, chatController.getEmailHistory);

module.exports = router;
