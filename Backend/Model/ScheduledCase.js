const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const scheduledCaseSchema = new Schema({
  scheduleRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourtScheduleRequest',
    required: true
  },
  case: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CaseModel',
    required: true
  },
  district: {
    type: String,
    required: true
  },
  courtroom: {
    type: String,
    required: true
  },
  hearingDate: {
    type: Date,
    required: true
  },
  hearingTime: {
    startTime: {
      type: String,
      required: true // "09:00"
    },
    endTime: {
      type: String,
      required: true // "10:00"
    }
  },
  // Case details
  caseNumber: {
    type: String,
    required: true
  },
  caseType: {
    type: String,
    required: true
  },
  plaintiffName: {
    type: String,
    required: true
  },
  defendantName: {
    type: String,
    required: true
  },
  lawyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserModel',
    required: true
  },
  lawyerName: {
    type: String,
    required: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserModel',
    required: true
  },
  clientName: {
    type: String,
    required: true
  },
  // Scheduling details
  scheduledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserModel',
    required: true
  },
  schedulingNotes: {
    type: String
  },
  estimatedDuration: {
    type: Number, // in minutes
    default: 60
  },
  // Status tracking
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'adjourned', 'cancelled'],
    default: 'scheduled'
  },
  // Notifications
  notificationsSent: {
    lawyer: { type: Boolean, default: false },
    client: { type: Boolean, default: false }
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

// Update timestamp on save
scheduledCaseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for efficient queries
scheduledCaseSchema.index({ district: 1, hearingDate: 1 });
scheduledCaseSchema.index({ hearingDate: 1, 'hearingTime.startTime': 1 });
scheduledCaseSchema.index({ status: 1 });
scheduledCaseSchema.index({ lawyer: 1 });
scheduledCaseSchema.index({ client: 1 });

module.exports = mongoose.model("ScheduledCase", scheduledCaseSchema);
