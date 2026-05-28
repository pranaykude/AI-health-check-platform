const { Resend } = require('resend');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

// Initialize Resend with the key from environment variables
const resendApiKey = process.env.RESEND_API_KEY;
let resend;

if (resendApiKey) {
  resend = new Resend(resendApiKey);
  logger.info('Resend service initialized successfully');
} else {
  logger.warn('RESEND_API_KEY is not defined in the environment. Email sending will run in fallback/mock mode.');
}

/**
 * Send an email using Resend
 * @route POST /api/v1/emails/send
 */
exports.sendEmail = async (req, res) => {
  try {
    const { to, cc, subject, bodyHtml, attachments } = req.body;

    if (!to) {
      return sendError(res, 'Recipient (to) is required', 400);
    }

    if (!subject) {
      return sendError(res, 'Subject is required', 400);
    }

    if (!bodyHtml) {
      return sendError(res, 'Email body (bodyHtml) is required', 400);
    }

    // Process and format attachments for the Resend API
    const preparedAttachments = [];
    if (attachments && Array.isArray(attachments)) {
      for (const att of attachments) {
        if (att.content && att.name) {
          let base64Data = att.content;
          // Strip data URI scheme prefix (e.g. "data:image/png;base64,") if present
          if (base64Data.includes(';base64,')) {
            base64Data = base64Data.split(';base64,')[1];
          }
          preparedAttachments.push({
            content: Buffer.from(base64Data, 'base64'),
            filename: att.name,
            contentType: att.type || undefined
          });
        }
      }
    }

    // Default sender must be a verified domain/address on Resend.
    // If your domain orai-robotics.com is not yet verified on Resend, you can define
    // RESEND_FROM_EMAIL=onboarding@resend.dev in your .env file to test.
    const sender = process.env.RESEND_FROM_EMAIL || 'Pranay Kude <pranay.k@orai-robotics.com>';

    if (!resend) {
      logger.warn(`Resend is not initialized. Would have sent email to ${to} with subject: ${subject}`);
      return sendError(res, 'Resend API Key is missing. Please configure RESEND_API_KEY in your .env file.', 500);
    }

    logger.info(`Initiating email dispatch via Resend to: ${to}`);

    const emailOptions = {
      from: sender,
      to: [to],
      subject: subject,
      html: bodyHtml,
    };

    if (cc && cc.trim()) {
      emailOptions.cc = [cc.trim()];
    }

    if (preparedAttachments.length > 0) {
      emailOptions.attachments = preparedAttachments;
    }

    const { data, error } = await resend.emails.send(emailOptions);

    if (error) {
      logger.error('Resend service returned an error:', error);
      return sendError(res, error.message || 'Resend service failed to deliver email', 400, [error]);
    }

    logger.info(`Email sent successfully via Resend. Dispatch ID: ${data.id}`);
    return sendSuccess(res, data, 'Email sent successfully via Resend!');
  } catch (error) {
    logger.error('Unhandled exception in sendEmail controller:', error);
    return sendError(res, error.message || 'Internal Server Error', 500);
  }
};
