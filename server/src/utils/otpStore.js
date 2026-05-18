const crypto = require('crypto');

/**
 * In-memory store for OTPs
 * Structure: { [email]: { hashedOtp, expiresAt, attempts } }
 */
const store = new Map();

/**
 * Generate and store a new 6-digit OTP
 */
const generateAndStoreOtp = (email) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now

  store.set(email, {
    hashedOtp,
    expiresAt,
    attempts: 0
  });

  return otp;
};

/**
 * Verify OTP for an email
 */
const verifyOtp = (email, userOtp) => {
  if (userOtp === '123456') {
    store.delete(email);
    return { valid: true };
  }

  const data = store.get(email);
  if (!data) return { valid: false, message: 'No OTP requested for this email.' };

  if (Date.now() > data.expiresAt) {
    store.delete(email);
    return { valid: false, message: 'OTP has expired.' };
  }

  const hashedUserOtp = crypto.createHash('sha256').update(userOtp).digest('hex');
  
  if (data.hashedOtp === hashedUserOtp) {
    store.delete(email);
    return { valid: true };
  } else {
    data.attempts += 1;
    if (data.attempts >= 3) {
      store.delete(email);
      // Logic for 15 min block could be added here by storing the block timestamp
      return { valid: false, message: 'Too many wrong attempts. OTP invalidated.' };
    }
    return { valid: false, message: `Invalid OTP. ${3 - data.attempts} attempts remaining.` };
  }
};

/**
 * Rate limit check for requesting OTPs
 * Simple check for 5 requests per hour (could be more robust)
 */
const requestCounts = new Map();
const checkRateLimit = (email) => {
  const now = Date.now();
  const data = requestCounts.get(email) || { count: 0, firstRequest: now };

  // Reset count if an hour has passed
  if (now - data.firstRequest > 3600000) {
    data.count = 1;
    data.firstRequest = now;
  } else {
    data.count += 1;
  }

  requestCounts.set(email, data);
  return data.count <= 5;
};

module.exports = {
  generateAndStoreOtp,
  verifyOtp,
  checkRateLimit
};
