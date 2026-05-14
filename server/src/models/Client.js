const mongoose = require('mongoose');
const { normalizePhone } = require('../utils/phoneHelper');

const clientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      validate: {
        validator: function (v) {
          // Simple check: must start with + and have 7-15 digits
          return /^\+[1-9]\d{1,14}$/.test(v);
        },
        message: 'Phone number must be in E.164 format (e.g. +919876543210)',
      },
    },
    language: {
      type: String,
      enum: {
        values: ['en', 'hi'],
        message: 'Language must be either "en" (English) or "hi" (Hindi)',
      },
      default: 'en',
    },
    product: {
      type: String,
      trim: true,
      maxlength: [200, 'Product name cannot exceed 200 characters'],
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          if (!v || v === '') return true;
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Please enter a valid email address',
      },
      default: '',
    },
    address: {
      type: String,
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive'],
        message: 'Status must be either "active" or "inactive"',
      },
      default: 'active',
    },
    lastCallAt: {
      type: Date,
      default: null,
    },
    nextCallAt: {
      type: Date,
      default: null,
    },
    preferredLanguage: {
      type: String,
      enum: ['en', 'hi'],
      default: 'en',
    },
    callFrequency: {
      type: String,
      enum: ['monthly', 'custom'],
      default: 'monthly',
    },
    services: [
      {
        name: { type: String },
        plan: { type: String },
        startDate: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ['active', 'inactive', 'paused'],
          default: 'active',
        },
      },
    ],
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to normalize phone number
clientSchema.pre('save', function (next) {
  if (this.isModified('phone')) {
    try {
      this.phone = normalizePhone(this.phone);
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Indexes for performance
clientSchema.index({ status: 1 });
clientSchema.index(
  { name: 'text', phone: 'text', product: 'text' },
  { default_language: 'none', language_override: 'language' }
);

const Client = mongoose.model('Client', clientSchema);

module.exports = Client;
