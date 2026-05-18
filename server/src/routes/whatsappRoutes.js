const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const { protect } = require('../middleware/authMiddleware');

// 1. Inbound Meta WhatsApp Webhook endpoints (Public - No JWT validation)
// Meta triggers these endpoints directly from external internet
router.get('/webhook', whatsappController.verifyWebhook);
router.post('/webhook', whatsappController.receiveWebhook);

// 2. Protected dashboard WhatsApp endpoints (JWT protected)
router.get('/conversations', protect, whatsappController.getConversations);
router.get('/conversations/:id/messages', protect, whatsappController.getMessages);
router.post('/messages/send', protect, whatsappController.sendMessage);
router.post('/conversations/:id/read', protect, whatsappController.markRead);

module.exports = router;
