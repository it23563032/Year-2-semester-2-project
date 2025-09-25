const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const serviceRequestSchema = new Schema({
  requestId: {
    type: String,
    required: true,
    unique: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VerifiedClient',
    required: true
  },
  clientName: {
    type: String,
    required: true
  },
  clientEmail: {
    type: String,
    required: true
  },
  servicePackage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServicePackage',
    required: true
  },
  packageName: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'LKR'
  },
  paymentTransaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentTransaction',
    required: true
  },
  status: {
    type: String,
    enum: ['processing', 'approved', 'rejected', 'active', 'expired'],
    default: 'processing'
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  approvedDate: {
    type: Date
  },
  rejectedDate: {
    type: Date
  },
  expiryDate: {
    type: Date
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserModel'
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserModel'
  },
  approvalNotes: {
    type: String
  },
  rejectionReason: {
    type: String
  },
  serviceFeatures: [{
    name: String,
    description: String,
    isActive: Boolean
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Generate unique request ID
serviceRequestSchema.pre('save', function(next) {
  if (!this.requestId) {
    this.requestId = 'SRV-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  }
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
serviceRequestSchema.index({ client: 1, status: 1 });
serviceRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("ServiceRequest", serviceRequestSchema);
