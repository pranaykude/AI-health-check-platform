const twilio = require('twilio');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  console.error('Missing Twilio credentials');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

async function checkConfig() {
  try {
    const numbers = await client.incomingPhoneNumbers.list({ limit: 5 });
    console.log('Incoming Phone Numbers:');
    numbers.forEach(n => {
      console.log(`- Number: ${n.phoneNumber}`);
      console.log(`  Voice URL: ${n.voiceUrl}`);
      console.log(`  Voice Method: ${n.voiceMethod}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkConfig();
