const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Client = require('../src/models/Client');

async function searchClients() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/health-check-ai');
    console.log('Connected to MongoDB');
    
    const phones = ['7276087504', '9309050744'];
    
    for (const phone of phones) {
      const clients = await Client.find({ phone: new RegExp(phone + '$') });
      console.log(`Searching for suffix ${phone}:`, JSON.stringify(clients, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

searchClients();
