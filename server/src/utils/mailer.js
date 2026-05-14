const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD, // Use Gmail App Password
  },
});

/**
 * Send OTP Email
 * @param {string} to - Recipient email
 * @param {string} otp - 6-digit OTP
 */
const sendOtpEmail = async (to, otp) => {
  const mailOptions = {
    from: `"HealthCheck Auth" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Your Login OTP - HealthCheck AI',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; rounded: 12px;">
        <h2 style="color: #3b82f6;">Login Verification</h2>
        <p>Hello,</p>
        <p>Use the following 6-digit OTP to complete your login. This code is valid for 10 minutes.</p>
        <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937; border-radius: 8px; margin: 20px 0;">
          ${otp}
        </div>
        <p style="color: #6b7280; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">Powered by HealthCheck AI Platform</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { sendOtpEmail };
