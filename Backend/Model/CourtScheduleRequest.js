const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const courtScheduleRequestSchema = new Schema({
  case: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CaseModel',
    required: true
  },
  courtFiling: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourtFiling',
    required: true
  },
  requestType: {
    type: String,
    enum: ['normal_hearing', 'adjournment'],
    default: 'normal_hearing'
  },
  district: {
    type: String,
    required: true,
    enum: [
      'Kandy', 'Colombo', 'Jaffna', 'Anuradhapura', 'Nuwara Eliya',
      'Galle', 'Matara', 'Matale', 'Hambantota', 'Ratnapura', 'Kegalle',
      'Kurunegala', 'Puttalam', 'Chilaw', 'Gampaha', 'Kalutara',
      'Monaragala', 'Badulla', 'Batticaloa', 'Ampara', 'Trincomalee',
      'Vavuniya', 'Mannar', 'Kilinochchi', 'Mullaitivu', 'Polonnaruwa'
    ]
  },
  courtroom: {
    type: String,
    default: 'Main Court'
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  isScheduled: {
    type: Boolean,
    default: false
  },
  scheduledDate: {
    type: Date
  },
  scheduledTime: {
    startTime: String, // "09:00"
    endTime: String    // "10:00"
  },
  scheduledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserModel'
  },
  schedulingNotes: {
    type: String
  },
  // Case details for quick access
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
  filedDate: {
    type: Date,
    required: true
  },
  estimatedDuration: {
    type: Number, // in minutes
    default: 60
  },
  requestMessage: {
    type: String,
    default: 'Court hearing scheduling requested'
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
courtScheduleRequestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
courtScheduleRequestSchema.index({ district: 1, isScheduled: 1 });
courtScheduleRequestSchema.index({ scheduledDate: 1 });
courtScheduleRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model("CourtScheduleRequest", courtScheduleRequestSchema);
