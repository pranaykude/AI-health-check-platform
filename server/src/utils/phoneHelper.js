/**
 * Normalize phone number to E.164 format (+<country_code><number>)
 * Currently supports India (+91) as default if no country code provided, 
 * but strictly removes all non-numeric characters except leading plus.
 */
exports.normalizePhone = (phone) => {
  if (!phone) return null;

  // Remove all non-numeric characters except '+'
  let cleaned = phone.replace(/[^\d+]/g, '');

  // If it starts with '00', replace with '+'
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2);
  }

  // If it doesn't start with '+', assume it's a number without country code
  // Defaulting to +91 for this specific project context (India)
  if (!cleaned.startsWith('+')) {
    // Remove leading zeros
    cleaned = cleaned.replace(/^0+/, '');
    
    // If it's a 10-digit number, add +91
    if (cleaned.length === 10) {
      cleaned = '+91' + cleaned;
    } else if (cleaned.length > 10) {
      // If it's already got a country code but no '+', add it
      cleaned = '+' + cleaned;
    }
  }

  // Validate E.164 format (simple regex: + followed by 7-15 digits)
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  if (!e164Regex.test(cleaned)) {
    throw new Error(`Invalid phone number format: ${phone}`);
  }

  return cleaned;
};
