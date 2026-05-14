const dotenv = require('dotenv');
dotenv.config();

const aiConversationService = require('../src/services/aiConversationService');
const mongoose = require('mongoose');

// Mock Client with deep history
const mockClient = {
  _id: new mongoose.Types.ObjectId(),
  name: "Vikram Malhotra",
  product: "Cloud API & Automation Suite",
  industry: "Logistics",
  notes: "High-value client. Previously complained about dashboard lag.",
  preferredLanguage: "en"
};

async function runScenario(name, turns, language = 'en') {
  console.log(`\n==========================================`);
  console.log(`🚀 STRESS TEST: ${name.toUpperCase()}`);
  console.log(`==========================================`);
  
  const history = [];
  mockClient.preferredLanguage = language;

  for (let i = 0; i < turns.length; i++) {
    const userText = turns[i];
    console.log(`\n[TURN ${i + 1}]`);
    console.log(`[USER]: ${userText}`);
    
    const start = Date.now();
    const response = await aiConversationService.getSmartResponse({
      clientId: mockClient._id,
      userText: userText,
      history: [...history]
    });
    const latency = Date.now() - start;

    console.log(`[ALEX]: ${response}`);
    console.log(`[LATENCY]: ${latency}ms`);
    
    history.push({ role: "user", content: userText });
    history.push({ role: "assistant", content: response });

    // AI Quality Check
    if (response.length > 150) console.warn("⚠️ WARNING: Response might be too long.");
    if (response.toLowerCase().includes("ai assistant")) console.warn("⚠️ WARNING: Robotic phrasing detected.");
  }
}

async function startStressTest() {
  try {
    const Client = require('../src/models/Client');
    const Call = require('../src/models/Call');
    Client.findById = async () => mockClient;
    Call.findOne = () => ({ sort: () => ({ limit: () => null }) });

    // SCENARIO 1: The Frustrated Escalation
    await runScenario("The Angry Escalation", [
      "Hello?",
      "Listen Alex, the dashboard has been lagging for three days. It's affecting our dispatch!",
      "I don't want a generic apology. When will it be fixed? My team is sitting idle.",
      "Fine. Just make sure someone calls me back in an hour. I'm busy now."
    ]);

    // SCENARIO 2: The Hinglish Polyglot
    await runScenario("The Hinglish Polyglot", [
      "Namaste Alex, kaise ho?",
      "Everything is okay, but support team se koi response nahi mil raha.",
      "Actually, ticket raise kiya tha par status 'pending' hi dikha raha hai.",
      "Theek hai, please check karwa lo. Shukriya!"
    ], 'hi');

    // SCENARIO 3: Deep Context Memory (The Marathon)
    await runScenario("The Marathon Memory", [
      "Hey Alex, just checking in.",
      "We've been using the API suite for 6 months now.",
      "By the way, remember the lag issue we discussed last month?",
      "Has that been patched in the latest v2.4 update?",
      "Good. Also, I need to add 5 more users to the plan.",
      "Can you send the pricing for that?",
      "Actually, nevermind. I'll check the dashboard. Thanks for the call."
    ]);

    console.log("\n✅ FINAL STRESS TESTS COMPLETED");
    process.exit(0);
  } catch (error) {
    console.error("Stress test failed:", error);
    process.exit(1);
  }
}

startStressTest();
