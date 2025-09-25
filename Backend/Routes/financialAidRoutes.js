const express = require('express');
const router = express.Router();
const { protect } = require('../Controllers/UnverifiedAuthController');
const FinancialAidController = require('../Controllers/FinancialAidController');

// Middleware to check if user is a verified client
const checkClientRole = (req, res, next) => {
  console.log('🔍 CheckClientRole middleware - User info:');
  console.log('  - User ID:', req.user?.id || req.user?._id);
  console.log('  - User Type:', req.user?.userType || req.userType);
  console.log('  - Collection:', req.collection);
  
  const restrictedTypes = ['lawyer', 'verified_lawyer', 'court_scheduler', 'finance_manager', 'admin', 'verifier'];
  const userType = req.user?.userType || req.userType;
  const collection = req.collection;
  
  // Check if user is restricted type
  if (restrictedTypes.includes(userType)) {
    return res.status(403).json({ 
      message: "Access denied. This endpoint is for clients only.",
      userType: userType,
      collection: collection
    });
  }
  
  // Check if user is verified client
  if (collection !== 'verified_clients' || userType !== 'verified_client') {
    return res.status(403).json({
      message: "Access denied. Financial aid requests require verified client account.",
      details: {
        currentUserType: userType,
        currentCollection: collection,
        required: "verified_client in verified_clients collection",
        solution: "Please log in with a verified client account or register as a new client and wait for verification."
      }
    });
  }
  
  console.log('✅ Verified client role check passed');
  next();
};

// Client routes - all protected and client-only
router.post('/submit', protect, checkClientRole, FinancialAidController.submitFinancialAidRequest);
router.get('/my-requests', protect, checkClientRole, FinancialAidController.getClientAidRequests);
router.get('/request/:requestId', protect, checkClientRole, FinancialAidController.getAidRequestDetails);
router.put('/request/:requestId', protect, checkClientRole, FinancialAidController.updateAidRequest);
router.delete('/request/:requestId', protect, checkClientRole, FinancialAidController.cancelAidRequest);

// Test endpoint
router.get('/test', protect, checkClientRole, (req, res) => {
  res.json({
    success: true,
    message: 'Financial aid routes are working!',
    authentication: {
      userId: req.user?.id || req.user?._id,
      userType: req.user?.userType || req.userType,
      collection: req.collection,
      userName: req.user?.fullName || req.user?.name,
      userEmail: req.user?.email
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
