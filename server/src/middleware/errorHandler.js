const logger = require('../utils/logger');
const { sendError } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  logger.error(err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => e.message);
    return sendError(res, 'Validation failed', 400, details);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return sendError(res, `A client with this ${field} already exists`, 409, [{ field }]);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return sendError(res, 'Invalid ID format', 400);
  }

  // Default server error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  // In development, we can pass the stack trace in details or as part of the error object
  const details = process.env.NODE_ENV === 'development' ? [err.stack] : [];
  
  return sendError(res, message, statusCode, details);
};

module.exports = errorHandler;
