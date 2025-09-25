const express = require('express');
const router = express.Router();
const { protect } = require('../Controllers/UnverifiedAuthController');
const PremiumServicesController = require('../Controllers/PremiumServicesController');

// Enhanced middleware to check if user is a verified client
const checkClientRole = (req, res, next) => {
  console.log('🔍 CheckClientRole middleware - User info:');
  console.log('  - User ID:', req.user?.id || req.user?._id);
  console.log('  - User Type:', req.user?.userType || req.userType);
  console.log('  - Collection:', req.collection);
  console.log('  - User object keys:', req.user ? Object.keys(req.user) : 'No user object');
  
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
      message: "Access denied. Premium services require verified client account.",
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

// Enhanced test endpoint
router.get('/test', protect, checkClientRole, (req, res) => {
  res.json({
    success: true,
    message: 'Premium services route is working perfectly!',
    authentication: {
      userId: req.user?.id || req.user?._id,
      userType: req.user?.userType || req.userType,
      collection: req.collection,
      userName: req.user?.fullName || req.user?.name,
      userEmail: req.user?.email,
      isActive: req.user?.isActive
    },
    services: {
      monthlyPackages: 'Available',
      individualServices: 'Available',
      paymentProcessing: 'Ready'
    },
    timestamp: new Date().toISOString()
  });
});

// Client routes - all protected and client-only
router.get('/packages', protect, checkClientRole, PremiumServicesController.getServicePackages);
router.post('/payment', protect, checkClientRole, PremiumServicesController.processPayment);
router.get('/my-services', protect, checkClientRole, PremiumServicesController.getClientServices);
router.get('/receipt/:receiptNumber', protect, checkClientRole, PremiumServicesController.getReceipt);

// Individual services routes
router.get('/individual-services', protect, checkClientRole, PremiumServicesController.getIndividualServices);
router.post('/individual-payment', protect, checkClientRole, PremiumServicesController.processIndividualServicePayment);
router.get('/my-individual-services', protect, checkClientRole, PremiumServicesController.getClientIndividualServices);

module.exports = router;