// routes/lawyers.js
const express = require('express');
const router = express.Router();
const { protect } = require('../Controllers/AuthControllers');
const User = require('../Model/UserModel');

// Get available lawyers by specialization - CHANGE THIS ROUTE
router.get('/specialization/:caseType', protect, async (req, res) => {
  try {
    const { caseType } = req.params;
    
    // Map case types to specializations (simplified)
    const specializationMap = {
      'smallClaims': ['Civil', 'Small Claims'],
      'landDispute': ['Property', 'Real Estate'],
      'tenancy': ['Property', 'Tenancy'],
      'family': ['Family', 'Divorce'],
      'consumer': ['Consumer Rights', 'Commercial'],
      'other': ['General Practice']
    };
    
    const specializations = specializationMap[caseType] || ['General Practice'];
    
    const lawyers = await User.find({
      userType: 'lawyer',
      availability: true,
      specialization: { $in: specializations }
    }).select('-password');
    
    res.status(200).json(lawyers);
  } catch (error) {
    console.error('Error fetching lawyers:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;