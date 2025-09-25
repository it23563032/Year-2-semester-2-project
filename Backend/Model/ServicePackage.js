const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const servicePackageSchema = new Schema({
  name: {
    type: String,
    required: true,
    enum: ['Basic', 'Standard', 'Premium']
  },
  price: {
    type: Number,
    required: true // Price in LKR
  },
  currency: {
    type: String,
    default: 'LKR'
  },
  duration: {
    type: String,
    default: 'monthly' // monthly, yearly
  },
  features: [{
    name: String,
    description: String,
    included: Boolean
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  description: {
    type: String,
    required: true
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

// Update timestamp on save
servicePackageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("ServicePackage", servicePackageSchema);
