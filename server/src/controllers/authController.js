const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendOtpEmail } = require('../utils/mailer');
const { generateAndStoreOtp, verifyOtp, checkRateLimit } = require('../utils/otpStore');
const logger = require('../utils/logger');

/**
 * Request OTP for Login
 */
exports.requestOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    // 1. Rate Limiting Check
    if (!checkRateLimit(email)) {
      return res.status(429).json({ success: false, message: 'Too many OTP requests. Please try again in an hour.' });
    }

    // 2. Check if user exists (Optional: you can also auto-register users here)
    let user = await User.findOne({ email });
    if (!user) {
      // For this implementation, we'll allow the first user to be created as admin
      const isFirstUser = (await User.countDocuments()) === 0;
      user = await User.create({ email, role: isFirstUser ? 'admin' : 'admin' }); // Default to admin for now per requirement
    }

    // 3. Generate and Send OTP
    const otp = generateAndStoreOtp(email);
    await sendOtpEmail(email, otp);

    logger.info(`[AUTH] OTP sent to ${email}`);
    res.status(200).json({ success: true, message: 'OTP sent to your email.' });
  } catch (error) {
    logger.error(`[AUTH ERROR] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to send OTP. Please check your email configuration.' });
  }
};

/**
 * Verify OTP and Issue JWT
 */
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required' });

    // 1. Verify OTP
    const verification = verifyOtp(email, otp);
    if (!verification.valid) {
      return res.status(400).json({ success: false, message: verification.message });
    }

    // 2. Get User Info
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // 3. Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // 4. Set HttpOnly Cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    logger.info(`[AUTH] User ${email} logged in successfully`);
    res.status(200).json({ 
      success: true, 
      message: 'Login successful',
      user: { email: user.email, role: user.role } 
    });
  } catch (error) {
    logger.error(`[AUTH ERROR] ${error.message}`);
    res.status(500).json({ success: false, message: 'Authentication failed.' });
  }
};

/**
 * Logout
 */
exports.logout = (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

/**
 * Get Current User (Used for frontend initialization)
 */
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-__v');
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching user details' });
  }
};
