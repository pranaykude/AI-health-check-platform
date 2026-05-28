const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');

// Route to send email using Resend
router.post('/send', emailController.sendEmail);

module.exports = router;
