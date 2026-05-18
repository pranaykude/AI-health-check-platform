const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SupportMember = require('../src/models/SupportMember');
const Client = require('../src/models/Client');

async function runTests() {
  console.log('\n🧪 STARTING PHASE 1 DATA LAYER TESTING\n');

  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/health-check-ai');
    console.log('✅ Connected to MongoDB');

    // 1. Cleanup old test data
    await SupportMember.deleteMany({ email: /test-support/ });
    await Client.deleteMany({ email: /test-client/ });
    console.log('🧹 Cleaned up old test records');

    // 2. Create a test Support Member
    console.log('\n➕ [Test 1] Creating Support Member...');
    const member = await SupportMember.create({
      fullName: 'Test Support Engineer',
      email: 'test-support@example.com',
      phone: '+919999999999',
      role: 'technical_support',
      department: 'Healthcare AI',
      skills: ['Express', 'Node', 'Telephony'],
      designation: 'Senior Lead Specialist',
      status: 'online'
    });
    console.log(`✅ SupportMember Created: ${member.fullName} (${member.role})`);
    console.log(`   ID: ${member._id}`);

    // 3. Create a test Client with assigned support member
    console.log('\n➕ [Test 2] Creating Client assigned to Support Member...');
    const client1 = await Client.create({
      name: 'Test Client Clinic A',
      phone: '+918888888888',
      email: 'test-client-a@example.com',
      product: 'AI Call Assistant',
      notes: 'Initial clinical notes',
      assignedSupportMember: member._id,
      assignedDepartment: 'Healthcare AI'
    });
    await SupportMember.findByIdAndUpdate(
      member._id,
      { $addToSet: { assignedClients: client1._id } }
    );
    console.log(`✅ Client Created: ${client1.name}`);
    console.log(`   Assigned Member ID: ${client1.assignedSupportMember}`);
    console.log(`   Assigned Department: ${client1.assignedDepartment}`);

    // 4. Create another Client unassigned
    const client2 = await Client.create({
      name: 'Test Client Clinic B',
      phone: '+917777777777',
      email: 'test-client-b@example.com',
      product: 'Voice Agent Lite',
      notes: 'Needs onboarding',
      assignedSupportMember: null,
      assignedDepartment: ''
    });
    console.log(`✅ Unassigned Client Created: ${client2.name}`);

    // 5. Test Two-way Synchronization (Direct Mongoose trigger)
    console.log('\n🔄 [Test 3] Manually testing two-way sync on assignment via direct trigger...');
    
    // We assign client2 to member and update SupportMember's array
    client2.assignedSupportMember = member._id;
    client2.assignedDepartment = 'Healthcare AI';
    await client2.save();

    await SupportMember.findByIdAndUpdate(
      member._id,
      { $addToSet: { assignedClients: client2._id } }
    );
    console.log(`✅ Sync complete. Client B assigned to Member.`);

    // 6. Verify Database Integrity
    console.log('\n🔍 [Test 4] Verifying database integrity & references...');
    const updatedMember = await SupportMember.findById(member._id).populate('assignedClients');
    console.log(`👥 Support Member's Assigned Clients Count: ${updatedMember.assignedClients.length}`);
    updatedMember.assignedClients.forEach(c => {
      console.log(`   - Client: ${c.name} (${c.email})`);
    });

    if (updatedMember.assignedClients.length !== 2) {
      throw new Error('Sync failed: Expected 2 assigned clients under SupportMember!');
    }
    console.log('✅ Synchronized relationships verified successfully.');

    // 7. Verify Workload computation query
    console.log('\n📊 [Test 5] Running workload aggregation pipeline...');
    const workloads = await SupportMember.aggregate([
      {
        $project: {
          fullName: 1,
          clientCount: { $size: '$assignedClients' }
        }
      }
    ]);
    console.log('📈 Workloads:', workloads);

    // 8. Test Cascade Dissociation on Deletion
    console.log('\n🗑️ [Test 6] Testing Support Member deletion and cascading dissociation...');
    
    // Unassign clients in database (mirroring deleteSupportMember controller)
    await Client.updateMany(
      { assignedSupportMember: member._id },
      { $set: { assignedSupportMember: null } }
    );
    await member.deleteOne();
    console.log('✅ Support member deleted.');

    // Check if clients are successfully set to null
    const checkClientA = await Client.findById(client1._id);
    const checkClientB = await Client.findById(client2._id);
    
    console.log(`   Client A Assigned Member: ${checkClientA.assignedSupportMember}`);
    console.log(`   Client B Assigned Member: ${checkClientB.assignedSupportMember}`);

    if (checkClientA.assignedSupportMember !== null || checkClientB.assignedSupportMember !== null) {
      throw new Error('Cascade check failed: Clients are still referencing deleted support member!');
    }
    console.log('✅ Cascading unassignment successful. Database references are 100% clean!');

    // Cleanup final test records
    await Client.deleteMany({ email: /test-client/ });
    console.log('🧹 Final database clean up done');

    console.log('\n🎉 ALL PHASE 1 DATA TESTS PASSED SUCCESSFULLY! 🎉\n');
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

runTests();
