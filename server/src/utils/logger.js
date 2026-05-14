const winston = require('winston');

const { combine, timestamp, printf, colorize } = winston.format;

// Define custom log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

// Create the logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    process.env.NODE_ENV === 'development' ? colorize() : winston.format.uncolorize(),
    logFormat
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

module.exports = logger;
