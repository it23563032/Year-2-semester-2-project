const mongoose = require('mongoose');

const adjournmentRequestSchema = new mongoose.Schema({
  case: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    required: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lawyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VerifiedLawyer',
    required: false
  },
  originalHearingDate: {
    type: Date,
    required: true
  },
  originalHearingTime: {
    startTime: String,
    endTime: String
  },
  preferredDate: {
    type: Date,
    required: true
  },
  preferredTime: {
    startTime: String,
    endTime: String
  },
  reason: {
    type: String,
    required: true,
    maxlength: 500
  },
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  newHearingDate: {
    type: Date,
    required: false
  },
  newHearingTime: {
    startTime: String,
    endTime: String
  },
  schedulerNotes: {
    type: String,
    maxlength: 500,
    required: false
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date,
    required: false
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
adjournmentRequestSchema.index({ client: 1, status: 1 });
adjournmentRequestSchema.index({ status: 1, submittedAt: -1 });

// Ensure only one pending request per case
adjournmentRequestSchema.index({ case: 1, status: 1 }, { 
  unique: true, 
  partialFilterExpression: { status: 'pending' } 
});

// Virtual for formatted dates
adjournmentRequestSchema.virtual('formattedOriginalDate').get(function() {
  return this.originalHearingDate ? this.originalHearingDate.toLocaleDateString('en-LK') : '';
});

adjournmentRequestSchema.virtual('formattedPreferredDate').get(function() {
  return this.preferredDate ? this.preferredDate.toLocaleDateString('en-LK') : '';
});

adjournmentRequestSchema.virtual('formattedNewDate').get(function() {
  return this.newHearingDate ? this.newHearingDate.toLocaleDateString('en-LK') : '';
});

// Method to check if request is recent (within last 7 days)
adjournmentRequestSchema.methods.isRecent = function() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return this.submittedAt > sevenDaysAgo;
};

// Method to get status badge class
adjournmentRequestSchema.methods.getStatusBadgeClass = function() {
  switch(this.status) {
    case 'pending': return 'warning';
    case 'accepted': return 'success';
    case 'rejected': return 'danger';
    default: return 'secondary';
  }
};

const AdjournmentRequest = mongoose.model('AdjournmentRequest', adjournmentRequestSchema);

module.exports = AdjournmentRequest;
