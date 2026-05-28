/**
 * server/src/scripts/tunnel.js
 * ULTRA-STABLE Infrastructure Stabilizer
 * Bypasses buggy libraries and uses direct binary execution
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const twilio = require('twilio');
const { spawn, execSync } = require('child_process');
const axios = require('axios');

const PORT = process.env.PORT || 5002;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Locate ngrok binary
const NGROK_BIN = path.join(__dirname, '../../node_modules/ngrok/bin/ngrok.exe');

async function start() {
  console.clear();
  console.log('\n==========================================');
  console.log('🛡️  ULTRA-STABLE AI VOICE INFRASTRUCTURE');
  console.log('==========================================\n');

  try {
    // 1. Cleanup old processes
    console.log('🧹 Cleaning up old processes...');
    try {
      execSync('taskkill /F /IM ngrok.exe', { stdio: 'ignore' });
    } catch (e) {}

    // 2. Start Ngrok Binary directly
    console.log(`📡 Opening tunnel on port ${PORT}...`);
    
    const staticDomain = process.env.PUBLIC_URL ? process.env.PUBLIC_URL.replace('https://', '').replace('http://', '').split('/')[0].trim() : null;
    
    let args = ['http', PORT.toString(), '--log=stdout', '--log-level=info'];
    if (staticDomain && (staticDomain.includes('ngrok-free.app') || staticDomain.includes('ngrok-free.dev'))) {
      console.log(`💎 Using Static Domain: ${staticDomain}`);
      args.push('--domain=' + staticDomain);
      args.push('--pooling-enabled');
    }

    const ngrokProcess = spawn(NGROK_BIN, args, { detached: false });
    
    let url = null;
    
    // Wait for the URL from ngrok API (more reliable than parsing logs)
    console.log('⏳ Waiting for tunnel to establish...');
    
    // Check ngrok local API for the tunnel URL (retrying for 10 seconds)
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 500));
      try {
        const response = await axios.get('http://127.0.0.1:4040/api/tunnels');
        if (response.data.tunnels && response.data.tunnels.length > 0) {
          url = response.data.tunnels[0].public_url;
          break;
        }
      } catch (e) {
        // API not ready yet
      }
    }

    if (!url) {
      console.error('❌ Failed to establish tunnel after 10 seconds.');
      ngrokProcess.kill();
      process.exit(1);
    }

    console.log(`✅ TUNNEL ACTIVE: ${url}`);
    
    // 3. Smart Twilio Sync
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      
      console.log(`🔄 Checking Twilio configuration...`);
      const incomingNumbers = await client.incomingPhoneNumbers.list({ phoneNumber: TWILIO_PHONE_NUMBER });

      if (incomingNumbers.length > 0) {
        const number = incomingNumbers[0];
        if (number.voiceUrl !== `${url}/twilio/voice`) {
          console.log(`🛠️  Updating Twilio webhooks...`);
          await client.incomingPhoneNumbers(number.sid).update({
            voiceUrl: `${url}/twilio/voice`,
            voiceMethod: 'POST',
            statusCallback: `${url}/twilio/webhook`,
            statusCallbackMethod: 'POST',
            voiceFallbackUrl: `${url}/twilio/voice`
          });
          console.log(`✅ Twilio Synchronized.`);
        } else {
          console.log(`✅ Twilio already up to date.`);
        }
      }
    }

    // 4. Start Backend
    console.log('\n🚀 LAUNCHING BACKEND SERVER\n');
    const server = spawn('node', ['src/index.js'], {
      stdio: 'inherit',
      shell: true,
      cwd: path.join(__dirname, '../..'),
      env: { ...process.env, PUBLIC_URL: url, BACKEND_URL: url }
    });

    server.on('close', () => {
      ngrokProcess.kill();
      process.exit();
    });

    process.on('SIGINT', () => {
      ngrokProcess.kill();
      process.exit();
    });

  } catch (err) {
    console.error('\n❌ CRITICAL ERROR:', err.message);
    process.exit(1);
  }
}

start();
