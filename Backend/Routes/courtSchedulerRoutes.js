const express = require('express');
const router = express.Router();
const auth = require('../Middleware/auth');
const {
  getUnscheduledRequests,
  getScheduledCases,
  getAvailableTimeSlots,
  scheduleCase,
  getDashboardStats,
  getCalendarData,
  generateSchedulesPDF
} = require('../Controllers/CourtSchedulerController');

// Middleware to check if user is a court scheduler
const checkSchedulerRole = (req, res, next) => {
  console.log('🔍 Checking scheduler role...');
  console.log('User from token:', req.user);
  console.log('User type:', req.user?.userType);
  
  if (req.user.userType !== 'court_scheduler') {
    console.log('❌ Access denied - not a court scheduler');
    return res.status(403).json({
      success: false,
      message: `Access denied. User type '${req.user?.userType}' is not authorized. Only court schedulers can access this resource.`
    });
  }
  
  console.log('✅ Court scheduler access granted');
  next();
};

// Apply protection and role check to all routes
router.use(auth);
router.use(checkSchedulerRole);

// Dashboard routes
router.get('/stats', getDashboardStats);

// Schedule request routes
router.get('/unscheduled-requests', getUnscheduledRequests);
router.get('/scheduled-cases', getScheduledCases);

// Scheduling routes
router.get('/timeslots/available', getAvailableTimeSlots);
router.post('/schedule/:requestId', scheduleCase);

// Calendar routes
router.get('/calendar', getCalendarData);

// PDF generation routes
router.get('/schedules-pdf', generateSchedulesPDF);

module.exports = router;
