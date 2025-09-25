const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const checklistSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserModel',
    required: true
  },
  case: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CaseModel',
    required: true
  },
  checklistItems: {
    type: Map,
    of: Boolean,
    default: {}
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create compound index to ensure one checklist per user per case
checklistSchema.index({ user: 1, case: 1 }, { unique: true });

module.exports = mongoose.model('Checklist', checklistSchema);
