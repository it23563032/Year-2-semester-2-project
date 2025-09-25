const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcryptjs");

const unverifiedLawyerSchema = new Schema({
  lawyerId: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(v) {
        return /^LAW\d+$/.test(v);
      },
      message: "Lawyer ID must start with 'LAW' followed by numbers"
    }
  },
  lawyerType: {
    type: String,
    required: true,
    enum: [
      "Civil Litigation",
      "Criminal Defense",
      "Family Law",
      "Corporate Law",
      "Property Law",
      "Labor Law",
      "Tax Law",
      "Constitutional Law",
      "Commercial Law",
      "Intellectual Property"
    ]
  },
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
  passoutYear: {
    type: Number,
    required: true,
    min: 1950,
    max: new Date().getFullYear()
  },
  lawIdImage: {
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
  ratings: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
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
unverifiedLawyerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.updatedAt = Date.now();
  next();
});

// Method to check password
unverifiedLawyerSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Static method to generate next lawyer ID
unverifiedLawyerSchema.statics.generateLawyerId = async function() {
  // Check both verified and unverified lawyers to avoid conflicts
  const VerifiedLawyer = require('./VerifiedLawyer');
  const lastVerifiedLawyer = await VerifiedLawyer.findOne({}, {}, { sort: { 'lawyerId': -1 } });
  const lastUnverifiedLawyer = await this.findOne({}, {}, { sort: { 'lawyerId': -1 } });
  
  let nextId = 1;
  const verifiedId = lastVerifiedLawyer ? parseInt(lastVerifiedLawyer.lawyerId.replace('LAW', '')) : 0;
  const unverifiedId = lastUnverifiedLawyer ? parseInt(lastUnverifiedLawyer.lawyerId.replace('LAW', '')) : 0;
  
  nextId = Math.max(verifiedId, unverifiedId) + 1;
  return `LAW${nextId.toString().padStart(4, '0')}`;
};

module.exports = mongoose.model("UnverifiedLawyer", unverifiedLawyerSchema);