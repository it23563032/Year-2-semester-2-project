const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const lawyerAssignmentSchema = new Schema({
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
  assignedBy: {
    type: String,
    enum: ['system', 'client', 'admin'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
    default: 'pending'
  },
  clientMessage: {
    type: String
  },
  lawyerResponse: {
    type: String
  },
  responseDate: {
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

lawyerAssignmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("LawyerAssignment", lawyerAssignmentSchema);