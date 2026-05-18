const mongoose = require('mongoose');

const InternalNoteSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
    index: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupportMember',
    required: true
  },
  note: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['general', 'escalation', 'billing', 'technical'],
    default: 'general'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('InternalNote', InternalNoteSchema);
