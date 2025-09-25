const express = require('express');
const router = express.Router();
const EmailController = require('../Controllers/EmailController');
const { protect, checkAnalyticsManagerAccess } = require('../Controllers/UnverifiedAuthController');

// All email routes require authentication and Analytics Manager access
router.use(protect);
router.use(checkAnalyticsManagerAccess);

// Send email
router.post('/send', EmailController.sendEmail);

// Get email history
router.get('/history', EmailController.getEmailHistory);

// Get email statistics
router.get('/stats', EmailController.getEmailStats);

// Get recipient counts
router.get('/recipient-counts', EmailController.getRecipientCounts);

module.exports = router;
