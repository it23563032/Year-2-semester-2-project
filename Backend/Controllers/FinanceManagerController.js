const ServiceRequest = require('../Model/ServiceRequest');
const PaymentTransaction = require('../Model/PaymentTransaction');
const ServicePackage = require('../Model/ServicePackage');
const UserModel = require('../Model/UserModel');
const IndividualService = require('../Model/IndividualService');
const IndividualServiceRequest = require('../Model/IndividualServiceRequest');
const FinancialAidRequest = require('../Model/FinancialAidRequest');

// Get all service requests for finance manager
const getAllServiceRequests = async (req, res) => {
  try {
    console.log('🔍 Fetching all service requests for finance manager...');
    
    const { status, type, page = 1, limit = 10 } = req.query;
    
    // Build query
    let query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Filter by type if specified
    if (type === 'package') {
      // Only get package service requests (ServiceRequest model)
      console.log('📦 Filtering for package requests only');
    }
    
    // Get total count
    const totalRequests = await ServiceRequest.countDocuments(query);
    
    // Get paginated requests
    const serviceRequests = await ServiceRequest.find(query)
      .populate('client', 'fullName email userType')
      .populate('servicePackage')
      .populate('paymentTransaction')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    // Get statistics
    const stats = {
      total: await ServiceRequest.countDocuments(),
      processing: await ServiceRequest.countDocuments({ status: 'processing' }),
      approved: await ServiceRequest.countDocuments({ status: 'approved' }),
      rejected: await ServiceRequest.countDocuments({ status: 'rejected' }),
      active: await ServiceRequest.countDocuments({ status: 'active' }),
      totalRevenue: await PaymentTransaction.aggregate([
        { $match: { paymentStatus: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).then(result => result[0]?.total || 0)
    };
    
    console.log(`Found ${serviceRequests.length} service requests`);
    
    res.json({
      success: true,
      data: {
        serviceRequests,
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
    console.error('❌ Error fetching service requests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching service requests',
      error: error.message
    });
  }
};

// Approve service request
const approveServiceRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { approvalNotes } = req.body;
    
    console.log('✅ Approving service request:', requestId);
    console.log('Finance manager ID:', req.user.id);
    
    const serviceRequest = await ServiceRequest.findById(requestId)
      .populate('servicePackage');
    
    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }
    
    if (serviceRequest.status !== 'processing') {
      return res.status(400).json({
        success: false,
        message: 'Only processing requests can be approved'
      });
    }
    
    // Update service request
    serviceRequest.status = 'approved';
    serviceRequest.approvedDate = new Date();
    serviceRequest.approvedBy = req.user.id;
    serviceRequest.approvalNotes = approvalNotes;
    
    // Set expiry date (1 month from approval for monthly packages)
    const expiryDate = new Date();
    if (serviceRequest.servicePackage.duration === 'monthly') {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    } else if (serviceRequest.servicePackage.duration === 'yearly') {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    }
    serviceRequest.expiryDate = expiryDate;
    
    await serviceRequest.save();
    
    // Update payment transaction status to completed
    if (serviceRequest.paymentTransaction) {
      const paymentTransaction = await PaymentTransaction.findById(serviceRequest.paymentTransaction);
      if (paymentTransaction) {
        paymentTransaction.paymentStatus = 'completed';
        paymentTransaction.updatedAt = new Date();
        await paymentTransaction.save();
        console.log('✅ Payment transaction status updated to completed');
      }
    }
    
    // TODO: Send notification to client about approval
    
    console.log('✅ Service request approved successfully');
    
    res.json({
      success: true,
      message: 'Service request approved successfully',
      serviceRequest: await ServiceRequest.findById(requestId)
        .populate('client', 'name email')
        .populate('servicePackage')
        .populate('approvedBy', 'name email')
    });
    
  } catch (error) {
    console.error('❌ Error approving service request:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving service request',
      error: error.message
    });
  }
};

// Reject service request
const rejectServiceRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { rejectionReason } = req.body;
    
    console.log('❌ Rejecting service request:', requestId);
    console.log('Finance manager ID:', req.user.id);
    
    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }
    
    const serviceRequest = await ServiceRequest.findById(requestId);
    
    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }
    
    if (serviceRequest.status !== 'processing') {
      return res.status(400).json({
        success: false,
        message: 'Only processing requests can be rejected'
      });
    }
    
    // Update service request
    serviceRequest.status = 'rejected';
    serviceRequest.rejectedDate = new Date();
    serviceRequest.rejectedBy = req.user.id;
    serviceRequest.rejectionReason = rejectionReason;
    
    await serviceRequest.save();
    
    // TODO: Process refund if needed
    // TODO: Send notification to client about rejection
    
    console.log('❌ Service request rejected successfully');
    
    res.json({
      success: true,
      message: 'Service request rejected successfully',
      serviceRequest: await ServiceRequest.findById(requestId)
        .populate('client', 'name email')
        .populate('servicePackage')
        .populate('rejectedBy', 'name email')
    });
    
  } catch (error) {
    console.error('❌ Error rejecting service request:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting service request',
      error: error.message
    });
  }
};

// Get finance dashboard statistics
const getFinanceDashboard = async (req, res) => {
  try {
    console.log('📊 Fetching finance dashboard statistics...');
    
    const currentMonth = new Date();
    currentMonth.setDate(1);
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    // Get comprehensive statistics
    const stats = {
      // Monthly package requests stats
      serviceRequests: {
        total: await ServiceRequest.countDocuments(),
        processing: await ServiceRequest.countDocuments({ status: 'processing' }),
        approved: await ServiceRequest.countDocuments({ status: 'approved' }),
        rejected: await ServiceRequest.countDocuments({ status: 'rejected' }),
        active: await ServiceRequest.countDocuments({ status: 'active' })
      },
      
      // Individual service requests stats
      individualServiceRequests: {
        total: await IndividualServiceRequest.countDocuments(),
        processing: await IndividualServiceRequest.countDocuments({ status: 'processing' }),
        approved: await IndividualServiceRequest.countDocuments({ status: 'approved' }),
        rejected: await IndividualServiceRequest.countDocuments({ status: 'rejected' }),
        inProgress: await IndividualServiceRequest.countDocuments({ status: 'in_progress' }),
        completed: await IndividualServiceRequest.countDocuments({ status: 'completed' })
      },
      
      // Revenue stats
      revenue: {
        total: await PaymentTransaction.aggregate([
          { $match: { paymentStatus: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]).then(result => result[0]?.total || 0),
        
        thisMonth: await PaymentTransaction.aggregate([
          { 
            $match: { 
              paymentStatus: 'completed',
              createdAt: { $gte: currentMonth, $lt: nextMonth }
            }
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]).then(result => result[0]?.total || 0),
        
        transactions: await PaymentTransaction.countDocuments({ paymentStatus: 'completed' })
      },
      
      // Combined service request summary
      combinedRequests: {
        total: (await ServiceRequest.countDocuments()) + (await IndividualServiceRequest.countDocuments()),
        approved: (await ServiceRequest.countDocuments({ status: 'approved' })) + (await IndividualServiceRequest.countDocuments({ status: 'approved' })),
        processing: (await ServiceRequest.countDocuments({ status: 'processing' })) + (await IndividualServiceRequest.countDocuments({ status: 'processing' })),
        rejected: (await ServiceRequest.countDocuments({ status: 'rejected' })) + (await IndividualServiceRequest.countDocuments({ status: 'rejected' }))
      },
      
      // Package popularity
      packageStats: await ServiceRequest.aggregate([
        { $match: { status: { $in: ['approved', 'active'] } } },
        { $group: { _id: '$packageName', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // Recent activity
      recentRequests: await ServiceRequest.find({ status: 'processing' })
        .populate('client', 'name email')
        .populate('servicePackage')
        .sort({ createdAt: -1 })
        .limit(5)
    };
    
    console.log('📊 Finance dashboard stats generated');
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('❌ Error fetching finance dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching finance dashboard',
      error: error.message
    });
  }
};

// Get payment transactions
const getPaymentTransactions = async (req, res) => {
  try {
    console.log('💳 Fetching payment transactions...');
    
    const { status, page = 1, limit = 10 } = req.query;
    
    let query = {};
    if (status && status !== 'all') {
      query.paymentStatus = status;
    }
    
    const totalTransactions = await PaymentTransaction.countDocuments(query);
    
    const transactions = await PaymentTransaction.find(query)
      .populate({
        path: 'client',
        select: 'fullName email',
        model: 'VerifiedClient'
      })
      .populate('servicePackage')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    console.log(`Found ${transactions.length} payment transactions`);
    
    // Debug: Check if client data is populated correctly
    if (transactions.length > 0) {
      console.log('🔍 Sample transaction client data:');
      transactions.slice(0, 3).forEach((t, index) => {
        console.log(`  Transaction ${index + 1}:`, {
          transactionId: t.transactionId,
          clientId: t.client,
          clientData: t.client,
          hasClientName: !!t.client?.fullName
        });
      });
    }
    
    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalTransactions / limit),
          totalItems: totalTransactions,
          itemsPerPage: parseInt(limit)
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching payment transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment transactions',
      error: error.message
    });
  }
};

// Individual Services Management

// Get all individual services for management
const getAllIndividualServices = async (req, res) => {
  try {
    const { category, page = 1, limit = 10 } = req.query;
    
    let query = {};
    if (category && category !== 'all') {
      query.category = category;
    }
    
    const totalServices = await IndividualService.countDocuments(query);
    
    const services = await IndividualService.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    res.json({
      success: true,
      data: {
        services,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalServices / limit),
          totalItems: totalServices,
          itemsPerPage: parseInt(limit)
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching individual services:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching individual services',
      error: error.message
    });
  }
};

// Create new individual service
const createIndividualService = async (req, res) => {
  try {
    const serviceData = {
      ...req.body,
      createdBy: req.user.id
    };
    
    const newService = new IndividualService(serviceData);
    await newService.save();
    
    res.json({
      success: true,
      message: 'Individual service created successfully',
      service: newService
    });
    
  } catch (error) {
    console.error('❌ Error creating individual service:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating individual service',
      error: error.message
    });
  }
};

// Update individual service
const updateIndividualService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    
    const updatedService = await IndividualService.findByIdAndUpdate(
      serviceId,
      req.body,
      { new: true }
    );
    
    if (!updatedService) {
      return res.status(404).json({
        success: false,
        message: 'Individual service not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Individual service updated successfully',
      service: updatedService
    });
    
  } catch (error) {
    console.error('❌ Error updating individual service:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating individual service',
      error: error.message
    });
  }
};

// Delete individual service
const deleteIndividualService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    
    const deletedService = await IndividualService.findByIdAndDelete(serviceId);
    
    if (!deletedService) {
      return res.status(404).json({
        success: false,
        message: 'Individual service not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Individual service deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Error deleting individual service:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting individual service',
      error: error.message
    });
  }
};

// Get all individual service requests
const getAllIndividualServiceRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const totalRequests = await IndividualServiceRequest.countDocuments(query);
    
    const requests = await IndividualServiceRequest.find(query)
      .populate('client', 'fullName email')
      .populate('individualService')
      .populate('paymentTransaction')
      .populate('assignedLawyer', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalRequests / limit),
          totalItems: totalRequests,
          itemsPerPage: parseInt(limit)
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching individual service requests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching individual service requests',
      error: error.message
    });
  }
};

// Approve individual service request
const approveIndividualServiceRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { approvalNotes, assignedLawyer } = req.body;
    
    const serviceRequest = await IndividualServiceRequest.findById(requestId);
    
    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Individual service request not found'
      });
    }
    
    serviceRequest.status = 'approved';
    serviceRequest.approvedDate = new Date();
    serviceRequest.approvedBy = req.user.id;
    serviceRequest.approvalNotes = approvalNotes;
    
    if (assignedLawyer) {
      serviceRequest.assignedLawyer = assignedLawyer;
    }
    
    await serviceRequest.save();
    
    // Update the associated payment transaction status to completed
    if (serviceRequest.paymentTransaction) {
      await PaymentTransaction.findByIdAndUpdate(
        serviceRequest.paymentTransaction,
        { 
          paymentStatus: 'completed',
          completedAt: new Date()
        }
      );
      console.log('✅ Updated payment transaction status to completed');
    }
    
    res.json({
      success: true,
      message: 'Individual service request approved successfully',
      serviceRequest: await IndividualServiceRequest.findById(requestId)
        .populate('client', 'fullName email')
        .populate('individualService')
        .populate('assignedLawyer', 'name email')
    });
    
  } catch (error) {
    console.error('❌ Error approving individual service request:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving individual service request',
      error: error.message
    });
  }
};

// Reject individual service request
const rejectIndividualServiceRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { rejectionReason } = req.body;
    
    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }
    
    const serviceRequest = await IndividualServiceRequest.findById(requestId);
    
    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Individual service request not found'
      });
    }
    
    serviceRequest.status = 'rejected';
    serviceRequest.rejectedDate = new Date();
    serviceRequest.rejectedBy = req.user.id;
    serviceRequest.rejectionReason = rejectionReason;
    
    await serviceRequest.save();
    
    // Update the associated payment transaction status to failed
    if (serviceRequest.paymentTransaction) {
      await PaymentTransaction.findByIdAndUpdate(
        serviceRequest.paymentTransaction,
        { 
          paymentStatus: 'failed',
          failedAt: new Date(),
          failureReason: rejectionReason
        }
      );
      console.log('❌ Updated payment transaction status to failed');
    }
    
    res.json({
      success: true,
      message: 'Individual service request rejected successfully',
      serviceRequest: await IndividualServiceRequest.findById(requestId)
        .populate('client', 'fullName email')
        .populate('individualService')
    });
    
  } catch (error) {
    console.error('❌ Error rejecting individual service request:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting individual service request',
      error: error.message
    });
  }
};


// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    console.log('📊 Fetching dashboard stats for finance manager...');
    
    // Calculate revenue statistics
    const totalRevenue = await PaymentTransaction.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).then(result => result[0]?.total || 0);

    const lastMonthRevenue = await PaymentTransaction.aggregate([
      { 
        $match: { 
          paymentStatus: 'completed',
          createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
            $lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).then(result => result[0]?.total || 0);

    const thisMonthRevenue = await PaymentTransaction.aggregate([
      { 
        $match: { 
          paymentStatus: 'completed',
          createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).then(result => result[0]?.total || 0);

    const revenueGrowth = lastMonthRevenue > 0 
      ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : 0;

    // Service request statistics
    const totalServiceRequests = await ServiceRequest.countDocuments();
    const pendingRequests = await ServiceRequest.countDocuments({ status: 'processing' });

    // Transaction statistics
    const totalTransactions = await PaymentTransaction.countDocuments();
    const todayTransactions = await PaymentTransaction.countDocuments({
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999))
      }
    });

    // Client statistics (assuming VerifiedClient model exists)
    const VerifiedClient = require('../Model/VerifiedClient');
    const activeClients = await VerifiedClient.countDocuments();
    const newClients = await VerifiedClient.countDocuments({
      createdAt: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      }
    });

    const stats = {
      totalRevenue,
      revenueGrowth,
      totalServiceRequests,
      pendingRequests,
      totalTransactions,
      todayTransactions,
      activeClients,
      newClients
    };

    console.log('📊 Dashboard stats calculated:', stats);

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
};

// Get financial report data
const getFinancialReport = async (req, res) => {
  try {
    console.log('📈 Fetching financial report...');
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    // Monthly revenue
    const monthlyRevenue = await PaymentTransaction.aggregate([
      { 
        $match: { 
          paymentStatus: 'completed',
          createdAt: {
            $gte: new Date(currentYear, currentMonth, 1),
            $lt: new Date(currentYear, currentMonth + 1, 1)
          }
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).then(result => result[0]?.total || 0);

    // Yearly revenue
    const yearlyRevenue = await PaymentTransaction.aggregate([
      { 
        $match: { 
          paymentStatus: 'completed',
          createdAt: {
            $gte: new Date(currentYear, 0, 1),
            $lt: new Date(currentYear + 1, 0, 1)
          }
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).then(result => result[0]?.total || 0);

    const reportData = {
      monthlyRevenue,
      yearlyRevenue,
      generatedAt: new Date()
    };

    res.json({
      success: true,
      data: reportData
    });

  } catch (error) {
    console.error('❌ Error fetching financial report:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching financial report',
      error: error.message
    });
  }
};

// Get budget data
const getBudgetData = async (req, res) => {
  try {
    console.log('💰 Fetching budget data...');
    
    // For now, return placeholder data
    const budgetData = {
      totalBudget: 1000000,
      usedBudget: 750000,
      remainingBudget: 250000,
      lastUpdated: new Date()
    };

    res.json({
      success: true,
      data: budgetData
    });

  } catch (error) {
    console.error('❌ Error fetching budget data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching budget data',
      error: error.message
    });
  }
};

// Financial Aid Management Functions

// Get all financial aid requests
const getAllFinancialAidRequests = async (req, res) => {
  try {
    console.log('🔍 Fetching all financial aid requests...');
    
    const { status, requestType, priority, page = 1, limit = 10 } = req.query;
    
    // Build query
    let query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    if (requestType && requestType !== 'all') {
      query.requestType = requestType;
    }
    if (priority && priority !== 'all') {
      query.priority = priority;
    }
    
    // Get total count
    const totalRequests = await FinancialAidRequest.countDocuments(query);
    
    // Get paginated requests
    const aidRequests = await FinancialAidRequest.find(query)
      .populate('client', 'fullName email')
      .populate('servicePackage')
      .populate('individualService')
      .populate('caseId')
      .populate('reviewedBy', 'name email')
      .sort({ priority: 1, createdAt: -1 }) // High priority first, then newest
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    // Get statistics
    const stats = {
      total: await FinancialAidRequest.countDocuments(),
      pending: await FinancialAidRequest.countDocuments({ status: 'pending' }),
      underReview: await FinancialAidRequest.countDocuments({ status: 'under_review' }),
      approved: await FinancialAidRequest.countDocuments({ status: 'approved' }),
      rejected: await FinancialAidRequest.countDocuments({ status: 'rejected' }),
      requiresMoreInfo: await FinancialAidRequest.countDocuments({ status: 'requires_more_info' }),
      byPriority: {
        urgent: await FinancialAidRequest.countDocuments({ priority: 'urgent', status: { $in: ['pending', 'under_review'] } }),
        high: await FinancialAidRequest.countDocuments({ priority: 'high', status: { $in: ['pending', 'under_review'] } }),
        medium: await FinancialAidRequest.countDocuments({ priority: 'medium', status: { $in: ['pending', 'under_review'] } }),
        low: await FinancialAidRequest.countDocuments({ priority: 'low', status: { $in: ['pending', 'under_review'] } })
      },
      byType: {
        monthly_package: await FinancialAidRequest.countDocuments({ requestType: 'monthly_package' }),
        individual_service: await FinancialAidRequest.countDocuments({ requestType: 'individual_service' }),
        case_filing: await FinancialAidRequest.countDocuments({ requestType: 'case_filing' })
      }
    };
    
    console.log(`Found ${aidRequests.length} financial aid requests`);
    
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
    console.error('❌ Error fetching financial aid requests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching financial aid requests',
      error: error.message
    });
  }
};

// Approve financial aid request
const approveFinancialAidRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { 
      approvedAmount, 
      approvedDiscountPercentage, 
      paymentPlan, 
      conditions = [], 
      validUntil, 
      reviewNotes 
    } = req.body;
    
    console.log('✅ Approving financial aid request:', requestId);
    console.log('Finance manager ID:', req.user.id);
    
    const aidRequest = await FinancialAidRequest.findById(requestId)
      .populate('servicePackage')
      .populate('individualService')
      .populate('client');
    
    if (!aidRequest) {
      return res.status(404).json({
        success: false,
        message: 'Financial aid request not found'
      });
    }
    
    if (!['pending', 'under_review', 'requires_more_info'].includes(aidRequest.status)) {
      return res.status(400).json({
        success: false,
        message: 'Only pending or under review requests can be approved'
      });
    }
    
    // Update aid request
    aidRequest.status = 'approved';
    aidRequest.reviewedBy = req.user.id;
    aidRequest.reviewDate = new Date();
    aidRequest.reviewNotes = reviewNotes;
    
    // Set approval details
    aidRequest.approvalDetails = {
      approvedAmount: approvedAmount || aidRequest.requestedAmount,
      approvedDiscountPercentage: approvedDiscountPercentage || aidRequest.discountPercentage,
      paymentPlan,
      conditions,
      validUntil: validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days default
    };
    
    await aidRequest.save();
    
    console.log('✅ Financial aid request approved successfully');
    
    res.json({
      success: true,
      message: 'Financial aid request approved successfully',
      aidRequest: await FinancialAidRequest.findById(requestId)
        .populate('client', 'fullName email')
        .populate('servicePackage')
        .populate('individualService')
        .populate('reviewedBy', 'name email')
    });
    
  } catch (error) {
    console.error('❌ Error approving financial aid request:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving financial aid request',
      error: error.message
    });
  }
};

// Reject financial aid request
const rejectFinancialAidRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { rejectionReason, reviewNotes } = req.body;
    
    console.log('❌ Rejecting financial aid request:', requestId);
    console.log('Finance manager ID:', req.user.id);
    
    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }
    
    const aidRequest = await FinancialAidRequest.findById(requestId);
    
    if (!aidRequest) {
      return res.status(404).json({
        success: false,
        message: 'Financial aid request not found'
      });
    }
    
    if (!['pending', 'under_review', 'requires_more_info'].includes(aidRequest.status)) {
      return res.status(400).json({
        success: false,
        message: 'Only pending or under review requests can be rejected'
      });
    }
    
    // Update aid request
    aidRequest.status = 'rejected';
    aidRequest.reviewedBy = req.user.id;
    aidRequest.reviewDate = new Date();
    aidRequest.rejectionReason = rejectionReason;
    aidRequest.reviewNotes = reviewNotes;
    
    await aidRequest.save();
    
    console.log('❌ Financial aid request rejected successfully');
    
    res.json({
      success: true,
      message: 'Financial aid request rejected successfully',
      aidRequest: await FinancialAidRequest.findById(requestId)
        .populate('client', 'fullName email')
        .populate('servicePackage')
        .populate('individualService')
        .populate('reviewedBy', 'name email')
    });
    
  } catch (error) {
    console.error('❌ Error rejecting financial aid request:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting financial aid request',
      error: error.message
    });
  }
};

// Request more information
const requestMoreInfoForAidRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { message, requiredDocuments = [], reviewNotes } = req.body;
    
    console.log('📋 Requesting more info for aid request:', requestId);
    
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required when requesting more information'
      });
    }
    
    const aidRequest = await FinancialAidRequest.findById(requestId);
    
    if (!aidRequest) {
      return res.status(404).json({
        success: false,
        message: 'Financial aid request not found'
      });
    }
    
    if (!['pending', 'under_review'].includes(aidRequest.status)) {
      return res.status(400).json({
        success: false,
        message: 'Can only request more info for pending or under review requests'
      });
    }
    
    // Update aid request
    aidRequest.status = 'requires_more_info';
    aidRequest.reviewedBy = req.user.id;
    aidRequest.reviewDate = new Date();
    aidRequest.reviewNotes = reviewNotes;
    aidRequest.adminResponse = {
      message,
      responseDate: new Date(),
      requiresDocuments: requiredDocuments
    };
    aidRequest.followUpRequired = true;
    aidRequest.followUpDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days follow-up
    
    await aidRequest.save();
    
    console.log('📋 More information requested successfully');
    
    res.json({
      success: true,
      message: 'Additional information requested successfully',
      aidRequest: await FinancialAidRequest.findById(requestId)
        .populate('client', 'fullName email')
        .populate('servicePackage')
        .populate('individualService')
        .populate('reviewedBy', 'name email')
    });
    
  } catch (error) {
    console.error('❌ Error requesting more info:', error);
    res.status(500).json({
      success: false,
      message: 'Error requesting more information',
      error: error.message
    });
  }
};

// Update aid request status (for workflow management)
const updateAidRequestStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, reviewNotes } = req.body;
    
    console.log('📝 Updating aid request status:', requestId, 'to', status);
    
    const validStatuses = ['pending', 'under_review', 'approved', 'rejected', 'requires_more_info'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    const aidRequest = await FinancialAidRequest.findById(requestId);
    
    if (!aidRequest) {
      return res.status(404).json({
        success: false,
        message: 'Financial aid request not found'
      });
    }
    
    aidRequest.status = status;
    aidRequest.reviewedBy = req.user.id;
    aidRequest.reviewDate = new Date();
    if (reviewNotes) {
      aidRequest.reviewNotes = reviewNotes;
    }
    
    await aidRequest.save();
    
    res.json({
      success: true,
      message: 'Aid request status updated successfully',
      aidRequest: await FinancialAidRequest.findById(requestId)
        .populate('client', 'fullName email')
        .populate('servicePackage')
        .populate('individualService')
        .populate('reviewedBy', 'name email')
    });
    
  } catch (error) {
    console.error('❌ Error updating aid request status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating aid request status',
      error: error.message
    });
  }
};

module.exports = {
  getAllServiceRequests,
  approveServiceRequest,
  rejectServiceRequest,
  getFinanceDashboard,
  getPaymentTransactions,
  getAllIndividualServices,
  createIndividualService,
  updateIndividualService,
  deleteIndividualService,
  getAllIndividualServiceRequests,
  approveIndividualServiceRequest,
  rejectIndividualServiceRequest,
  getDashboardStats,
  getFinancialReport,
  getBudgetData,
  // Financial Aid Functions
  getAllFinancialAidRequests,
  approveFinancialAidRequest,
  rejectFinancialAidRequest,
  requestMoreInfoForAidRequest,
  updateAidRequestStatus
};
