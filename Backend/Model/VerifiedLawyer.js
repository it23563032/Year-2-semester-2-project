const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcryptjs");

const verifiedLawyerSchema = new Schema({
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
  totalReviews: {
    type: Number,
    default: 0
  },
  casesHandled: {
    type: Number,
    default: 0
  },
  availability: {
    type: Boolean,
    default: true
  },
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
verifiedLawyerSchema.pre("save", async function (next) {
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
verifiedLawyerSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Static method to generate next lawyer ID
verifiedLawyerSchema.statics.generateLawyerId = async function() {
  const lastLawyer = await this.findOne({}, {}, { sort: { 'lawyerId': -1 } });
  let nextId = 1;
  if (lastLawyer && lastLawyer.lawyerId) {
    const lastIdNumber = parseInt(lastLawyer.lawyerId.replace('LAW', ''));
    nextId = lastIdNumber + 1;
  }
  return `LAW${nextId.toString().padStart(4, '0')}`;
};

module.exports = mongoose.model("VerifiedLawyer", verifiedLawyerSchema);