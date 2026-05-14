const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Client = require('../src/models/Client');

async function checkClients() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/health-check-ai');
    console.log('Connected to MongoDB');
    
    const phones = ['7276087504', '9309050744'];
    const clients = await Client.find({ phone: { $in: phones } });
    
    console.log('Found Clients:', JSON.stringify(clients, null, 2));
    
    if (clients.length === 0) {
      console.log('No clients found for these numbers.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

checkClients();
