const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const courtFilingSchema = new Schema({
  case: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CaseModel',
    required: true
  },
  lawyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserModel',
    required: true
  },
  court: {
    name: String,
    address: String,
    district: String
  },
  filingType: {
    type: String
  },
  documents: [{
    name: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  filingFee: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'confirmed', 'rejected', 'filed', 'scheduled', 'hearing_completed'],
    default: 'draft'
  },
  submittedAt: {
    type: Date
  },
  confirmedAt: {
    type: Date
  },
  filedAt: {
    type: Date
  },
  courtReference: {
    type: String
  },
  hearingDate: {
    type: Date
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

courtFilingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("CourtFiling", courtFilingSchema);