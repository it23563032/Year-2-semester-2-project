const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const feedbackSchema = new Schema({
  // Feedback ID
  feedbackId: {
    type: String,
    unique: true
  },
  
  // User who submitted the feedback
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'userType',
    required: true
  },
  
  // Dynamic reference for user type
  userType: {
    type: String,
    enum: ['VerifiedClient', 'VerifiedLawyer'],
    required: true
  },
  
  // User's name for easy reference
  userName: {
    type: String,
    required: true
  },
  
  // User's email for easy reference
  userEmail: {
    type: String,
    required: true
  },
  
  // Type of feedback
  feedbackType: {
    type: String,
    enum: ['feedback', 'problem', 'suggestion'],
    required: true
  },
  
  // Category of feedback
  category: {
    type: String,
    enum: [
      'system_performance', 
      'user_interface', 
      'legal_services', 
      'payment_system', 
      'case_management', 
      'communication', 
      'documentation', 
      'mobile_app',
      'other'
    ],
    required: true
  },
  
  // Priority level
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Subject/Title
  subject: {
    type: String,
    required: true,
    trim: true
  },
  
  // Detailed feedback message
  message: {
    type: String,
    required: true
  },
  
  // Status of the feedback
  status: {
    type: String,
    enum: ['pending', 'in_review', 'responded', 'resolved', 'closed'],
    default: 'pending'
  },
  
  // Analytics Manager who handled this feedback
  handledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    default: null
  },
  
  // Response from Analytics Manager
  response: {
    message: {
      type: String,
      default: null
    },
    respondedAt: {
      type: Date,
      default: null
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null
    }
  },
  
  // Whether user has read the response
  responseRead: {
    type: Boolean,
    default: false
  },
  
  // Rating given by user (1-5 stars)
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  
  // Additional metadata
  metadata: {
    userAgent: String,
    ipAddress: String,
    deviceType: String,
    browserInfo: String
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // When the issue was resolved (for problems)
  resolvedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better query performance
// feedbackSchema.index({ feedbackId: 1 }); // Removed duplicate index
feedbackSchema.index({ submittedBy: 1, userType: 1 });
feedbackSchema.index({ status: 1 });
feedbackSchema.index({ feedbackType: 1 });
feedbackSchema.index({ category: 1 });
feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ priority: 1 });

// Pre-save middleware to update the updatedAt field
feedbackSchema.pre('save', function(next) {
  // Update timestamp
  this.updatedAt = new Date();
  
  // Generate feedback ID if not exists
  if (!this.feedbackId) {
    const timestamp = Date.now().toString();
    const randomStr = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.feedbackId = `FB-${timestamp}-${randomStr}`;
  }
  
  next();
});

// Instance methods
feedbackSchema.methods.markAsRead = function() {
  this.responseRead = true;
  return this.save();
};

feedbackSchema.methods.markAsResolved = function(resolvedBy) {
  this.status = 'resolved';
  this.resolvedAt = new Date();
  this.handledBy = resolvedBy;
  return this.save();
};

feedbackSchema.methods.addResponse = function(responseMessage, respondedBy) {
  this.response = {
    message: responseMessage,
    respondedAt: new Date(),
    respondedBy: respondedBy
  };
  this.status = 'responded';
  this.responseRead = false; // User hasn't read the response yet
  return this.save();
};

// Static methods
feedbackSchema.statics.getFeedbackStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

feedbackSchema.statics.getFeedbackByType = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$feedbackType',
        count: { $sum: 1 }
      }
    }
  ]);
};

feedbackSchema.statics.getRecentFeedback = function(limit = 10) {
  return this.find({})
    .populate('submittedBy', 'fullName email')
    .populate('handledBy', 'fullName email')
    .sort({ createdAt: -1 })
    .limit(limit);
};

module.exports = mongoose.model('Feedback', feedbackSchema);
