const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupportMember',
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  attachments: [{
    type: String
  }],
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupportMember'
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Message', MessageSchema);
