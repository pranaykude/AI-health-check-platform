const mongoose = require('mongoose');

const scheduledCallSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Client ID is required']
  },
  callType: {
    type: String,
    required: [true, 'Call type is required'],
    enum: ['Health check-in (AI)', 'Follow-up call', 'Appointment reminder', 'Custom']
  },
  scheduledAt: {
    type: Date,
    required: [true, 'Scheduled date and time is required']
  },
  recurrence: {
    type: String,
    enum: ['One-time', 'Daily', 'Weekly', 'Monthly'],
    default: 'One-time'
  },
  note: {
    type: String,
    trim: true,
    maxlength: [1000, 'Note cannot exceed 1000 characters']
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Cancelled', 'Failed'],
    default: 'Pending'
  },
  callSid: {
    type: String
  }
}, {
  timestamps: true
});

// Create index for querying pending calls efficiently
scheduledCallSchema.index({ status: 1, scheduledAt: 1 });

module.exports = mongoose.model('ScheduledCall', scheduledCallSchema);
