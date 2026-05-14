const csv = require('csv-parser');
const fs = require('fs');
const XLSX = require('xlsx');

/**
 * Parse CSV file to JSON array
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<Array>} - Array of raw rows
 */
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
};

/**
 * Parse Excel file to JSON array
 * @param {string} filePath - Path to the Excel file
 * @returns {Promise<Array>} - Array of raw rows
 */
const parseExcel = (filePath) => {
  return new Promise((resolve, reject) => {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      resolve(data);
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  parseCSV,
  parseExcel,
};
