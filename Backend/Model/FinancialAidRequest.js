const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const financialAidRequestSchema = new Schema({
  requestId: {
    type: String,
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
  requestType: {
    type: String,
    enum: ['monthly_package', 'individual_service', 'case_filing'],
    required: true
  },
  // For package requests
  servicePackage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServicePackage'
  },
  // For individual service requests
  individualService: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IndividualService'
  },
  // For case filing aid
  caseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case'
  },
  requestedAmount: {
    type: Number,
    required: true
  },
  originalAmount: {
    type: Number,
    required: true
  },
  discountPercentage: {
    type: Number,
    min: 0,
    max: 100
  },
  aidType: {
    type: String,
    enum: ['discount', 'free', 'payment_plan'],
    required: true
  },
  reason: {
    type: String,
    required: true,
    maxlength: 1000
  },
  financialSituation: {
    monthlyIncome: {
      type: Number,
      required: true
    },
    dependents: {
      type: Number,
      default: 0
    },
    employmentStatus: {
      type: String,
      enum: ['employed', 'unemployed', 'student', 'retired', 'self_employed', 'other'],
      required: true
    },
    additionalInfo: String
  },
  supportingDocuments: [{
    filename: String,
    originalName: String,
    filePath: String,
    documentType: {
      type: String,
      enum: ['income_statement', 'bank_statement', 'unemployment_certificate', 'medical_certificate', 'other']
    },
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'requires_more_info'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  reviewDate: Date,
  reviewNotes: String,
  approvalDetails: {
    approvedAmount: Number,
    approvedDiscountPercentage: Number,
    paymentPlan: {
      installments: Number,
      installmentAmount: Number,
      frequency: {
        type: String,
        enum: ['weekly', 'monthly', 'quarterly']
      }
    },
    conditions: [String],
    validUntil: Date
  },
  rejectionReason: String,
  adminResponse: {
    message: String,
    responseDate: {
      type: Date,
      default: Date.now
    },
    requiresDocuments: [String]
  },
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: Date,
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
financialAidRequestSchema.pre('save', function(next) {
  if (!this.requestId) {
    this.requestId = 'FAR-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  }
  
  // Calculate discount percentage if not provided
  if (!this.discountPercentage && this.requestedAmount < this.originalAmount) {
    this.discountPercentage = Math.round(((this.originalAmount - this.requestedAmount) / this.originalAmount) * 100);
  }
  
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
financialAidRequestSchema.index({ client: 1, status: 1 });
financialAidRequestSchema.index({ status: 1, createdAt: -1 });
financialAidRequestSchema.index({ requestType: 1, status: 1 });
financialAidRequestSchema.index({ priority: 1, status: 1 });

module.exports = mongoose.model("FinancialAidRequest", financialAidRequestSchema);
