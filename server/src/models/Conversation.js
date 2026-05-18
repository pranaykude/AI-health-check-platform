const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: true
  },
  type: {
    type: String,
    enum: ['direct', 'room'],
    default: 'room'
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupportMember'
  }],
  clientReference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    default: null
  },
  roomTopic: {
    type: String,
    enum: ['general', 'client-api-issues', 'billing-support', 'technical-escalation', 'off-topic'],
    default: 'general'
  },
  lastMessageText: {
    type: String,
    default: ''
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Setup indexes
ConversationSchema.index({ clientReference: 1 });
ConversationSchema.index({ participants: 1 });

module.exports = mongoose.model('Conversation', ConversationSchema);
