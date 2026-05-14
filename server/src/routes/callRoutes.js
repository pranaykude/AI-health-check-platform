const express = require('express');
const router = express.Router();
const callController = require('../controllers/callController');
const voiceController = require('../controllers/voiceController');

// Step 4: Voice Response
router.get('/voice', voiceController.handleIncomingVoice);
router.post('/voice', voiceController.handleIncomingVoice);
router.post('/process', voiceController.processSpeech);
router.get('/audio/:id', voiceController.serveAudio);

// Step 3: Initiate Call
router.post('/initiate', callController.initiateCall);
router.post('/trigger', callController.triggerTestCall);

// Step 5: Bulk Initiate
router.post('/bulk', callController.bulkInitiate);

// Step 7: Get Call Logs
router.get('/', callController.getCalls);
router.get('/:id', callController.getCallById);

// Step 5: Retry Failed Call
router.post('/:id/retry', callController.retryCall);

// Step 5: Call Status Webhook
router.post('/webhook', callController.handleWebhook);

module.exports = router;
