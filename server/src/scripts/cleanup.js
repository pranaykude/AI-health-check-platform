const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Call = require('../models/Call');
  
  const stuckCalls = await Call.find({ 
    status: { $in: ['queued', 'processing', 'calling', 'initiated', 'ringing'] } 
  });
  
  console.log(`Found ${stuckCalls.length} stuck calls.`);
  
  if (stuckCalls.length > 0) {
    console.log('Clearing stuck calls...');
    await Call.updateMany(
      { status: { $in: ['queued', 'processing', 'calling', 'initiated', 'ringing'] } },
      { $set: { status: 'failed', errorMessage: 'System restart / Cleanup' } }
    );
    console.log('Stuck calls cleared.');
  }
  
  process.exit();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
