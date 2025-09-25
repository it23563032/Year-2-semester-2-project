const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const individualServiceRequestSchema = new Schema({
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
  individualService: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IndividualService',
    required: true
  },
  serviceName: {
    type: String,
    required: true
  },
  serviceCategory: {
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
    enum: ['processing', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled'],
    default: 'processing'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
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
  completedDate: {
    type: Date
  },
  assignedLawyer: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'lawyerType'
  },
  lawyerType: {
    type: String,
    enum: ['VerifiedLawyer', 'UserModel'],
    default: 'VerifiedLawyer'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  approvalNotes: {
    type: String
  },
  rejectionReason: {
    type: String
  },
  clientRequirements: {
    type: String // What the client provided/specified
  },
  deliveryNotes: {
    type: String // Notes about delivery/completion
  },
  attachments: [{
    filename: String,
    originalName: String,
    filePath: String,
    uploadDate: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: String,
      enum: ['client', 'lawyer', 'admin'],
      default: 'client'
    }
  }],
  deliverables: [{
    filename: String,
    originalName: String,
    filePath: String,
    deliveryDate: {
      type: Date,
      default: Date.now
    },
    deliveredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VerifiedLawyer'
    }
  }],
  estimatedCompletion: {
    type: Date
  },
  actualCompletion: {
    type: Date
  },
  clientRating: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String,
    ratedAt: Date
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

// Generate unique request ID
individualServiceRequestSchema.pre('save', function(next) {
  if (!this.requestId) {
    this.requestId = 'ISR-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  }
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
individualServiceRequestSchema.index({ client: 1, status: 1 });
individualServiceRequestSchema.index({ status: 1, createdAt: -1 });
individualServiceRequestSchema.index({ assignedLawyer: 1, status: 1 });

module.exports = mongoose.model("IndividualServiceRequest", individualServiceRequestSchema);
