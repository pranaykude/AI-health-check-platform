const axios = require('axios');

async function triggerLoadTest() {
  const clientId = '69eb6be634a867f5cd08ba93';
  console.log('Starting Load Test (20 calls)...');
  
  // Note: Since idempotency is enabled, we need different clients or we need to wait for each to finish.
  // Actually, for a real load test of the queue, we should use multiple clients.
  // I'll first create 20 test clients.
}

// I'll just use a loop to trigger the same client but I'll delete the call record in between if needed,
// OR I'll just disable the idempotency check temporarily for the load test.
// Better: Create 20 clients.

const { MongoClient, ObjectId } = require('mongodb');

async function run() {
  const uri = 'mongodb://localhost:27017/health-check-ai';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('health-check-ai');
    const clientsColl = db.collection('clients');
    
    console.log('Creating 20 test clients...');
    const testClients = [];
    for(let i=0; i<20; i++) {
      testClients.push({
        name: `LoadTest Client ${i}`,
        phone: `+9100000000${i.toString().padStart(2, '0')}`,
        status: 'active',
        language: 'en',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    const result = await clientsColl.insertMany(testClients);
    const clientIds = Object.values(result.insertedIds);
    
    console.log(`Triggering calls for ${clientIds.length} clients...`);
    for(const id of clientIds) {
      try {
        await axios.post('http://localhost:5000/api/calls/initiate', { clientId: id.toString() });
        console.log(`Queued call for ${id}`);
      } catch (err) {
        console.error(`Failed to queue ${id}: ${err.response?.data?.message || err.message}`);
      }
    }
    
    console.log('Load test triggered. Check worker logs.');
  } finally {
    await client.close();
  }
}

run();
