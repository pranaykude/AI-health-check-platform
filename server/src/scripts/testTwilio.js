require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const twilioService = require('../services/twilioService');

// REPLACE THIS with your actual phone number to test
const TEST_PHONE_NUMBER = '+917276087504'; 

async function runTest() {
  if (TEST_PHONE_NUMBER === '+910000000000') {
    console.error('Please update TEST_PHONE_NUMBER in server/src/scripts/testTwilio.js with your real number!');
    process.exit(1);
  }

  try {
    const call = await twilioService.makeTestCall(TEST_PHONE_NUMBER);
    console.log('--- TEST RESULT ---');
    console.log('Status:', call.status);
    console.log('SID:', call.sid);
    console.log('Check your phone!');
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

runTest();
