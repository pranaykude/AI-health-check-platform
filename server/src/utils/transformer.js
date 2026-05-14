/**
 * Data Transformation Utility
 */
const { normalizePhone } = require('./phoneHelper');

/**
 * Clean a string: trim, remove extra internal spaces, handle empty to null
 * @param {any} val 
 * @returns {string|null}
 */
const cleanString = (val) => {
  if (val === undefined || val === null) return null;
  const cleaned = val.toString().trim().replace(/\s+/g, ' ');
  return cleaned === '' ? null : cleaned;
};

/**
 * Normalize language to "en" or "hi"
 * @param {string} lang 
 * @returns {string}
 */
const normalizeLanguage = (lang) => {
  const l = cleanString(lang)?.toLowerCase();
  if (l === 'en' || l === 'hi') return l;
  return 'en'; // Default
};

/**
 * Normalize status to "active" or "inactive"
 * @param {string} status 
 * @returns {string}
 */
const normalizeStatus = (status) => {
  const s = cleanString(status)?.toLowerCase();
  if (s === 'active' || s === 'inactive') return s;
  
  // Also check for common synonyms if it's not strictly "active"/"inactive"
  const activeKeywords = ['live', 'yes', 'true', 'on'];
  if (activeKeywords.includes(s)) return 'active';
  
  return 'active'; // Default per requirement
};

/**
 * Clean phone number: remove all spaces
 * @param {any} phone 
 * @returns {string|null}
 */
const cleanPhone = (phone) => {
  if (phone === undefined || phone === null) return null;
  const cleaned = phone.toString().trim();
  if (cleaned === '') return null;
  
  try {
    return normalizePhone(cleaned);
  } catch (error) {
    // If normalization fails, return the cleaned string 
    // so the schema validator can throw a proper error
    return cleaned.replace(/\s+/g, '');
  }
};

/**
 * Map raw row keys to system fields
 * @param {Object} row 
 * @returns {Object}
 */
const mapFields = (row) => {
  // Case-insensitive key lookup helpers
  const findVal = (keys) => {
    const foundKey = Object.keys(row).find(k => 
      keys.some(search => k.toLowerCase().trim() === search.toLowerCase())
    );
    return foundKey ? row[foundKey] : null;
  };

  return {
    name: findVal(['name', 'customer name', 'client name', 'full name']),
    phone: findVal(['phone', 'mobile', 'contact', 'phone number', 'mobile number']),
    language: findVal(['language', 'lang']),
    product: findVal(['product', 'customer type', 'service', 'plan']),
    company: findVal(['company', 'organization', 'business']),
    status: findVal(['status', 'state']),
    notes: findVal(['notes', 'comment', 'description', 'update/status', 'remarks'])
  };
};

/**
 * Transform a single raw row
 * @param {Object} rawRow 
 * @param {number} rowNumber
 * @returns {Object}
 */
const transformRow = (rawRow, rowNumber) => {
  const mapped = mapFields(rawRow);
  
  return {
    name: cleanString(mapped.name),
    phone: cleanPhone(mapped.phone),
    language: normalizeLanguage(mapped.language),
    product: cleanString(mapped.product),
    company: cleanString(mapped.company),
    status: normalizeStatus(mapped.status),
    notes: cleanString(mapped.notes),
    rowNumber // Keep track of original row
  };
};

/**
 * Transform an array of raw rows
 * @param {Array} rows 
 * @returns {Array} - Array of transformed records
 */
const transformData = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows.map((row, index) => transformRow(row, index + 1));
};

module.exports = {
  transformData,
};
