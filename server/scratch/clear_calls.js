const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
const Call = require('../src/models/Call');

async function checkCalls() {
  await mongoose.connect(process.env.MONGODB_URI);
  const calls = await Call.find({
    clientId: '69eb76a02907b1b37fb79af4',
    status: { $in: ['queued', 'processing', 'calling'] }
  });
  console.log('Active Calls:', JSON.stringify(calls, null, 2));
  
  if (calls.length > 0) {
    console.log('Updating active calls to failed to clear the way...');
    await Call.updateMany(
      { _id: { $in: calls.map(c => c._id) } },
      { status: 'failed', errorMessage: 'Cleared for manual test' }
    );
    console.log('Cleared.');
  }
  
  await mongoose.disconnect();
}

checkCalls();
