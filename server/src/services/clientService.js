const Client = require('../models/Client');

/**
 * Handle duplicate checking (Step 5)
 * Splits validRecords into unique and duplicate records
 * @param {Array} validRecords 
 * @returns {Promise<Object>} - { uniqueRecords: [], duplicateRecords: [] }
 */
const handleDuplicates = async (validRecords) => {
  if (!validRecords || validRecords.length === 0) {
    return { uniqueRecords: [], duplicateRecords: [] };
  }

  // 1. Get all phone numbers from the batch
  const batchPhones = validRecords.map(r => r.phone);

  // 2. Query DB for existing phones
  const existingClients = await Client.find({ phone: { $in: batchPhones } }, 'phone').lean();
  const existingPhonesInDb = new Set(existingClients.map(c => c.phone));

  const uniqueRecords = [];
  const duplicateRecords = [];
  const internalBatchTracker = new Set();

  // 3. Filter records
  validRecords.forEach((record) => {
    const isDbDuplicate = existingPhonesInDb.has(record.phone);
    const isBatchDuplicate = internalBatchTracker.has(record.phone);

    if (isDbDuplicate || isBatchDuplicate) {
      duplicateRecords.push({
        row: record.rowNumber,
        phone: record.phone,
        reason: 'Duplicate phone',
      });
    } else {
      internalBatchTracker.add(record.phone);
      uniqueRecords.push(record);
    }
  });

  return { uniqueRecords, duplicateRecords };
};

/**
 * Bulk insert clients
 * @param {Array} records - Array of unique records
 * @returns {Promise<number>} - Count of inserted records
 */
const bulkInsertClients = async (records) => {
  if (!records || records.length === 0) return 0;
  
  // Remove rowNumber before insertion to keep DB clean
  const docsToInsert = records.map(({ rowNumber, ...rest }) => rest);
  
  try {
    const insertedDocs = await Client.insertMany(docsToInsert, { ordered: false });
    return insertedDocs.length;
  } catch (error) {
    // If partial failure occurred (e.g. unique constraint violation despite our checks),
    // return the count of successfully inserted docs if available.
    if (error.insertedDocs) {
      return error.insertedDocs.length;
    }
    
    // For other fatal errors (connection issues etc.), we don't want to crash
    console.error('Bulk insertion failed:', error.message);
    return 0;
  }
};

module.exports = {
  handleDuplicates,
  bulkInsertClients,
};
