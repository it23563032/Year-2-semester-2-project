// routes/verification.js
const express = require('express');
const router = express.Router();
const { protect } = require('../Controllers/AuthControllers');
const { getVerificationStatus, createVerification } = require('../Controllers/verificationController');

// Get verification status for a case
router.get('/:caseId', protect, getVerificationStatus);

// Create verification record (for testing)
router.post('/', protect, createVerification);

module.exports = router;