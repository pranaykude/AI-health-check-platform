const mongoose = require('mongoose');

const supportMemberSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Please enter a valid email address',
      },
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: {
        values: ['support', 'senior_support', 'technical_support', 'operations', 'manager'],
        message: 'Role must be support, senior_support, technical_support, operations, or manager',
      },
      default: 'support',
    },
    department: {
      type: String,
      trim: true,
      default: '',
    },
    avatar: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: ['online', 'offline', 'busy'],
        message: 'Status must be online, offline, or busy',
      },
      default: 'offline',
    },
    assignedClients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
      },
    ],
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
    designation: {
      type: String,
      trim: true,
      default: '',
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexing for faster queries
supportMemberSchema.index({ role: 1 });
supportMemberSchema.index({ status: 1 });

const SupportMember = mongoose.model('SupportMember', supportMemberSchema);

module.exports = SupportMember;
