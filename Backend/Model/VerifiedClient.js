const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcryptjs");

const verifiedClientSchema = new Schema({
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
    required: false,
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
  userType: {
    type: String,
    default: 'verified_client'
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
  cases: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CaseModel'
  }],
  verificationDate: {
    type: Date,
    default: Date.now
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
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
verifiedClientSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  
  // Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
  if (this.password && this.password.match(/^\$2[aby]\$/)) {
    console.log('Password already hashed, skipping hash process');
    this.updatedAt = Date.now();
    return next();
  }
  
  // Hash the password if it's not already hashed
  this.password = await bcrypt.hash(this.password, 12);
  this.updatedAt = Date.now();
  next();
});

// Method to check password
verifiedClientSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

module.exports = mongoose.model("VerifiedClient", verifiedClientSchema);