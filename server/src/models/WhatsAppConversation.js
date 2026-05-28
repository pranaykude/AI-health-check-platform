const mongoose = require('mongoose');

const WhatsAppConversationSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
    unique: true
  },
  whatsappNumber: {
    type: String,
    required: true,
    trim: true
  },
  lastMessageText: {
    type: String,
    default: ''
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  unreadCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

WhatsAppConversationSchema.index({ whatsappNumber: 1 });

module.exports = mongoose.model('WhatsAppConversation', WhatsAppConversationSchema);
