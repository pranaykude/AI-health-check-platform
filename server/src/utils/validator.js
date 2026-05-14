/**
 * Data Validation Utility for Ingestion Pipeline
 */

/**
 * Validate a single transformed record
 * @param {Object} record - Transformed record
 * @returns {string|null} - Error message or null if valid
 */
const validateRecord = (record) => {
  // 1. NAME Validation
  if (!record.name || record.name.trim() === '') {
    return 'Missing name';
  }

  // 2. PHONE Validation
  if (!record.phone) {
    return 'Phone number is required';
  }

  // Remove + and any remaining spaces for check
  const digitsOnly = record.phone.toString().replace(/[+]/g, '');
  
  if (!/^\d+$/.test(digitsOnly)) {
    return 'Invalid phone format';
  }

  if (digitsOnly.length < 10) {
    return 'Phone number too short';
  }

  if (digitsOnly.length > 15) {
    return 'Phone number too long';
  }

  // 3. LANGUAGE Validation
  if (!['en', 'hi'].includes(record.language)) {
    return 'Invalid language';
  }

  // 4. STATUS Validation
  if (!['active', 'inactive'].includes(record.status)) {
    return 'Invalid status';
  }

  return null;
};

/**
 * Validate an array of transformed records
 * @param {Array} records - Transformed records
 * @returns {Object} - { validRecords: [], invalidRecords: [] }
 */
const validateData = (records) => {
  const validRecords = [];
  const invalidRecords = [];

  records.forEach((record) => {
    const error = validateRecord(record);
    if (error) {
      invalidRecords.push({
        row: record.rowNumber,
        reason: error,
      });
    } else {
      // Keep rowNumber for tracking in subsequent steps
      validRecords.push(record);
    }
  });

  return { validRecords, invalidRecords };
};

module.exports = {
  validateData,
};
