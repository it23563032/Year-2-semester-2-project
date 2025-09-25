const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const emailSettingsSchema = new Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true,
    unique: true
  },
  recipientEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  isEnabled: {
    type: Boolean,
    default: true
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'daily'
  },
  sendTime: {
    hour: {
      type: Number,
      min: 0,
      max: 23,
      default: 8
    },
    minute: {
      type: Number,
      min: 0,
      max: 59,
      default: 0
    }
  },
  dayOfWeek: {
    type: Number,
    min: 0,
    max: 6, // 0 = Sunday, 1 = Monday, etc.
    default: null // null means every day for daily frequency
  },
  dayOfMonth: {
    type: Number,
    min: 1,
    max: 31,
    default: 1 // 1st of month for monthly frequency
  },
  timezone: {
    type: String,
    default: 'Asia/Colombo'
  },
  includeUserStats: {
    type: Boolean,
    default: true
  },
  includeCaseActivity: {
    type: Boolean,
    default: true
  },
  includeFinancialMetrics: {
    type: Boolean,
    default: true
  },
  includeSystemEvents: {
    type: Boolean,
    default: true
  },
  includePerformanceMetrics: {
    type: Boolean,
    default: true
  },
  includeStaffActivity: {
    type: Boolean,
    default: true
  },
  emailFormat: {
    type: String,
    enum: ['html', 'text'],
    default: 'html'
  },
  lastSent: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
emailSettingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("EmailSettings", emailSettingsSchema);
