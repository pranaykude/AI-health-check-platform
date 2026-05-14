const { voiceService, textToSpeech } = require("../services/voiceService");
const aiService = require("../services/aiService");
const aiConversationService = require("../services/aiConversationService");
const Client = require("../models/Client");
const Call = require("../models/Call");
const { sendSuccess, sendError } = require("../utils/response");
const logger = require("../utils/logger");
const VoiceResponse = require("twilio").twiml.VoiceResponse;
const telephonyService = require("../services/telephonyService");
const { v4: uuidv4 } = require('uuid');

// In-memory cache for temporary audio buffers (cleared on restart)
const audioCache = new Map();

// In-memory store for call conversation history
const conversationStore = new Map();

/**
 * Controller to handle incoming voice interactions from Twilio
 */

/**
 * Main entry point for processing voice input during a call
 * POST /api/calls/voice/process
 */
exports.handleIncomingVoice = async (req, res) => {
  console.log("\n[TEL-DEBUG] --- TWILIO VOICE HIT (INITIAL GREETING) ---");
  console.log("[TEL-DEBUG] URL Query:", req.query);
  
  try {
    const { clientId, callId } = req.query;
    
    if (!clientId || !callId) {
      console.error("[TEL-DEBUG] ERROR: Missing clientId or callId in URL params");
      const twiml = new VoiceResponse();
      twiml.say("System configuration error. Please check the webhook URL.");
      twiml.hangup();
      res.type("text/xml");
      return res.send(twiml.toString());
    }

    const client = await Client.findById(clientId);
    const language = client?.preferredLanguage || 'en';
    const twilioLanguage = language === 'hi' ? 'hi-IN' : 'en-US';

    console.log(`[TEL-DEBUG] Client: ${client?.name || "Unknown"} | Language: ${language}`);
    
    // Start Recording (Passive)
    const callSid = req.body.CallSid;
    if (callSid) {
      telephonyService.startRecording(callSid).catch(err => 
        console.error(`[TEL-DEBUG] Recording Error: ${err.message}`)
      );
    }

    const twiml = new VoiceResponse();
    
    // --- STEP 6: GATHER FLOW ---
    const gather = twiml.gather({
      input: "speech dtmf",
      numDigits: 1,
      action: `/api/v1/calls/process?clientId=${clientId}&callId=${callId}`,
      method: "POST",
      speechTimeout: "auto"
    });

    const greeting = language === 'hi' 
      ? 'नमस्ते, मैं ऑराई रोबोटिक्स से एलेक्स बोल रहा हूँ। हमारी सेवा के साथ आपका अनुभव कैसा है?' 
      : 'Hello, this is Alex from ORAI Robotics. How has your experience been with our service so far?';
    
    console.log("[TEL-DEBUG] Action URL:", `/api/v1/calls/process?clientId=${clientId}&callId=${callId}`);
    gather.say({ language: twilioLanguage }, greeting);

    // Fallback for silence
    twiml.say({ language: twilioLanguage }, language === 'hi' ? "क्षमा करें, मुझे आपकी आवाज़ नहीं आई।" : "I'm sorry, I didn't hear you.");
    twiml.redirect({ method: 'POST' }, `/api/v1/calls/voice?clientId=${clientId}&callId=${callId}`);

    console.log("[TEL-DEBUG] TwiML Handshake Successful");
    res.type("text/xml");
    return res.send(twiml.toString());

  } catch (error) {
    console.error("[TEL-DEBUG] CRITICAL ROUTE ERROR:", error);
    const twiml = new VoiceResponse();
    twiml.say("Technical difficulties. Reconnecting soon.");
    res.type("text/xml");
    return res.send(twiml.toString());
  }
};


/**
 * Handle speech processing for Twilio voice calls
 * POST /twilio/process-speech
 */
exports.processSpeech = async (req, res) => {
  try {
    const userSpeech = req.body.SpeechResult || (req.body.Digits ? `[Keypad: ${req.body.Digits}]` : null);
    console.log(`[USER INPUT RECEIVED]: ${userSpeech || "NONE"}`);

    const { clientId, callId } = req.query;
    const callSid = req.body.CallSid || callId;
    
    // Fetch client
    let client = null;
    if (clientId) {
      client = await Client.findById(clientId);
    } else if (req.body.From) {
      client = await Client.findOne({ phone: req.body.From });
    }

    // --- SESSION MANAGEMENT ---
    const session = conversationStore.get(callSid) || { history: [], turn: 0 };
    
    // Handle empty speech
    if (!userSpeech || userSpeech.trim() === "") {
      const language = client?.preferredLanguage || 'en';
      const twilioLanguage = language === 'hi' ? 'hi-IN' : 'en-US';
      
      const silenceCount = (session.silenceCount || 0) + 1;
      session.silenceCount = silenceCount;
      conversationStore.set(callSid, session);

      const twiml = new VoiceResponse();
      
      if (silenceCount >= 2) {
        const closingMsg = language === 'hi' 
          ? "मुझे आपकी आवाज़ नहीं आ रही है। मैं बाद में फिर से कोशिश करूँगा। अलविदा!" 
          : "I'm having trouble hearing you. I'll try calling back later. Goodbye!";
        twiml.say({ language: twilioLanguage }, closingMsg);
        twiml.hangup();
        conversationStore.delete(callSid);
      } else {
        const rePrompt = language === 'hi' 
          ? "माफ़ कीजिये, मुझे सुनाई नहीं दिया। क्या आप फिर से कह सकते हैं?" 
          : "Sorry, I didn't quite catch that. Could you say that again?";
        
        twiml.gather({
          input: "speech",
          language: twilioLanguage,
          action: `/api/v1/calls/process?clientId=${client._id}&callId=${callId}`,
          method: "POST",
          speechTimeout: "auto"
        }).say({ language: twilioLanguage }, rePrompt);
      }
      
      res.type("text/xml");
      return res.send(twiml.toString());
    }

    // Reset silence count on successful speech
    session.silenceCount = 0;

    // --- TURN TRACKING ---
    session.turn += 1;
    const turnCount = session.turn;
    console.log(`[TURN COUNT]: ${turnCount}`);
    
    // Save turn count immediately to prevent race conditions
    conversationStore.set(callSid, session);

    // --- INTENT DETECTION ---
    const lowerSpeech = userSpeech.toLowerCase();
    const exitKeywords = ['no', 'nothing', 'all good', 'bye', 'thank you', 'thanks', 'नहीं', 'कुछ नहीं', 'बाय', 'अलविदा', 'धन्यवाद', 'शुक्रिया'];
    const shouldEndCall = exitKeywords.some(keyword => lowerSpeech.includes(keyword));

    if (shouldEndCall) {
      console.log("[CALL ENDED BY USER INTENT]");
      const language = client?.preferredLanguage || 'en';
      const twilioLanguage = language === 'hi' ? 'hi-IN' : 'en-US';
      
      const twiml = new VoiceResponse();
      twiml.say({ language: twilioLanguage }, language === 'hi' ? "आपकी प्रतिक्रिया के लिए धन्यवाद। आपका दिन शुभ हो!" : "Thank you for your feedback. Have a great day!");
      twiml.hangup();
      
      conversationStore.delete(callSid);
      console.log("[MEMORY CLEARED]");
      res.type("text/xml");
      return res.send(twiml.toString());
    }

    // --- TURN LIMIT (Configurable) ---
    const MAX_TURNS = parseInt(process.env.MAX_CALL_TURNS) || 8;
    if (turnCount >= MAX_TURNS) {
      console.log(`[LIMIT REACHED] Turn: ${turnCount}`);
      const language = client?.preferredLanguage || 'en';
      const twilioLanguage = language === 'hi' ? 'hi-IN' : 'en-US';

      const twiml = new VoiceResponse();
      const closingMsg = language === 'hi' 
        ? "समय देने के लिए धन्यवाद। हम आपसे जल्द ही फिर से संपर्क करेंगे। अलविदा!" 
        : "Thank you for your time. We will get back to you soon. Goodbye!";
      
      twiml.say({ language: twilioLanguage }, closingMsg);
      twiml.hangup();
      
      conversationStore.delete(callSid);
      return res.type("text/xml").send(twiml.toString());
    }

    if (!client) {
      logger.error("[VOICE CONTROLLER] Client not found for speech processing");
      const twiml = new VoiceResponse();
      twiml.say("I'm sorry, I couldn't find your record. Goodbye.");
      twiml.hangup();
      return res.type("text/xml").send(twiml.toString());
    }

    const language = client.preferredLanguage || 'en';
    const twilioLanguage = language === 'hi' ? 'hi-IN' : 'en-US';
    console.log(`[LANGUAGE MODE]: ${language}`);

    // --- MEMORY MANAGEMENT ---
    
    // Save initial system message to DB if it's the first turn and we haven't saved it yet
    if (session.turn === 1 && session.history.length === 1) {
      await Call.findByIdAndUpdate(callId, {
        $push: { messages: { role: 'assistant', content: session.history[0].content, timestamp: new Date() } }
      });
      console.log("[INITIAL GREETING PERSISTED]");
    }

    session.history.push({ role: "user", content: userSpeech });
    
    // Save User Speech to DB immediately
    await Call.findByIdAndUpdate(callId, {
      $push: { messages: { role: 'user', content: userSpeech, timestamp: new Date() } }
    });
    console.log("[USER SPEECH PERSISTED]");
    
    // Limit AI context to last 6 messages
    let aiContext = session.history;
    if (aiContext.length > 6) {
      aiContext = aiContext.slice(-6);
    }
    console.log(`[MEMORY LENGTH]: ${aiContext.length}`);

    // Pass to AI service
    let aiReply;
    try {
      aiReply = await aiConversationService.getSmartResponse({
        clientId: client._id,
        userText: userSpeech,
        history: aiContext
      });
      
      if (!aiReply || aiReply.trim() === "") {
        throw new Error("Empty AI response");
      }

      console.log(`[AI RESPONSE GENERATED]: ${aiReply}`);
      
      // Update session history
      session.history.push({ role: "assistant", content: aiReply });
      
      // --- STRUCTURED PERSISTENCE ---
      await Call.findByIdAndUpdate(callId, {
        $push: { messages: { role: 'assistant', content: aiReply, timestamp: new Date() } },
        // Also update the legacy transcript field for backward compatibility
        transcript: session.history.map(msg => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`).join("\n")
      });
      console.log("[AI REPLY PERSISTED]");

      // Trim session history too to prevent infinite growth
      if (session.history.length > 10) {
        session.history = session.history.slice(-10);
      }
      conversationStore.set(callSid, session);
      console.log("[MEMORY UPDATED]");

    } catch (aiError) {
      logger.error("[VOICE CONTROLLER] AI Service Error:", aiError.message);
      const twiml = new VoiceResponse();
      twiml.say({ language: twilioLanguage }, language === 'hi' ? "क्षमा करें, मुझे समझने में परेशानी हो रही है। कृपया पुनः प्रयास करें।" : "Sorry, I am having trouble understanding. Please try again.");
      twiml.gather({
        input: "speech",
        language: twilioLanguage,
        action: `/api/v1/calls/process?clientId=${client._id}&callId=${callId}`,
        method: "POST",
        speechTimeout: "auto"
      }).say({ language: twilioLanguage }, language === 'hi' ? 'नमस्ते, हमारी सेवा के साथ आपका अनुभव कैसा है?' : 'Hello, how is your experience with our service?');
      
      return res.type("text/xml").send(twiml.toString());
    }

    // --- GRACEFUL ENDING DETECTION ---
    const lowerReply = aiReply.toLowerCase();
    const isClosing = lowerReply.includes("goodbye") || 
                      lowerReply.includes("have a great day") || 
                      lowerReply.includes("अलविदा") || 
                      lowerReply.includes("शुभ दिन");

    // --- TTS GENERATION (ELEVENLABS) ---
    let audioUrl = null;
    try {
      const audioBuffer = await textToSpeech(aiReply, undefined, language);
      if (audioBuffer) {
        const audioId = uuidv4();
        audioCache.set(audioId, audioBuffer);
        audioUrl = `${process.env.PUBLIC_URL}/api/v1/calls/audio/${audioId}`;
        
        // Cleanup cache after 5 minutes
        setTimeout(() => audioCache.delete(audioId), 5 * 60 * 1000);
        console.log(`[TTS READY]: ${audioUrl}`);
      }
    } catch (ttsError) {
      logger.error("[VOICE CONTROLLER] ElevenLabs TTS Failed:", ttsError.message);
    }

    const twiml = new VoiceResponse();
    
    if (isClosing) {
      console.log("[AI INITIATED CLOSING]");
      if (audioUrl) {
        twiml.play(audioUrl);
      } else {
        twiml.say({ language: twilioLanguage }, aiReply);
      }
      twiml.hangup();
      conversationStore.delete(callSid);
    } else {
      const gather = twiml.gather({
        input: "speech",
        language: twilioLanguage,
        action: `/api/v1/calls/process?clientId=${client._id}&callId=${callId}`,
        method: "POST",
        speechTimeout: "auto"
      });

      if (audioUrl) {
        gather.play(audioUrl);
      } else {
        gather.say({ language: twilioLanguage }, aiReply);
      }
    }

    const twimlResponse = twiml.toString();
    console.log("[TWIML RESPONSE]", twimlResponse);
    res.type("text/xml");
    return res.send(twimlResponse);

  } catch (error) {
    logger.error("[VOICE CONTROLLER] Process Speech Error:", error);
    const twiml = new VoiceResponse();
    twiml.say("An error occurred during processing. Please try again.");
    return res.type("text/xml").send(twiml.toString());
  }
};

/**
 * Serve temporary audio buffers to Twilio
 * GET /api/calls/audio/:id
 */
exports.serveAudio = async (req, res) => {
  const { id } = req.params;
  const buffer = audioCache.get(id);

  if (!buffer) {
    return res.status(404).send("Audio not found or expired");
  }

  res.set("Content-Type", "audio/mpeg");
  return res.send(buffer);
};

/**
 * Clear conversation history for a specific call
 */
exports.clearConversation = (callSid) => {
  console.log(`[CLEANUP ATTEMPT] SID: ${callSid}`);
  if (conversationStore.has(callSid)) {
    conversationStore.delete(callSid);
    console.log(`[MEMORY CLEARED] | SID: ${callSid}`);
  } else {
    console.log(`[CLEANUP SKIPPED] SID not found: ${callSid}`);
  }
};
