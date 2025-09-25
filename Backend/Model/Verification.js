const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const verificationSchema = new Schema({
  case: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CaseModel',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserModel'
  },
  verificationDate: {
    type: Date
  },
  notes: {
    type: String
  },
  issues: [{
    field: String,
    message: String,
    resolved: {
      type: Boolean,
      default: false
    }
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

verificationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Verification", verificationSchema);