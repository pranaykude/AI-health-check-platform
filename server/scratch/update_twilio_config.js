const twilio = require('twilio');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const publicUrl = process.env.PUBLIC_URL;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

async function updateConfig() {
  try {
    const numbers = await client.incomingPhoneNumbers.list({ phoneNumber });
    if (numbers.length === 0) {
      console.error(`Phone number ${phoneNumber} not found in account`);
      return;
    }

    const numberSid = numbers[0].sid;
    const voiceUrl = `${publicUrl}/twilio/voice`;
    const statusCallback = `${publicUrl}/twilio/webhook`;

    await client.incomingPhoneNumbers(numberSid).update({
      voiceUrl,
      voiceMethod: 'POST',
      statusCallback,
      statusCallbackMethod: 'POST'
    });

    console.log(`Successfully updated ${phoneNumber}:`);
    console.log(`New Voice URL: ${voiceUrl}`);
    console.log(`New Status Callback: ${statusCallback}`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

updateConfig();
