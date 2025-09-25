const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const individualServiceSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['consultation', 'documents', 'representation'],
    default: 'consultation'
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'LKR'
  },
  duration: {
    type: String, // e.g., "1 hour", "24 hours", "3-5 business days"
    required: true
  },
  deliverable: {
    type: String, // What the client gets (e.g., "Video consultation", "Legal document", "Report")
    required: true
  },
  requirements: [{
    type: String // What client needs to provide
  }],
  specialization: [{
    type: String // e.g., "corporate", "family", "property", "general"
  }],
  complexity: {
    type: String,
    enum: ['simple', 'standard', 'complex'],
    default: 'standard'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  estimatedTurnaround: {
    type: String, // e.g., "1 hour", "Same day", "3-5 business days"
    required: true
  },
  features: [{
    name: String,
    description: String,
    included: {
      type: Boolean,
      default: true
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff' // Finance manager who created this service
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
individualServiceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
individualServiceSchema.index({ category: 1, isActive: 1 });
individualServiceSchema.index({ isActive: 1, isPopular: -1 });

module.exports = mongoose.model("IndividualService", individualServiceSchema);
