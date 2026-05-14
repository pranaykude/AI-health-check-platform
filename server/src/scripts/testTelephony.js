require('dotenv').config();
const telephonyService = require('../services/telephonyService');

async function testCall() {
  const myPhone = '+917276087504';
  
  console.log('--- Telephony Service Test ---');
  console.log(`Target Number: ${myPhone}`);
  
  try {
    const result = await telephonyService.initiateCall({ to: myPhone });
    console.log('SUCCESS!');
    console.log(`Call SID: ${result.callSid}`);
    console.log('Status:', result.response.status);
    process.exit(0);
  } catch (error) {
    console.error('FAILED!');
    console.error(error.message);
    process.exit(1);
  }
}

testCall();
