const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  supportMemberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupportMember',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['new_issue', 'escalation', 'assigned_client', 'new_message', 'ai_alert', 'general'],
    default: 'general'
  },
  clientReference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    index: true
  },
  read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', NotificationSchema);
