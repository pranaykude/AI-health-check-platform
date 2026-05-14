const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
const Call = require('../src/models/Call');
const Client = require('../src/models/Client');

async function resetState() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/health-check-ai');
    console.log('Connected to MongoDB');

    const callResult = await Call.updateMany(
      { status: { $in: ['queued', 'processing', 'calling', 'in-progress', 'ringing', 'initiated'] } },
      { status: 'failed', errorMessage: 'Reset by system admin' }
    );
    console.log(`Failed ${callResult.modifiedCount} active calls.`);

    const clientResult = await Client.updateMany(
      {},
      { $unset: { lastCallAt: "" } }
    );
    console.log(`Reset cooldown for ${clientResult.modifiedCount} clients.`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

resetState();
