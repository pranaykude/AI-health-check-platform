const mongoose = require('mongoose');

const callSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client reference is required'],
      index: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
    },
    provider: {
      type: String,
      enum: ['twilio'],
      default: 'twilio',
    },
    providerCallId: {
      type: String,
      index: true,
      sparse: true,
      default: null,
    },
    jobId: {
      type: String,
      index: true,
      sparse: true,
    },
    status: {
      type: String,
      enum: ['queued', 'processing', 'calling', 'initiated', 'ringing', 'in-progress', 'completed', 'failed', 'recorded'],
      default: 'queued',
      index: true,
    },
    scheduledAt: {
      type: Date,
      default: null,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number,
      default: 0,
    },
    lastError: {
      type: String,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    response: {
      type: String,
      default: null,
    },
    summary: {
      type: String,
      default: '',
    },
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      default: 'neutral',
    },
    issues: {
      type: [String],
      default: [],
    },
    featureRequests: {
      type: [String],
      default: [],
    },
    languageUsed: {
      type: String,
      enum: ['en', 'hi'],
      default: 'en',
    },
    recordingSid: {
      type: String,
      default: null
    },
    recordingUrl: {
      type: String,
      default: null
    },
    transcript: {
      type: String,
      default: ""
    },
    messages: [
      {
        role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
      }
    ],
    actionItems: {
      type: [String],
      default: []
    },
    satisfactionScore: {
      type: Number,
      min: 1,
      max: 10,
      default: 5
    },
    businessImpact: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    }
  },
  {
    timestamps: true,
  }
);

// Compound index for idempotency checks
callSchema.index({ clientId: 1, status: 1 });

const Call = mongoose.model('Call', callSchema);

module.exports = Call;
