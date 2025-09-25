const express = require('express');
const router = express.Router();
const NotificationController = require('../Controllers/NotificationController');
const { protect, checkAnalyticsManagerAccess, checkUserAccess } = require('../Controllers/UnverifiedAuthController');

// Analytics Manager routes (protected)
router.post('/create', protect, checkAnalyticsManagerAccess, NotificationController.createNotification);
router.get('/history', protect, checkAnalyticsManagerAccess, NotificationController.getNotificationHistory);
router.get('/stats', protect, checkAnalyticsManagerAccess, NotificationController.getNotificationStats);
router.get('/users/:userType', protect, checkAnalyticsManagerAccess, NotificationController.getAvailableUsers);
router.delete('/:notificationId', protect, checkAnalyticsManagerAccess, NotificationController.deleteNotification);

// User routes (for all authenticated users - clients, lawyers, staff)
router.get('/my-notifications', protect, NotificationController.getUserNotifications);
router.post('/acknowledge/:notificationId', protect, NotificationController.acknowledgeNotification);

module.exports = router;
