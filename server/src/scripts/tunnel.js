/**
 * server/src/scripts/tunnel.js
 * Automatically manages ngrok tunnel and syncs it with Twilio Webhooks
 */
require('dotenv').config();
const ngrok = require('ngrok');
const twilio = require('twilio');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 5002;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

async function start() {
  console.log('\n==========================================');
  console.log('🚀 Starting Automated AI Voice Tunnel...');
  console.log('==========================================\n');

  try {
    // 1. Start Ngrok Tunnel
    const staticDomain = process.env.PUBLIC_URL ? process.env.PUBLIC_URL.replace('https://', '').replace('http://', '') : null;
    const isStatic = staticDomain && staticDomain.includes('ngrok-free.dev');

    if (process.env.NGROK_AUTHTOKEN) {
      await ngrok.authtoken(process.env.NGROK_AUTHTOKEN);
    }

    const ngrokConfig = {
      addr: PORT,
    };

    /*
    if (isStatic) {
      ngrokConfig.hostname = staticDomain;
      console.log(`🔗 Using Static Hostname: ${staticDomain}`);
    }
    */

    const url = await ngrok.connect(ngrokConfig);

    console.log(`✅ Tunnel Active: ${url}`);
    process.env.PUBLIC_URL = url;

    // 2. Update Twilio Webhook
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      
      console.log(`Searching for Twilio number: ${TWILIO_PHONE_NUMBER}...`);
      const incomingNumbers = await client.incomingPhoneNumbers.list({ phoneNumber: TWILIO_PHONE_NUMBER });

      if (incomingNumbers.length > 0) {
        const numberSid = incomingNumbers[0].sid;
        const voiceUrl = `${url}/twilio/voice`;
        
        await client.incomingPhoneNumbers(numberSid).update({
          voiceUrl: voiceUrl,
          voiceMethod: 'POST',
          statusCallback: `${url}/twilio/webhook`,
          statusCallbackMethod: 'POST'
        });
        
        console.log(`✅ Twilio Webhook Synchronized: ${voiceUrl}`);
      } else {
        console.warn(`⚠️ Could not find Twilio number ${TWILIO_PHONE_NUMBER} in your account.`);
      }
    } else {
      console.warn('⚠️ Twilio credentials or phone number missing in .env. Skipping webhook sync.');
    }

    console.log('\n📡 Initializing Backend Server...\n');

    // 3. Start the Server (Nodemon)
    const server = spawn('npx', ['nodemon', 'src/index.js'], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, PUBLIC_URL: url }
    });

    server.on('close', async () => {
      console.log('\n🛑 Server closed. Shutting down tunnel...');
      await ngrok.kill();
      process.exit();
    });

    // Handle process termination
    process.on('SIGINT', async () => {
        console.log('\n👋 Shutting down...');
        await ngrok.kill();
        process.exit();
    });

  } catch (err) {
    console.error('❌ Tunnel Error:', err.message);
    if (err.message.includes('authtoken')) {
        console.log('💡 TIP: Add your NGROK_AUTHTOKEN to the .env file to avoid connection limits.');
    }
    process.exit(1);
  }
}

start();
