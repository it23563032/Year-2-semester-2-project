const express = require('express');
const router = express.Router();
const { protect } = require('../Controllers/UnverifiedAuthController');
const FeedbackController = require('../Controllers/FeedbackController');

// Middleware to check if user is verified client or lawyer
const checkUserAccess = (req, res, next) => {
  console.log('🔍 CheckUserAccess middleware - User info:');
  console.log('  - User ID:', req.user?.id);
  console.log('  - User Type:', req.user?.userType);
  console.log('  - Collection:', req.collection);

  const allowedTypes = ['verified_client', 'verified_lawyer'];
  const allowedCollections = ['verified_clients', 'verified_lawyers'];
  
  const userType = req.user?.userType;
  const collection = req.collection;
  
  // Check if user type and collection are allowed
  if (!allowedTypes.includes(userType) || !allowedCollections.includes(collection)) {
    return res.status(403).json({ 
      message: "Access denied. Only verified clients and lawyers can access feedback system.",
      userType: userType,
      collection: collection
    });
  }
  
  next();
};

// Middleware to check if user is analytics manager
const checkAnalyticsManagerAccess = (req, res, next) => {
  console.log('🔍 CheckAnalyticsManagerAccess middleware - User info:');
  console.log('  - User ID:', req.user?.id);
  console.log('  - User Type:', req.user?.userType);
  console.log('  - Collection:', req.collection);

  const userType = req.user?.userType;
  const collection = req.collection;
  
  // Check if user is analytics manager
  if (userType !== 'analytics_notification_manager' || collection !== 'staff') {
    return res.status(403).json({ 
      message: "Access denied. This endpoint is for analytics managers only.",
      userType: userType,
      collection: collection
    });
  }
  
  next();
};

// Routes for Clients and Lawyers
// ===============================

// Submit new feedback
router.post('/submit', protect, checkUserAccess, FeedbackController.submitFeedback);

// Get user's own feedback
router.get('/my-feedback', protect, checkUserAccess, FeedbackController.getUserFeedback);

// Mark response as read
router.put('/mark-read/:feedbackId', protect, checkUserAccess, FeedbackController.markResponseAsRead);

// Routes for Analytics Manager
// ============================

// Get all feedback (with filters)
router.get('/all', protect, checkAnalyticsManagerAccess, FeedbackController.getAllFeedback);

// Respond to feedback
router.put('/respond/:feedbackId', protect, checkAnalyticsManagerAccess, FeedbackController.respondToFeedback);

// Mark feedback as resolved
router.put('/resolve/:feedbackId', protect, checkAnalyticsManagerAccess, FeedbackController.markAsResolved);

// Get feedback statistics
router.get('/stats', protect, checkAnalyticsManagerAccess, FeedbackController.getFeedbackStats);

// Test route to verify authentication
router.get('/test', protect, (req, res) => {
  res.json({
    message: 'Feedback API is working!',
    user: {
      id: req.user?.id,
      userType: req.user?.userType,
      collection: req.collection,
      name: req.user?.fullName || req.user?.name
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
