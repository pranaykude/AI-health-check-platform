const { DeepgramClient } = require("@deepgram/sdk");
const axios = require("axios");
const logger = require("../utils/logger");

/**
 * Voice Service to handle Speech-to-Text (Deepgram) and Text-to-Speech (ElevenLabs)
 */
class VoiceService {
  constructor() {
    this.deepgram = new DeepgramClient(process.env.DEEPGRAM_API_KEY);
    this.elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
  }

  /**
   * Transcribe audio buffer using Deepgram
   * @param {Buffer} audioBuffer 
   * @param {string} language - 'en' or 'hi'
   * @returns {Promise<string>}
   */
  async transcribe(audioBuffer, language = 'en') {
    try {
      if (!audioBuffer) {
        throw new Error("No audio buffer provided");
      }

      const dgLanguage = language === 'hi' ? 'hi' : 'en-US';
      logger.info(`[VOICE SERVICE] Transcribing audio with Deepgram (${dgLanguage})...`);

      const { result, error } = await this.deepgram.listen.prerecord.transcribeFile(
        audioBuffer,
        {
          model: "nova-2",
          smart_format: true,
          language: dgLanguage,
        }
      );

      if (error) throw error;

      const transcript = result.results.channels[0].alternatives[0].transcript;
      
      if (!transcript) {
        logger.warn("[VOICE SERVICE] Empty transcript received");
        return "";
      }

      logger.info(`[VOICE SERVICE] Transcription successful: "${transcript}"`);
      return transcript;
    } catch (error) {
      logger.error("[VOICE SERVICE] STT Error:", error.message);
      return ""; // Return empty string on failure to avoid crashing the pipeline
    }
  }

  /**
   * Convert text to speech using ElevenLabs
   * @param {string} text 
   * @param {string} voiceId 
   * @param {string} language - 'en' or 'hi' (multilingual v2 handles both)
   * @returns {Promise<Buffer|null>}
   */
  async textToSpeech(text, voiceId = "pNInz6obpgDQGcFmaJgB", language = 'en') { // Default voice: Adam (Professional/Mature)
    try {
      if (!text) return null;
      if (!this.elevenLabsApiKey || this.elevenLabsApiKey === 'sk-dummy-elevenlabs') {
        logger.warn("[VOICE SERVICE] ElevenLabs API key missing or dummy. Skipping TTS.");
        return null;
      }

      logger.info(`[VOICE SERVICE] Generating speech with ElevenLabs (${language})...`);

      const response = await axios({
        method: "POST",
        url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        data: {
          text,
          model_id: "eleven_multilingual_v2", 
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true
          },
        },
        headers: {
          Accept: "audio/mpeg",
          "xi-api-key": this.elevenLabsApiKey,
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer",
      });

      logger.info("[VOICE SERVICE] TTS generation successful");
      return Buffer.from(response.data);
    } catch (error) {
      const errorMsg = error.response ? Buffer.from(error.response.data).toString() : error.message;
      logger.error("[VOICE SERVICE] TTS Error:", errorMsg);
      return null;
    }
  }
}

const OpenAI = require("openai");
const { toFile } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "sk-dummy",
});

/**
 * Standalone function to transcribe a remote audio URL using OpenAI Whisper
 * @param {string} recordingUrl 
 * @param {number} retryCount 
 * @returns {Promise<string>}
 */
exports.transcribeAudio = async (recordingUrl, retryCount = 1) => {
  console.log('[TRANSCRIPTION START - DEEPGRAM]');
  try {
    if (!recordingUrl) throw new Error("No recording URL provided");

    // 1. Fetch audio from URL
    const response = await axios({
      method: "GET",
      url: recordingUrl,
      responseType: "arraybuffer"
    });
    const audioBuffer = Buffer.from(response.data);

    // 2. Send to Deepgram (Nova-2)
    if (!process.env.DEEPGRAM_API_KEY || process.env.DEEPGRAM_API_KEY === 'sk-dummy-deepgram') {
        console.log("[AI MOCK] Simulating Deepgram transcription...");
        return "This is a mock transcript of the call. The client discussed service performance and was satisfied overall.";
    }

    const { result, error } = await VoiceServiceInstance.deepgram.listen.prerecord.transcribeFile(
      audioBuffer,
      {
        model: "nova-2",
        smart_format: true,
        punctuate: true,
        paragraphs: true,
      }
    );

    if (error) throw error;

    const transcript = result.results.channels[0].alternatives[0].transcript;
    console.log('[TRANSCRIPTION SUCCESS]');
    return transcript;

  } catch (error) {
    console.error(`[TRANSCRIPTION ERROR] ${error.message}`);
    
    if (retryCount > 0) {
      console.log(`[TRANSCRIPTION RETRY] Attempting one more time...`);
      return exports.transcribeAudio(recordingUrl, retryCount - 1);
    }

    return "Transcription failed";
  }
};

const VoiceServiceInstance = new VoiceService();

// Standalone wrapper for easier controller imports
const textToSpeech = async (text, voiceId, language) => {
  return await VoiceServiceInstance.textToSpeech(text, voiceId, language);
};

module.exports = {
  voiceService: VoiceServiceInstance,
  textToSpeech,
  transcribeAudio: exports.transcribeAudio
};
