const mongoose = require('mongoose');
const path = require('path');
const serverDir = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(serverDir, '.env') });

const Call = require(path.join(serverDir, 'src/models/Call'));

async function clearStuckCalls() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/health-check-ai');
    console.log('Connected to MongoDB');
    
    const clientIds = ['69eb76a02907b1b37fb79af4', '69eba3a3d3781afe684bce19'];
    
    const result = await Call.updateMany(
      { 
        clientId: { $in: clientIds },
        status: { $in: ['queued', 'processing', 'calling'] }
      },
      { 
        status: 'failed',
        lastError: 'Stuck call cleared by system'
      }
    );
    
    console.log(`Cleared ${result.modifiedCount} stuck calls.`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

clearStuckCalls();
