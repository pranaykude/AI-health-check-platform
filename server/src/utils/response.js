/**
 * Standard API Response Utility
 */

/**
 * Send a success response
 * @param {Response} res - Express response object
 * @param {any} data - Data to send (optional)
 * @param {string} message - Descriptive message
 * @param {number} statusCode - HTTP status code (default 200)
 */
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    error: null,
  });
};

/**
 * Send an error response
 * @param {Response} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default 500)
 * @param {any[]} details - Additional error details (default [])
 */
const sendError = (res, message = 'Internal Server Error', statusCode = 500, details = []) => {
  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
    error: {
      details,
    },
  });
};

module.exports = {
  sendSuccess,
  sendError,
};
