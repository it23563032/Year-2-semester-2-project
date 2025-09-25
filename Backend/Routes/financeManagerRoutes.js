const express = require('express');
const router = express.Router();
const { protect } = require('../Controllers/UnverifiedAuthController');
const FinanceManagerController = require('../Controllers/FinanceManagerController');

// Middleware to check if user is a finance manager
const checkFinanceManagerRole = (req, res, next) => {
  if (req.user.userType !== 'finance_manager') {
    return res.status(403).json({ 
      message: "Access denied. This endpoint is for finance managers only.",
      userType: req.user.userType
    });
  }
  
  next();
};

// Finance manager routes - all protected and finance manager only
router.get('/dashboard', protect, checkFinanceManagerRole, FinanceManagerController.getFinanceDashboard);
router.get('/dashboard-stats', protect, checkFinanceManagerRole, FinanceManagerController.getDashboardStats);
router.get('/service-requests', protect, checkFinanceManagerRole, FinanceManagerController.getAllServiceRequests);
router.put('/service-requests/:requestId/approve', protect, checkFinanceManagerRole, FinanceManagerController.approveServiceRequest);
router.put('/service-requests/:requestId/reject', protect, checkFinanceManagerRole, FinanceManagerController.rejectServiceRequest);
router.put('/approve-service-request/:requestId', protect, checkFinanceManagerRole, FinanceManagerController.approveServiceRequest);
router.put('/reject-service-request/:requestId', protect, checkFinanceManagerRole, FinanceManagerController.rejectServiceRequest);
router.get('/transactions', protect, checkFinanceManagerRole, FinanceManagerController.getPaymentTransactions);
router.get('/financial-report', protect, checkFinanceManagerRole, FinanceManagerController.getFinancialReport);
router.get('/budget', protect, checkFinanceManagerRole, FinanceManagerController.getBudgetData);

// Individual services management routes
router.get('/individual-services', protect, checkFinanceManagerRole, FinanceManagerController.getAllIndividualServices);
router.post('/individual-services', protect, checkFinanceManagerRole, FinanceManagerController.createIndividualService);
router.put('/individual-services/:serviceId', protect, checkFinanceManagerRole, FinanceManagerController.updateIndividualService);
router.delete('/individual-services/:serviceId', protect, checkFinanceManagerRole, FinanceManagerController.deleteIndividualService);

// Individual service requests management
router.get('/individual-service-requests', protect, checkFinanceManagerRole, FinanceManagerController.getAllIndividualServiceRequests);
router.put('/individual-service-requests/:requestId/approve', protect, checkFinanceManagerRole, FinanceManagerController.approveIndividualServiceRequest);
router.put('/individual-service-requests/:requestId/reject', protect, checkFinanceManagerRole, FinanceManagerController.rejectIndividualServiceRequest);
router.put('/approve-individual-request/:requestId', protect, checkFinanceManagerRole, FinanceManagerController.approveIndividualServiceRequest);
router.put('/reject-individual-request/:requestId', protect, checkFinanceManagerRole, FinanceManagerController.rejectIndividualServiceRequest);

// Financial aid management routes
router.get('/financial-aid-requests', protect, checkFinanceManagerRole, FinanceManagerController.getAllFinancialAidRequests);
router.put('/financial-aid-requests/:requestId/approve', protect, checkFinanceManagerRole, FinanceManagerController.approveFinancialAidRequest);
router.put('/financial-aid-requests/:requestId/reject', protect, checkFinanceManagerRole, FinanceManagerController.rejectFinancialAidRequest);
router.put('/financial-aid-requests/:requestId/request-info', protect, checkFinanceManagerRole, FinanceManagerController.requestMoreInfoForAidRequest);
router.put('/financial-aid-requests/:requestId/status', protect, checkFinanceManagerRole, FinanceManagerController.updateAidRequestStatus);
router.put('/approve-aid-request/:requestId', protect, checkFinanceManagerRole, FinanceManagerController.approveFinancialAidRequest);
router.put('/reject-aid-request/:requestId', protect, checkFinanceManagerRole, FinanceManagerController.rejectFinancialAidRequest);

module.exports = router;
