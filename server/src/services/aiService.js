const OpenAI = require("openai");
const Client = require("../models/Client");
const logger = require("../utils/logger");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "sk-dummy",
});

/**
 * AI Service to handle conversational logic and response generation
 */
class AIService {
  constructor() {
    this.openai = openai;
  }

  /**
   * Build dynamic context for the AI prompt
   * @param {string} clientId 
   */
  async buildClientContext(clientId) {
    const client = await Client.findById(clientId);
    if (!client) return "Context: Client details not available.";

    let formattedServices = "No active services";
    if (client.services && client.services.length > 0) {
      formattedServices = client.services
        .map(s => `- ${s.name} (${s.plan})`)
        .join("\n");
    }

    return `
Client Name: ${client.name}
Services:
${formattedServices}
Preferred Language: ${client.preferredLanguage}
`;
  }

  /**
   * Get conversational AI response (Legacy/Class-based)
   * @param {Object} params - { clientId, userSpeechText, history }
   */
  async getChatResponse({ clientId, userSpeechText, history = [] }) {
    try {
      return await generateAIResponse({ clientId, userText: userSpeechText, history });
    } catch (error) {
      logger.error('[AI SERVICE] Error getting chat response:', error.message);
      throw error;
    }
  }

  /**
   * Process call transcript to generate structured insights
   * @param {string} transcript 
   */
  async generateCallInsights(transcript) {
    return await generateSummary(transcript);
  }
}

const generateSummary = async (transcript) => {
  console.log('[SUMMARY START - GPT-4o]');
  try {
    if (!transcript) throw new Error("No transcript provided");

    if (!openai || process.env.OPENAI_API_KEY === 'sk-dummy' || !process.env.OPENAI_API_KEY) {
      console.log("[AI MOCK] Generating mock summary...");
      return {
        summary: "The client provided feedback on the service. They mentioned general satisfaction but noted some specific areas for improvement.",
        sentiment: "neutral",
        issues: ["General performance"],
        action_items: ["Follow up with client in 2 weeks"]
      };
    }

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a Senior Customer Success Analyst. Analyze the provided call transcript and generate a structured business report.
          
          RETURN ONLY A JSON OBJECT with these fields:
          - summary: A professional 2-3 sentence overview of the conversation.
          - sentiment: One word only (positive, neutral, or negative).
          - issues: A list of specific technical or business problems mentioned by the client.
          - action_items: Clear, actionable steps for the success team to follow up on.
          - satisfaction_score: A number from 1 to 10.
          - business_impact: One word only (high, medium, or low).
          
          Focus on facts and specific details mentioned in the call.`
        },
        {
          role: "user",
          content: `TRANSCRIPT:\n${transcript}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3 // Lower temperature for more analytical consistency
    });

    const result = JSON.parse(response.choices[0].message.content);
    console.log('[SUMMARY GENERATED]');
    return result;

  } catch (error) {
    console.error('[SUMMARY ERROR]', error.message);
    return {
      summary: "Error generating business summary.",
      sentiment: "neutral",
      issues: [],
      action_items: [],
      satisfaction_score: 5,
      business_impact: 'medium'
    };
  }
};

/**
 * Generate AI response based on client context and user input
 * @param {Object} params - { clientId, userText, history }
 */
const generateAIResponse = async ({ clientId, userText, history = [] }) => {
  try {
    const client = await Client.findById(clientId);
    if (!client) {
      throw new Error('Client not found');
    }

    let formattedServices = 'No active services';
    if (client.services && client.services.length > 0) {
      formattedServices = client.services
        .map(s => `- ${s.name} (${s.plan})`)
        .join("\n");
    }

    const context = `
Client Name: ${client.name}
Services:
${formattedServices}
Preferred Language: ${client.preferredLanguage}
`;

    const systemPrompt = `
You are an AI assistant calling a client to collect feedback about their service.

Rules:
- Ask follow-up questions based on user input
- Be conversational, not robotic
- Refer to previous answers in the conversation history
- If user mentions an issue, ask for specific details
- Keep responses short (1–2 sentences)
- End the call politely after you have collected enough information
- No repeated greetings (e.g., don't say "Hello" in every message)
- No generic replies (e.g., avoid just saying "Thank you")

LANGUAGE RULE:
- If Preferred Language is "hi", respond fully in Hindi
- Otherwise respond in English

CONTEXT:
${context}
`;

    console.log("[SMART PROMPT ACTIVE]");

    if (!openai || process.env.OPENAI_API_KEY === 'sk-dummy' || !process.env.OPENAI_API_KEY) {
        console.log("[AI REQUEST SENT]", userText);
        console.log("[AI MOCK] Simulating AI response because no real API key found.");
       
       const isHindi = client.preferredLanguage === 'hi';
       let mockReply = "";
       // Enhanced Mock Logic for Smart Prompt
       const lowerText = userText.toLowerCase();
       if (lowerText.includes('problem') || lowerText.includes('issue') || lowerText.includes('खराब') || lowerText.includes('fail')) {
         mockReply = isHindi 
           ? "मुझे यह सुनकर खेद है। क्या आप बता सकते हैं कि आपको किस तरह की समस्या आ रही है और यह कितनी बार होता है?"
           : "I'm sorry to hear that. Could you please provide more details about the specific issue and how often it fails?";
       } else if (lowerText.includes('slow') || lowerText.includes('delay') || lowerText.includes('धीमा') || lowerText.includes('seconds')) {
         mockReply = isHindi
           ? "धीमी गति के लिए क्षमा करें। क्या आप बता सकते हैं कि यह देरी कब से हो रही है और इसका आपके काम पर क्या प्रभाव पड़ रहा है?"
           : "I apologize for the slowness. Could you tell me when you first noticed this delay and how it impacts your workflow?";
       } else if (userText.toLowerCase().includes('good') || userText.toLowerCase().includes('fine') || userText.toLowerCase().includes('अच्छा')) {
         mockReply = isHindi
           ? "यह जानकर खुशी हुई। क्या हमारी सेवा में कुछ ऐसा है जिसे हम और बेहतर बना सकते हैं?"
           : "Glad to hear that. Is there any particular aspect of our service you think we could improve further?";
       } else if (history.length > 0) {
         mockReply = isHindi
           ? "आपकी पिछली बात के आधार पर, क्या आप हमारे सेवा की गति के बारे में कुछ और बता सकते हैं?"
           : "Based on what you just said, could you tell me more about how the service is performing for you overall?";
       } else {
         mockReply = isHindi
           ? `नमस्ते ${client.name}, मैं आपकी सेवा के बारे में फीडबैक लेने के लिए कॉल कर रहा हूं। आपका अनुभव कैसा है?`
           : `Hi ${client.name}, I'm calling to get your feedback on our service. How has your experience been so far?`;
       }

       console.log("[AI RESPONSE RECEIVED]", mockReply);
       console.log("[AI RESPONSE GENERATED]");
       return mockReply;
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: userText }
    ];

    console.log("[AI REQUEST SENT]", userText);
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages,
      temperature: 0.7
    });

    const aiReply = response.choices[0].message.content;
    console.log("[AI RESPONSE RECEIVED]", aiReply);
    console.log("[AI RESPONSE GENERATED]");
    return aiReply;

  } catch (error) {
    console.error("[AI ERROR]", error.message);
    return "Sorry, something went wrong.";
  }
};

const aiService = new AIService();
aiService.generateAIResponse = generateAIResponse;
aiService.generateSummary = generateSummary;

/**
 * Enhanced AI response generator with full message history
 * @param {Object} params - { client, messages }
 */
aiService.generateResponse = async ({ client, messages = [] }) => {
  console.log(`[CONTEXT SENT TO AI] | Messages: ${messages.length}`);
  
  // Extract user text from the last message if needed for legacy logic or just pass through
  const userText = messages[messages.length - 1]?.content || "";
  const history = messages.slice(0, -1);

  return await generateAIResponse({
    clientId: client._id,
    userText: userText,
    history: history
  });
};

module.exports = aiService;