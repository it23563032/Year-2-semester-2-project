const mongoose = require('mongoose');
const { Schema } = mongoose;

const notificationSchema = new Schema({
  notificationId: { type: String, unique: true }, // Auto-generated
  
  // Notification content
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: [
      'system_update', 'maintenance_notice', 'court_update', 'schedule_change',
      'document_required', 'case_closed', 'urgent_alert', 'payment_reminder',
      'hearing_scheduled', 'hearing_cancelled', 'case_assigned', 'deadline_reminder',
      'system_maintenance', 'feature_update', 'security_alert', 'general_announcement'
    ], 
    required: true 
  },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  
  // Sender info
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  createdByName: { type: String, required: true },
  
  // Recipients
  recipientType: { 
    type: String, 
    enum: ['all_users', 'all_clients', 'all_lawyers', 'all_staff', 'specific_users'], 
    required: true 
  },
  specificUsers: [{
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    userType: { type: String, enum: ['VerifiedClient', 'VerifiedLawyer', 'Staff'], required: true },
    userName: String,
    userEmail: String
  }],
  
  // Delivery tracking
  totalRecipients: { type: Number, default: 0 },
  deliveredTo: [{
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    userType: { type: String, enum: ['VerifiedClient', 'VerifiedLawyer', 'Staff'], required: true },
    deliveredAt: { type: Date, default: Date.now }
  }],
  
  // Acknowledgment tracking
  requiresAcknowledgment: { type: Boolean, default: true },
  acknowledgedBy: [{
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    userType: { type: String, enum: ['VerifiedClient', 'VerifiedLawyer', 'Staff'], required: true },
    acknowledgedAt: { type: Date, default: Date.now },
    userName: String
  }],
  
  // Status and expiry
  status: { type: String, enum: ['draft', 'sent', 'expired'], default: 'sent' },
  expiresAt: { type: Date, default: null }, // Optional expiry date
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  sentAt: { type: Date, default: null }
}, { timestamps: true });

// Pre-save hook to generate notificationId and update timestamps
notificationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  if (!this.notificationId) {
    const timestamp = Date.now().toString();
    const randomStr = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.notificationId = `NOTIF-${timestamp}-${randomStr}`;
  }
  
  next();
});

// Instance method to check if notification is expired
notificationSchema.methods.isExpired = function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

// Instance method to get acknowledgment rate
notificationSchema.methods.getAcknowledgmentRate = function() {
  if (!this.requiresAcknowledgment || this.totalRecipients === 0) return 100;
  return Math.round((this.acknowledgedBy.length / this.totalRecipients) * 100);
};

// Static method to get user's unread notifications
notificationSchema.statics.getUnreadForUser = function(userId, userType) {
  return this.find({
    $and: [
      { status: 'sent' },
      { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] },
      {
        $or: [
          { recipientType: 'all_users' },
          { recipientType: userType === 'VerifiedClient' ? 'all_clients' : userType === 'VerifiedLawyer' ? 'all_lawyers' : 'all_staff' },
          { 'specificUsers.userId': userId }
        ]
      },
      { 'acknowledgedBy.userId': { $ne: userId } }
    ]
  }).sort({ priority: -1, createdAt: -1 });
};

// Index for better query performance
notificationSchema.index({ createdBy: 1, createdAt: -1 });
notificationSchema.index({ recipientType: 1, status: 1 });
notificationSchema.index({ 'specificUsers.userId': 1 });
notificationSchema.index({ 'acknowledgedBy.userId': 1 });
notificationSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
