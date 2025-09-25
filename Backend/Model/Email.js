const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const emailSchema = new Schema({
  // Email ID for tracking
  emailId: {
    type: String,
    unique: true
  },
  
  // Who sent the email (Analytics Manager)
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  
  // Email details
  subject: {
    type: String,
    required: true,
    trim: true
  },
  
  message: {
    type: String,
    required: true
  },
  
  // Recipient targeting
  recipientType: {
    type: String,
    enum: ['specific', 'all_staff', 'all_clients', 'all_lawyers', 'all_users'],
    required: true
  },
  
  // Specific email addresses (for specific targeting)
  specificEmails: [{
    email: {
      type: String,
      required: function() {
        return this.recipientType === 'specific';
      }
    },
    name: String,
    userType: String // 'client', 'lawyer', 'staff', 'other'
  }],
  
  // Reason for sending email
  reason: {
    type: String,
    enum: [
      'system_update', 
      'maintenance_notice', 
      'policy_change', 
      'urgent_announcement', 
      'service_notification',
      'security_alert',
      'newsletter',
      'feedback_response',
      'other'
    ],
    required: true
  },
  
  // Custom reason (if reason is 'other')
  customReason: {
    type: String,
    required: function() {
      return this.reason === 'other';
    }
  },
  
  // Email status
  status: {
    type: String,
    enum: ['sending', 'sent', 'failed', 'partially_sent'],
    default: 'sending'
  },
  
  // Delivery statistics
  deliveryStats: {
    totalRecipients: { type: Number, default: 0 },
    successfulDeliveries: { type: Number, default: 0 },
    failedDeliveries: { type: Number, default: 0 },
    failedEmails: [String] // Store failed email addresses
  },
  
  // Email priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Email template used (if any)
  template: {
    type: String,
    enum: ['default', 'announcement', 'maintenance', 'security', 'newsletter'],
    default: 'default'
  },
  
  // Metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    sentAt: { type: Date, default: Date.now },
    estimatedDeliveryTime: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
// emailSchema.index({ emailId: 1 }); // Removed duplicate index (unique: true already creates index)
emailSchema.index({ sentBy: 1 });
emailSchema.index({ recipientType: 1 });
emailSchema.index({ status: 1 });
emailSchema.index({ createdAt: -1 });
emailSchema.index({ reason: 1 });

// Pre-save middleware to generate email ID
emailSchema.pre('save', function(next) {
  if (!this.emailId) {
    const timestamp = Date.now().toString();
    const randomStr = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.emailId = `EMAIL-${timestamp}-${randomStr}`;
  }
  next();
});

// Instance methods
emailSchema.methods.updateDeliveryStats = function(successful, failed) {
  this.deliveryStats.successfulDeliveries = successful.length;
  this.deliveryStats.failedDeliveries = failed.length;
  this.deliveryStats.totalRecipients = successful.length + failed.length;
  this.deliveryStats.failedEmails = failed;
  
  if (failed.length === 0) {
    this.status = 'sent';
  } else if (successful.length === 0) {
    this.status = 'failed';
  } else {
    this.status = 'partially_sent';
  }
  
  this.metadata.sentAt = new Date();
  return this.save();
};

// Static methods
emailSchema.statics.getEmailStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

emailSchema.statics.getRecentEmails = function(limit = 10) {
  return this.find({})
    .populate('sentBy', 'fullName email')
    .sort({ createdAt: -1 })
    .limit(limit);
};

module.exports = mongoose.model('Email', emailSchema);
