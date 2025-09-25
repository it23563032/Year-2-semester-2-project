const express = require("express");
const AdminVerificationController = require("../Controllers/AdminVerificationController");
const StaffController = require("../Controllers/StaffController");
const AdminEmailController = require("../Controllers/AdminEmailController");
const { protect, restrictTo } = require("../Controllers/UnverifiedAuthController");

const router = express.Router();

// Test route (no auth required)
router.get("/test", (req, res) => {
  res.json({ message: "Admin routes working", timestamp: new Date() });
});

// All routes require authentication
router.use(protect);

// Verification routes (admin and verifier access)
router.get("/unverified-lawyers", 
    restrictTo('admin'), 
    AdminVerificationController.getUnverifiedLawyers
);

router.get("/unverified-clients", 
    restrictTo('admin'), 
    AdminVerificationController.getUnverifiedClients
);

router.get("/verified-lawyers", 
    restrictTo('admin'), 
    AdminVerificationController.getVerifiedLawyers
);

router.get("/verified-clients", 
    restrictTo('admin'), 
    AdminVerificationController.getVerifiedClients
);

router.post("/approve-lawyer/:lawyerId", 
    restrictTo('admin'), 
    AdminVerificationController.approveLawyer
);

router.post("/approve-client/:clientId", 
    restrictTo('admin'), 
    AdminVerificationController.approveClient
);

router.post("/reject-lawyer/:lawyerId", 
    restrictTo('admin'), 
    AdminVerificationController.rejectLawyer
);

router.post("/reject-client/:clientId", 
    restrictTo('admin'), 
    AdminVerificationController.rejectClient
);

router.get("/verification-stats", 
    restrictTo('admin'), 
    AdminVerificationController.getVerificationStats
);

router.get("/dashboard-stats", 
    restrictTo('admin'), 
    AdminVerificationController.getDashboardStats
);

// Staff management routes (admin only)
router.get("/staff", 
    restrictTo('admin'), 
    StaffController.getAllStaff
);

// Staff export routes (must be before /staff/:staffId to avoid conflicts)
router.get("/staff/export/pdf", 
    restrictTo('admin'), 
    StaffController.exportStaffPDF
);

router.get("/staff/export/excel", 
    restrictTo('admin'), 
    StaffController.exportStaffExcel
);

router.get("/staff/:staffId", 
    restrictTo('admin'), 
    StaffController.getStaffById
);

router.post("/staff", 
    restrictTo('admin'), 
    StaffController.createStaff
);

router.put("/staff/:staffId", 
    restrictTo('admin'), 
    StaffController.updateStaff
);

router.patch("/staff/:staffId/deactivate", 
    restrictTo('admin'), 
    StaffController.deactivateStaff
);

router.patch("/staff/:staffId/reactivate", 
    restrictTo('admin'), 
    StaffController.reactivateStaff
);

router.patch("/staff/:staffId/change-password", 
    StaffController.changeStaffPassword
);

router.get("/staff-stats", 
    restrictTo('admin'), 
    StaffController.getStaffStats
);

// User management routes
router.get("/user-details/:userType/:userId", 
    restrictTo('admin'), 
    AdminVerificationController.getUserDetails
);

router.post("/reset-password/:userType/:userId", 
    restrictTo('admin'), 
    AdminVerificationController.resetUserPassword
);

// Email report routes (admin only)
router.get("/email-settings", 
    restrictTo('admin'), 
    AdminEmailController.getEmailSettings
);

router.put("/email-settings", 
    restrictTo('admin'), 
    AdminEmailController.updateEmailSettings
);

router.post("/email-settings/test", 
    restrictTo('admin'), 
    AdminEmailController.sendTestEmail
);

router.post("/email-settings/send-now", 
    restrictTo('admin'), 
    AdminEmailController.sendImmediateReport
);

router.get("/email-reports/history", 
    restrictTo('admin'), 
    AdminEmailController.getEmailReportHistory
);

router.get("/email-reports/stats", 
    restrictTo('admin'), 
    AdminEmailController.getEmailStats
);

module.exports = router;
