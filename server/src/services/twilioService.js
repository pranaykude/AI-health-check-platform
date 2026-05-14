const twilio = require('twilio');

class TwilioService {
  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.from = process.env.TWILIO_PHONE_NUMBER;
    
    if (!accountSid || !authToken || !this.from) {
      console.error('Twilio credentials missing in .env');
      return;
    }

    this.client = twilio(accountSid, authToken);
  }

  /**
   * Initiate an outbound call
   * @param {string} to - Destination phone number
   * @param {string} twimlUrl - URL for TwiML instructions (optional)
   */
  async makeCall(to, twimlUrl = 'http://demo.twilio.com/docs/voice.xml') {
    try {
      if (!this.client) throw new Error('Twilio client not initialized');

      const call = await this.client.calls.create({
        url: twimlUrl,
        to: to,
        from: this.from,
        statusCallback: `${process.env.PUBLIC_URL || process.env.BACKEND_URL}/api/calls/webhook`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
      });

      return call;
    } catch (error) {
      console.error('[Twilio] Error in makeCall:', error.message);
      throw error;
    }
  }

  /**
   * Make a simple test call with a demo TwiML
   * @param {string} to - Destination phone number
   */
  async makeTestCall(to) {
    return this.makeCall(to, 'http://demo.twilio.com/docs/voice.xml');
  }
}

module.exports = new TwilioService();
