const express = require('express');
const router = express.Router();
const AnalyticsController = require('../Controllers/AnalyticsController');
const { protect, checkAnalyticsManagerAccess } = require('../Controllers/UnverifiedAuthController');

// Analytics Manager routes (protected)
router.get('/dashboard-stats', protect, checkAnalyticsManagerAccess, AnalyticsController.getDashboardStats);
router.get('/analytics-data', protect, checkAnalyticsManagerAccess, AnalyticsController.getAnalyticsData);
router.get('/system-metrics', protect, checkAnalyticsManagerAccess, AnalyticsController.getSystemMetrics);

module.exports = router;
