const dotenv = require('dotenv');
dotenv.config(); // MUST BE FIRST

const aiConversationService = require('../src/services/aiConversationService');
const mongoose = require('mongoose');
const path = require('path');

// Mock Client Data
const mockClient = {
  _id: new mongoose.Types.ObjectId(),
  name: "Rahul Sharma",
  product: "AI Chatbot Enterprise",
  services: [{ name: "Chatbot Automation", plan: "Enterprise", status: "active" }],
  preferredLanguage: "en",
  notes: "Client is very focused on latency."
};

async function runScenario(name, inputs, language = 'en') {
  console.log(`\n--- SCENARIO: ${name} (${language.toUpperCase()}) ---`);
  const history = [];
  mockClient.preferredLanguage = language;

  for (const text of inputs) {
    console.log(`[USER]: ${text || "(Silence)"}`);
    
    const response = await aiConversationService.getSmartResponse({
      clientId: mockClient._id,
      userText: text,
      history: [...history]
    });

    console.log(`[AI]: ${response}`);
    
    history.push({ role: "user", content: text });
    history.push({ role: "assistant", content: response });
  }
  console.log(`------------------------------------------`);
}

async function startTests() {
  try {
    const Client = require('../src/models/Client');
    const Call = require('../src/models/Call');
    
    // Simple mock override
    Client.findById = async () => mockClient;
    Call.findOne = () => ({ sort: () => ({ limit: () => null }) });

    // 1. Positive Conversation
    await runScenario("Positive Feedback", [
      "Hello",
      "Yes, the chatbot is working great for us.",
      "No other issues, thanks!"
    ]);

    // 2. Issue Reporting + Follow-up
    await runScenario("Issue Reporting", [
      "Hi",
      "I'm having some trouble with the API latency.",
      "It takes about 8 seconds to get a response sometimes."
    ]);

    // 3. Angry Client (Emotional Intel)
    await runScenario("Angry Client", [
      "Listen, your system crashed yesterday and we lost customers!",
      "I want a refund and a fix immediately."
    ]);

    // 4. Hindi/Hinglish Interaction
    await runScenario("Hinglish/Hindi", [
      "Namaste",
      "Service toh achi hai, par support slow hai.",
      "Ha, response aane me der lagti hai."
    ], 'hi');

    // 5. Silence Handling
    await runScenario("Silence", [
      "",
      "Oh sorry, I was on another line. I like the service."
    ]);

    console.log("\n✅ ALL SCENARIOS COMPLETED SUCCESSFULLY");
    process.exit(0);
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

startTests();
