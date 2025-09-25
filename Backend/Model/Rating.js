const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ratingSchema = new Schema({
  case: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CaseModel',
    required: true
  },
  lawyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VerifiedLawyer',
    required: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VerifiedClient',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  caseNumber: {
    type: String,
    required: true
  },
  clientName: {
    type: String,
    required: true
  },
  lawyerName: {
    type: String,
    required: true
  },
  ratingTimestamp: {
    type: Date,
    default: Date.now
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

// Allow multiple ratings per client per case
// ratingSchema.index({ case: 1, client: 1 }, { unique: true });

// Update the updatedAt field before saving
ratingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Rating", ratingSchema);
