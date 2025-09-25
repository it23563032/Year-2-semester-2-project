const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const caseUpdateSchema = new Schema({
  case: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CaseModel",
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UserModel",
    required: true
  },
  updateType: {
    type: String,
    enum: ["description", "relief_sought", "case_value", "incident_date", "defendant_info", "documents"],
    required: true
  },
  oldValue: {
    type: Schema.Types.Mixed
  },
  newValue: {
    type: Schema.Types.Mixed
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UserModel"
  },
  reviewNotes: {
    type: String
  },
  reviewedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("CaseUpdate", caseUpdateSchema);
