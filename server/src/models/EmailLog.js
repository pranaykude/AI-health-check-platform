const mongoose = require('mongoose');

const EmailLogSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupportMember',
    required: true
  },
  recipientEmail: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  body: {
    type: String,
    required: true
  },
  attachments: [{
    type: String
  }],
  deliveryStatus: {
    type: String,
    enum: ['sent', 'delivered', 'failed'],
    default: 'sent'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('EmailLog', EmailLogSchema);
