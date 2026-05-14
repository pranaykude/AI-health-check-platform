const express = require('express');
const router = express.Router();
const { generateAIResponse } = require('../services/aiService');

/**
 * Route to test AI response generation
 * GET /api/test-ai
 */
router.get('/', async (req, res) => {
  try {
    // Using a known client ID from the database for testing
    // You can also pass clientId as a query param: ?clientId=...
    const clientId = req.query.clientId || "69eba3a3d3781afe684bce19";
    const userText = req.query.text || "Hello, I have a question about my chatbot service.";

    console.log(`[TEST AI] Testing with Client: ${clientId}, Text: ${userText}`);

    const response = await generateAIResponse({
      clientId,
      userText
    });

    res.json({ 
      success: true,
      clientId,
      input: userText,
      response 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;
