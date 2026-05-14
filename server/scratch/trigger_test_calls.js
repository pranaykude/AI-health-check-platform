const axios = require('axios');

async function triggerCalls() {
  const clientIds = ['69eb76a02907b1b37fb79af4', '69eba3a3d3781afe684bce19'];
  const baseUrl = 'http://localhost:5001/api/v1/calls/initiate';

  for (const clientId of clientIds) {
    try {
      console.log(`Triggering call for clientId: ${clientId}...`);
      const response = await axios.post(baseUrl, { clientId });
      console.log(`Success for ${clientId}:`, response.data);
    } catch (error) {
      console.error(`Error for ${clientId}:`, error.response ? error.response.data : error.message);
    }
  }
}

triggerCalls();
