const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcryptjs");

const unverifiedClientSchema = new Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  nic: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  phoneNumber: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  nicImage: {
    filename: {
      type: String,
      required: false
    },
    originalName: {
      type: String,
      required: false
    },
    filePath: {
      type: String,
      required: false
    },
    uploadDate: {
      type: Date,
      default: Date.now
    }
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'rejected'],
    default: 'pending'
  },
  rejectionReason: {
    type: String
  },
  submissionDate: {
    type: Date,
    default: Date.now
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  reviewDate: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
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

// Pre-save middleware for hashing password
unverifiedClientSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.updatedAt = Date.now();
  next();
});

// Method to check password
unverifiedClientSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

module.exports = mongoose.model("UnverifiedClient", unverifiedClientSchema);
