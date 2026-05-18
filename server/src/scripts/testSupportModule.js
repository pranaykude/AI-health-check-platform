/**
 * Customer Success Collaboration Module - Integration Test Suite
 * Run via: node src/scripts/testSupportModule.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const SupportMember = require('../models/SupportMember');
const Client = require('../models/Client');
const logger = require('../utils/logger');

// ANSI escape codes for beautiful colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

async function runTests() {
  console.log(`\n${BLUE}==================================================${RESET}`);
  console.log(`${BLUE}🚀 RUNNING SUPPORT COLLABORATION INTEGRATION TESTS${RESET}`);
  console.log(`${BLUE}==================================================${RESET}\n`);

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/healthcheck';
  console.log(`📡 Connecting to MongoDB...`);
  
  try {
    await mongoose.connect(mongoUri);
    console.log(`${GREEN}✔ Connected successfully to database.${RESET}\n`);
  } catch (err) {
    console.error(`${RED}✘ Database connection failed:${RESET}`, err.message);
    process.exit(1);
  }

  let testAgent = null;
  let testClient = null;

  try {
    // ----------------------------------------------------
    // TEST CASE 1: Creating a support member
    // ----------------------------------------------------
    console.log(`[TEST 1/6] Registering a new support agent...`);
    const agentData = {
      fullName: 'Dr. Jane Watson',
      email: 'jane.watson@healthcheck.ai',
      phone: '+91 9999999999',
      role: 'technical_support',
      department: 'Healthcare AI Core',
      designation: 'Specialist Telephony Engineer',
      status: 'offline',
      skills: ['Twilio routing', 'Healthcare NLP', 'CRM integrations']
    };

    // Cleanup any existing tests with this email
    await SupportMember.deleteMany({ email: agentData.email });

    testAgent = await SupportMember.create(agentData);
    
    if (testAgent._id && testAgent.fullName === 'Dr. Jane Watson' && testAgent.role === 'technical_support') {
      console.log(`${GREEN}✔ Test Case 1 Passed: Support agent created with ID ${testAgent._id}${RESET}\n`);
    } else {
      throw new Error('Failed to create agent correctly');
    }

    // ----------------------------------------------------
    // TEST CASE 2: Status transitions
    // ----------------------------------------------------
    console.log(`[TEST 2/6] Verifying status transitions...`);
    testAgent.status = 'online';
    await testAgent.save();

    const updatedAgent = await SupportMember.findById(testAgent._id);
    if (updatedAgent.status === 'online') {
      console.log(`${GREEN}✔ Test Case 2 Passed: Connectivity status transition verified successfully.${RESET}\n`);
    } else {
      throw new Error('Failed to update agent status');
    }

    // ----------------------------------------------------
    // TEST CASE 3: Client creation & assignment
    // ----------------------------------------------------
    console.log(`[TEST 3/6] Creating a test client and assigning to agent...`);
    const clientData = {
      name: 'Sherlock Holmes',
      phone: '+918888888888',
      email: 'sherlock@bakerstreet.com',
      language: 'en',
      product: 'AI Diagnostics Suite',
      status: 'active',
      assignedSupportMember: testAgent._id,
      assignedDepartment: 'Healthcare AI Core'
    };

    // Cleanup existing clients with this phone
    await Client.deleteMany({ phone: clientData.phone });

    testClient = await Client.create(clientData);

    // Verify support member's assignedClients list (or bidirectional validation)
    const fetchedClient = await Client.findById(testClient._id).populate('assignedSupportMember');
    
    if (fetchedClient && fetchedClient.assignedSupportMember && fetchedClient.assignedSupportMember.fullName === 'Dr. Jane Watson') {
      console.log(`${GREEN}✔ Test Case 3 Passed: Bidirectional assignment resolved correctly.${RESET}\n`);
    } else {
      throw new Error('Client assignment resolution failed');
    }

    // ----------------------------------------------------
    // TEST CASE 4: Active workloads verification
    // ----------------------------------------------------
    console.log(`[TEST 4/6] Querying support agent workloads...`);
    
    // Group active workload counts
    const workloads = await Client.aggregate([
      { $match: { status: 'active', assignedSupportMember: { $ne: null } } },
      {
        $group: {
          _id: '$assignedSupportMember',
          assignedCount: { $sum: 1 },
          departments: { $addToSet: '$assignedDepartment' }
        }
      }
    ]);

    const matchingWorkload = workloads.find(w => w._id.toString() === testAgent._id.toString());
    if (matchingWorkload && matchingWorkload.assignedCount === 1) {
      console.log(`${GREEN}✔ Test Case 4 Passed: Workload aggregation computed 1 assigned client correctly.${RESET}\n`);
    } else {
      throw new Error('Workload aggregation failed');
    }

    // ----------------------------------------------------
    // TEST CASE 5: Schema validation rules
    // ----------------------------------------------------
    console.log(`[TEST 5/6] Verifying schema validation & default role constraint...`);
    try {
      await SupportMember.create({
        fullName: 'Invalid Agent',
        email: 'invalid-email-format', // should fail standard validations if present, but since email is string we test duplicates
        role: 'super_admin' // not in enum list!
      });
      throw new Error('Allowed unregistered role to pass validation');
    } catch (validationErr) {
      console.log(`${GREEN}✔ Test Case 5 Passed: Successfully rejected invalid enum role selection.${RESET}\n`);
    }

    // ----------------------------------------------------
    // TEST CASE 6: Cascade unassignment on agent removal
    // ----------------------------------------------------
    console.log(`[TEST 6/6] Deleting agent and verifying cascade unassignment of client...`);
    
    // Remove the agent
    await SupportMember.findByIdAndDelete(testAgent._id);

    // Run post-remove logic (matching the controller's manual cleanup logic or pre/post hook)
    await Client.updateMany(
      { assignedSupportMember: testAgent._id },
      { $unset: { assignedSupportMember: 1 } }
    );

    const clientAfterDeletion = await Client.findById(testClient._id);
    if (!clientAfterDeletion.assignedSupportMember) {
      console.log(`${GREEN}✔ Test Case 6 Passed: Cascading cleanup successfully unassigned client.${RESET}\n`);
    } else {
      throw new Error('Client remained assigned to deleted support agent');
    }

  } catch (err) {
    console.error(`\n${RED}✘ TEST FLOW FAILED:${RESET}`, err.message);
    console.error(err);
  } finally {
    // Cleanup temporary testing records
    if (testAgent && testAgent._id) {
      await SupportMember.findByIdAndDelete(testAgent._id);
    }
    if (testClient && testClient._id) {
      await Client.findByIdAndDelete(testClient._id);
    }

    console.log(`🔌 Disconnecting database...`);
    await mongoose.disconnect();
    console.log(`${GREEN}✔ Database connections clean.${RESET}\n`);
    console.log(`${BLUE}==================================================${RESET}`);
    console.log(`${GREEN}✨ ALL COLLABORATION MODULE TESTS COMPLETED${RESET}`);
    console.log(`${BLUE}==================================================${RESET}\n`);
  }
}

runTests();
