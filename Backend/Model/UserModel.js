const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcryptjs");

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  nic: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  userType: {
    type: String,
    enum: ["client", "lawyer", "admin", "verifier"],
    default: "client",
  },
  cases: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CaseModel",
      validate: {
        validator: function (v) {
          return mongoose.Types.ObjectId.isValid(v);
        },
        message: "Invalid case ID format",
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  specialization: {
    type: [String],
    default: [],
  },
  barNumber: {
    type: String,
  },
  yearsExperience: {
    type: Number,
    default: 0,
  },
  rating: {
    type: Number,
    default: 0,
  },
  casesHandled: {
    type: Number,
    default: 0,
  },
  currentCases: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CaseModel",
    },
  ],
  availability: {
    type: Boolean,
    default: true,
  },
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

module.exports = mongoose.model("UserModel", userSchema);