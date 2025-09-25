const express = require('express');
const router = express.Router();
const ProfileController = require('../Controllers/ProfileController');
const { protect } = require('../Controllers/UnverifiedAuthController');

// Get current user's profile
router.get('/me', protect, ProfileController.getCurrentUserProfile);

// Update current user's profile
router.put('/update', protect, ProfileController.updateUserProfile);

// Change password (separate endpoint for security)
router.put('/change-password', protect, ProfileController.changePassword);

module.exports = router;
