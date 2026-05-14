const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Client = require('../src/models/Client');
const Call = require('../models/Call');

async function checkStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/health-check-ai');
    console.log('Connected to MongoDB');
    
    const clientIds = ['69eb76a02907b1b37fb79af4', '69eba3a3d3781afe684bce19'];
    
    for (const id of clientIds) {
      const client = await Client.findById(id);
      console.log(`\n--- Client: ${client.name} (${client.phone}) ---`);
      
      const lastCallAt = client.lastCallAt ? new Date(client.lastCallAt) : null;
      const hoursSince = lastCallAt ? (Date.now() - lastCallAt.getTime()) / (1000 * 60 * 60) : Infinity;
      console.log(`Last Call At: ${lastCallAt}`);
      console.log(`Hours since last call: ${hoursSince.toFixed(2)}`);
      
      const activeCall = await Call.findOne({
        clientId: client._id,
        status: { $in: ['queued', 'processing', 'calling'] }
      });
      console.log(`Active Call Found: ${activeCall ? activeCall.status : 'None'}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

checkStatus();
