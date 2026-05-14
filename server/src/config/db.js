const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  // Register listeners BEFORE connecting so they catch all events,
  // including failures on the very first connection attempt.
  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected. Attempting to reconnect...');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    logger.info(`MongoDB Connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
