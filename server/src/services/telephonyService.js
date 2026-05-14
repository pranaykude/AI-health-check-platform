const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
const publicUrl = process.env.PUBLIC_URL;

if (!accountSid || !authToken || !twilioNumber) {
  console.error('[TelephonyService] Missing Twilio credentials in environment');
}

const client = twilio(accountSid, authToken);

/**
 * Initiate an outbound call
 * @param {Object} params - { to }
 * @returns {Promise<Object>} - { callSid, response }
 */
exports.initiateCall = async ({ to, clientId, callId }) => {
  try {
    if (!to) {
      throw new Error('Destination phone number (to) is required');
    }

    // Construct URLs with context
    const voiceUrl = `${publicUrl}/api/v1/calls/voice?clientId=${clientId}&callId=${callId}`;
    const statusCallbackUrl = `${publicUrl}/api/v1/calls/webhook?clientId=${clientId}&callId=${callId}`;

    console.log(`[TelephonyService] Initiating call to ${to} | Client: ${clientId}`);
    console.log(`[TelephonyService] Voice URL: ${voiceUrl}`);

    if (process.env.MOCK_TELEPHONY === 'true' || to === '+910000000000') {
      console.log(`[MOCK] Simulating successful call to ${to}`);
      return {
        callSid: `MCK${Math.random().toString(36).substring(7).toUpperCase()}`,
        response: { status: 'queued' }
      };
    }

    const response = await client.calls.create({
      to: to,
      from: twilioNumber,
      url: voiceUrl,
      method: 'GET',
      statusCallback: statusCallbackUrl,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
    });

    console.log(`[CALL SID] ${response.sid}`);

    return {
      callSid: response.sid,
      response: response,
    };
  } catch (error) {
    console.error("[TWILIO ERROR]", error.message);
    console.error('[TelephonyService] Twilio Error:', error.message);
    throw new Error(`Telephony Service Error: ${error.message}`);
  }
};
/**
 * Start recording an active call
 * @param {string} callSid 
 * @returns {Promise<Object>}
 */
exports.startRecording = async (callSid) => {
  try {
    if (callSid.startsWith('MCK')) {
      console.log(`[MOCK] Starting recording for ${callSid}`);
      console.log(`[RECORDING ENABLED] SID: RE_MOCK_${callSid}`);
      return { sid: 'RE_MOCK' };
    }

    const recording = await client.calls(callSid).recordings.create({
      recordingStatusCallback: `${process.env.PUBLIC_URL}/twilio/recording`,
      recordingStatusCallbackMethod: 'POST',
      recordingChannels: 'dual', // Dual channel is better for transcription (separate AI and User)
      playBeep: true
    });

    console.log(`[RECORDING ENABLED] SID: ${recording.sid}`);
    return recording;
  } catch (error) {
    console.error("[TELEPHONY SERVICE] Recording Error:", error.message);
    throw error;
  }
};
