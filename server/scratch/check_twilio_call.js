const twilio = require('twilio');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = twilio(accountSid, authToken);

async function checkCall() {
  const sid = 'CAd7a49d2481cb3817729d450555653f63';
  try {
    const call = await client.calls(sid).fetch();
    console.log('Twilio Call Details:');
    console.log('SID:', call.sid);
    console.log('Status:', call.status);
    console.log('To:', call.to);
    console.log('From:', call.from);
    console.log('Price:', call.price);
    console.log('Error Code:', call.errorCode);
    console.log('Error Message:', call.errorMessage);
  } catch (error) {
    console.error('Error fetching call:', error.message);
  }
}

checkCall();
