const FinancialAidRequest = require('../Model/FinancialAidRequest');
const ServicePackage = require('../Model/ServicePackage');
const IndividualService = require('../Model/IndividualService');
const VerifiedClient = require('../Model/VerifiedClient');
const CaseModel = require('../Model/CaseModel');

// Submit financial aid request
const submitFinancialAidRequest = async (req, res) => {
  try {
    console.log('💰 Submitting financial aid request...');
    console.log('Client ID:', req.user.id);
    console.log('Request data:', req.body);

    const {
      requestType,
      servicePackageId,
      individualServiceId,
      caseId,
      requestedAmount,
      aidType,
      reason,
      financialSituation,
      supportingDocuments = []
    } = req.body;

    // Validate required fields
    if (!requestType || !requestedAmount || !aidType || !reason || !financialSituation) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Get client data
    const client = await VerifiedClient.findById(req.user.id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    let originalAmount = 0;
    let servicePackage = null;
    let individualService = null;
    let caseData = null;

    // Validate and get service/package details
    if (requestType === 'monthly_package') {
      if (!servicePackageId) {
        return res.status(400).json({
          success: false,
          message: 'Service package ID is required for package requests'
        });
      }
      
      servicePackage = await ServicePackage.findById(servicePackageId);
      if (!servicePackage) {
        return res.status(404).json({
          success: false,
          message: 'Service package not found'
        });
      }
      originalAmount = servicePackage.price;
    } else if (requestType === 'individual_service') {
      if (!individualServiceId) {
        return res.status(400).json({
          success: false,
          message: 'Individual service ID is required for service requests'
        });
      }
      
      individualService = await IndividualService.findById(individualServiceId);
      if (!individualService) {
        return res.status(404).json({
          success: false,
          message: 'Individual service not found'
        });
      }
      originalAmount = individualService.price;
    } else if (requestType === 'case_filing') {
      if (!caseId) {
        return res.status(400).json({
          success: false,
          message: 'Case ID is required for case filing aid requests'
        });
      }
      
      caseData = await CaseModel.findById(caseId);
      if (!caseData) {
        return res.status(404).json({
          success: false,
          message: 'Case not found'
        });
      }
      originalAmount = caseData.caseValue || 10000; // Default case filing cost
    }

    // Validate requested amount
    if (requestedAmount < 0 || requestedAmount > originalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Invalid requested amount'
      });
    }

    // Calculate priority based on financial situation
    let priority = 'medium';
    if (financialSituation.monthlyIncome < 25000) {
      priority = 'high';
    } else if (financialSituation.monthlyIncome < 50000) {
      priority = 'medium';
    } else {
      priority = 'low';
    }

    // If unemployed or has many dependents, increase priority
    if (financialSituation.employmentStatus === 'unemployed' || financialSituation.dependents > 3) {
      priority = priority === 'low' ? 'medium' : 'high';
    }

    // Create financial aid request
    const aidRequest = new FinancialAidRequest({
      client: req.user.id,
      clientName: client.fullName,
      clientEmail: client.email,
      requestType,
      servicePackage: servicePackageId,
      individualService: individualServiceId,
      caseId,
      requestedAmount,
      originalAmount,
      aidType,
      reason,
      financialSituation,
      supportingDocuments,
      priority,
      status: 'pending'
    });

    await aidRequest.save();
    
    console.log('✅ Financial aid request created:', aidRequest.requestId);

    // Populate the response data
    const populatedRequest = await FinancialAidRequest.findById(aidRequest._id)
      .populate('servicePackage')
      .populate('individualService')
      .populate('caseId');

    res.json({
      success: true,
      message: 'Financial aid request submitted successfully',
      aidRequest: populatedRequest,
      requestId: aidRequest.requestId
    });

  } catch (error) {
    console.error('❌ Error submitting financial aid request:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting financial aid request',
      error: error.message
    });
  }
};

// Get client's financial aid requests
const getClientAidRequests = async (req, res) => {
  try {
    console.log('📋 Fetching client aid requests for:', req.user.id);

    const { status, page = 1, limit = 10 } = req.query;

    let query = { client: req.user.id };
    if (status && status !== 'all') {
      query.status = status;
    }

    const totalRequests = await FinancialAidRequest.countDocuments(query);

    const aidRequests = await FinancialAidRequest.find(query)
      .populate('servicePackage')
      .populate('individualService')
      .populate('caseId')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Calculate statistics
    const stats = {
      total: await FinancialAidRequest.countDocuments({ client: req.user.id }),
      pending: await FinancialAidRequest.countDocuments({ client: req.user.id, status: 'pending' }),
      approved: await FinancialAidRequest.countDocuments({ client: req.user.id, status: 'approved' }),
      rejected: await FinancialAidRequest.countDocuments({ client: req.user.id, status: 'rejected' }),
      underReview: await FinancialAidRequest.countDocuments({ client: req.user.id, status: 'under_review' })
    };

    res.json({
      success: true,
      data: {
        aidRequests,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalRequests / limit),
          totalItems: totalRequests,
          itemsPerPage: parseInt(limit)
        },
        stats
      }
    });

  } catch (error) {
    console.error('❌ Error fetching client aid requests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching aid requests',
      error: error.message
    });
  }
};

// Get single aid request details
const getAidRequestDetails = async (req, res) => {
  try {
    const { requestId } = req.params;
    console.log('🔍 Fetching aid request details:', requestId);

    const aidRequest = await FinancialAidRequest.findOne({
      $or: [
        { _id: requestId },
        { requestId: requestId }
      ],
      client: req.user.id
    })
      .populate('servicePackage')
      .populate('individualService')
      .populate('caseId')
      .populate('reviewedBy', 'name email');

    if (!aidRequest) {
      return res.status(404).json({
        success: false,
        message: 'Financial aid request not found'
      });
    }

    res.json({
      success: true,
      aidRequest
    });

  } catch (error) {
    console.error('❌ Error fetching aid request details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching aid request details',
      error: error.message
    });
  }
};

// Update aid request (for client to provide additional info)
const updateAidRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { additionalInfo, supportingDocuments } = req.body;

    console.log('📝 Updating aid request:', requestId);

    const aidRequest = await FinancialAidRequest.findOne({
      $or: [
        { _id: requestId },
        { requestId: requestId }
      ],
      client: req.user.id
    });

    if (!aidRequest) {
      return res.status(404).json({
        success: false,
        message: 'Financial aid request not found'
      });
    }

    // Only allow updates if status allows it
    if (!['pending', 'requires_more_info'].includes(aidRequest.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update request in current status'
      });
    }

    // Update fields
    if (additionalInfo) {
      aidRequest.financialSituation.additionalInfo = additionalInfo;
    }

    if (supportingDocuments && supportingDocuments.length > 0) {
      aidRequest.supportingDocuments.push(...supportingDocuments);
    }

    // Change status back to pending if it was requiring more info
    if (aidRequest.status === 'requires_more_info') {
      aidRequest.status = 'pending';
    }

    await aidRequest.save();

    const updatedRequest = await FinancialAidRequest.findById(aidRequest._id)
      .populate('servicePackage')
      .populate('individualService')
      .populate('caseId');

    res.json({
      success: true,
      message: 'Aid request updated successfully',
      aidRequest: updatedRequest
    });

  } catch (error) {
    console.error('❌ Error updating aid request:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating aid request',
      error: error.message
    });
  }
};

// Cancel aid request
const cancelAidRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    console.log('❌ Cancelling aid request:', requestId);

    const aidRequest = await FinancialAidRequest.findOne({
      $or: [
        { _id: requestId },
        { requestId: requestId }
      ],
      client: req.user.id
    });

    if (!aidRequest) {
      return res.status(404).json({
        success: false,
        message: 'Financial aid request not found'
      });
    }

    // Only allow cancellation if status allows it
    if (!['pending', 'under_review', 'requires_more_info'].includes(aidRequest.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel request in current status'
      });
    }

    await FinancialAidRequest.findByIdAndDelete(aidRequest._id);

    res.json({
      success: true,
      message: 'Financial aid request cancelled successfully'
    });

  } catch (error) {
    console.error('❌ Error cancelling aid request:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling aid request',
      error: error.message
    });
  }
};

module.exports = {
  submitFinancialAidRequest,
  getClientAidRequests,
  getAidRequestDetails,
  updateAidRequest,
  cancelAidRequest
};
