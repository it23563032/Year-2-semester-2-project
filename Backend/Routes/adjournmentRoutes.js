const express = require('express');
const router = express.Router();
const auth = require('../Middleware/auth');
const {
  createAdjournmentRequest,
  getAdjournmentRequests,
  getClientAdjournmentRequests,
  acceptAdjournmentRequest,
  rejectAdjournmentRequest,
  getAdjournmentRequestDetails
} = require('../Controllers/AdjournmentController');

// Middleware to check if user is court scheduler
const isScheduler = (req, res, next) => {
  if (req.user.userType !== 'court_scheduler') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Court scheduler role required.'
    });
  }
  next();
};

// Middleware to check if user is client
const isClient = (req, res, next) => {
  if (req.user.userType !== 'verified_client') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Verified client role required.'
    });
  }
  next();
};

// Client routes
router.post('/request', auth, isClient, createAdjournmentRequest);
router.get('/client-requests', auth, isClient, getClientAdjournmentRequests);

// Court scheduler routes
router.get('/requests', auth, isScheduler, getAdjournmentRequests);
router.get('/requests/:requestId', auth, isScheduler, getAdjournmentRequestDetails);
router.put('/requests/:requestId/accept', auth, isScheduler, acceptAdjournmentRequest);
router.put('/requests/:requestId/reject', auth, isScheduler, rejectAdjournmentRequest);

module.exports = router;
