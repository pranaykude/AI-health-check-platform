const OpenAI = require("openai");
const Client = require("../models/Client");
const Call = require("../models/Call");
const logger = require("../utils/logger");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "sk-dummy",
});

/**
 * AI Conversation Service
 * Centralized logic for professional, human-like customer health-check interactions.
 */
class AIConversationService {
  /**
   * Generates a contextual, emotionally intelligent response for a health-check call.
   * @param {Object} params - { clientId, userText, history, callId }
   */
  async getSmartResponse({ clientId, userText, history = [] }) {
    try {
      const client = await Client.findById(clientId);
      if (!client) throw new Error("Client data missing for AI context");

      // 1. Fetch Call History for Deep Awareness
      const lastCall = await Call.findOne({ clientId, status: { $in: ['completed', 'recorded'] } })
        .sort({ createdAt: -1 });
      
      const historySummary = lastCall ? lastCall.summary : "No previous call data.";
      const previousIssues = lastCall && lastCall.issues && lastCall.issues.length > 0 
        ? lastCall.issues.join(", ") 
        : "None reported.";

      // 2. Build Deep Business Context
      const businessContext = this._buildBusinessContext(client, historySummary, previousIssues);

      // 2. Define Persona & System Prompt
      const systemPrompt = this._getSystemPrompt(businessContext, client.preferredLanguage);

      // 3. Prepare Smart History (Last 10 messages for depth)
      const conversationHistory = history.slice(-10);

      // 4. Prepare Messages
      const messages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: userText }
      ];

      // 4. Call AI (OpenAI GPT-4o for high intelligence)
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-dummy') {
        return this._getMockResponse(userText, client);
      }

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o",
        messages,
        temperature: 0.6, // Lower temperature for professional consistency
        max_tokens: 150,   // Keep voice responses concise
      });

      const aiReply = response.choices[0].message.content;
      logger.info(`[AI CONVERSATION] Generated response for ${client.name}`);
      
      return aiReply;
    } catch (error) {
      logger.error(`[AI CONVERSATION ERROR] ${error.message}`);
      return "I'm sorry, I seem to be having a bit of trouble connecting to my system. Could you please repeat that?";
    }
  }

  /**
   * Internal: Build detailed context about purchased products, history, and notes
   */
  _buildBusinessContext(client, lastSummary, issues) {
    const products = client.services && client.services.length > 0
      ? client.services.map(s => `${s.name} (${s.plan} plan)`).join(", ")
      : client.product || "Standard SaaS Suite";

    return `
CUSTOMER PROFILE:
- Name: ${client.name}
- Industry: ${client.industry || "Technology/Services"}
- Products Purchased: ${products}
- Service Status: ${client.status === 'active' ? 'Operational' : 'On-hold'}
- Account Notes: ${client.notes || "None"}

PREVIOUS INTERACTION (LAST CALL):
- Summary: ${lastSummary}
- Issues Encountered: ${issues}
`;
  }

  /**
   * Internal: The Master System Prompt for Customer Success Persona (CRITICAL)
   */
  _getSystemPrompt(context, language) {
    const languageInstruction = language === 'hi' 
      ? "MANDATORY: Respond in natural Hindi. You are a 'Hinglish' expert—understand mixed language but respond in professional Hindi (using 'Aap'). Use English technical terms (API, Dashboard, Server) if natural." 
      : "Respond in professional, natural business English. Sound like a human executive, not a chatbot.";

    return `
YOU ARE: 
Alex, a Senior Customer Success Manager at a top-tier technology services firm. 
You are NOT an AI assistant. You are a real human executive conducting a professional health-check call.

CORE BEHAVIOR RULES:
1. CONCISE & NATURAL: Keep responses between 10-25 words. Short sentences only.
2. NO ROBOTIC CLICHES: NEVER say "I understand," "As an AI," "I'm here to help," or "I apologize for the inconvenience."
3. HUMAN TRANSITIONS: Use phrases like "I see," "Got it," "That makes sense," "Interesting," or just start directly.
4. EMOTIONAL ADAPTATION:
   - If client is FRUSTRATED: Be extremely concise, stop asking open questions, and focus on capturing the specific technical issue. Sound serious.
   - If client is HAPPY: Be warm, professional, and briefly mention future value.
   - If client is BUSY: Get to the point immediately.
5. NO REPETITION: Do not repeat the same acknowledgement every turn.
6. ONE QUESTION RULE: Never ask more than one short question per turn.
7. BUSINESS CONTEXT: You know the client's history. If they mention a recurring problem, acknowledge that "we've seen this before" and it's a priority.

${languageInstruction}

${context}

GOAL OF THIS CALL:
Briefly check if the client is satisfied with their products, identify any technical blockers, and ensure they feel valued. End the call professionally if the client is satisfied or if they express intent to leave.
`;
  }

  /**
   * Internal: Realistic Mock Responses for Development (No API Key)
   */
  _getMockResponse(text, client) {
    const lower = text.toLowerCase();
    const isHindi = client.preferredLanguage === 'hi';

    if (lower.includes("problem") || lower.includes("issue") || lower.includes("खराब")) {
      return isHindi 
        ? "यह सुनकर मुझे खेद है। क्या आप मुझे थोड़ा और बता सकते हैं कि यह समस्या कब से आ रही है?"
        : "I'm sorry to hear you're facing an issue. Could you tell me a bit more about when this started happening?";
    }
    
    if (lower.includes("good") || lower.includes("great") || lower.includes("अच्छा")) {
      return isHindi
        ? "बहुत बढ़िया! यह जानकर खुशी हुई कि सब कुछ ठीक चल रहा है। क्या कोई और चीज़ है जिसमें मैं आपकी मदद कर सकता हूँ?"
        : "That's fantastic to hear! I'm glad the services are adding value. Is there anything else you'd like to share regarding your experience?";
    }

    return isHindi
      ? `नमस्ते ${client.name}, मैं आपकी सेवाओं के बारे में फीडबैक लेने के लिए कॉल कर रहा हूँ। आपका अनुभव कैसा रहा है?`
      : `Hi ${client.name}, I'm calling from the Success Team to see how things are going with your services. How has your experience been so far?`;
  }
}

module.exports = new AIConversationService();
