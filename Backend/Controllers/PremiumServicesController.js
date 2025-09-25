const ServicePackage = require('../Model/ServicePackage');
const PaymentTransaction = require('../Model/PaymentTransaction');
const ServiceRequest = require('../Model/ServiceRequest');
const VerifiedClient = require('../Model/VerifiedClient');
const IndividualService = require('../Model/IndividualService');
const IndividualServiceRequest = require('../Model/IndividualServiceRequest');

// Get all available service packages
const getServicePackages = async (req, res) => {
  try {
    console.log('🔍 Fetching service packages...');
    
    const packages = await ServicePackage.find({ isActive: true })
      .sort({ price: 1 });
    
    console.log(`Found ${packages.length} active packages`);
    
    res.json({
      success: true,
      packages
    });
  } catch (error) {
    console.error('❌ Error fetching service packages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching service packages',
      error: error.message
    });
  }
};

// Process payment for premium service
const processPayment = async (req, res) => {
  try {
    console.log('💳 Processing payment...');
    console.log('Client ID:', req.user.id);
    console.log('User Type:', req.user.userType);
    
    const { packageId, paymentDetails, billingInfo } = req.body;
    
    // Validate required fields
    if (!packageId) {
      return res.status(400).json({
        success: false,
        message: 'Package ID is required'
      });
    }
    
    if (!paymentDetails || !paymentDetails.cardNumber || !paymentDetails.expiryDate || !paymentDetails.cvv) {
      return res.status(400).json({
        success: false,
        message: 'Complete payment details are required'
      });
    }
    
    if (!billingInfo || !billingInfo.fullName || !billingInfo.email) {
      return res.status(400).json({
        success: false,
        message: 'Complete billing information is required'
      });
    }
    
    // Get service package
    console.log('🔍 Looking up service package...');
    const servicePackage = await ServicePackage.findById(packageId);
    if (!servicePackage) {
      return res.status(404).json({
        success: false,
        message: 'Service package not found'
      });
    }
    console.log('✅ Found package:', servicePackage.name);
    
    // Get client details - using VerifiedClient model only
    console.log('🔍 Looking up client data...');
    console.log('🔍 User ID from token:', req.user.id);
    console.log('🔍 User type from token:', req.user.userType);
    
    let clientData = null;
    
    try {
      // Use only VerifiedClient model as specified
      clientData = await VerifiedClient.findById(req.user.id);
      console.log('VerifiedClient lookup result:', clientData ? 'Found' : 'Not found');
      
      if (clientData) {
        console.log('✅ Found verified client:', clientData.fullName);
      }
    } catch (clientError) {
      console.log('❌ Error looking up client:', clientError.message);
      console.log('❌ Error stack:', clientError.stack);
    }
    
    if (!clientData) {
      console.log('❌ Client not found in VerifiedClient collection. User ID:', req.user.id);
      console.log('❌ Make sure the user is a verified client and properly authenticated');
      return res.status(404).json({
        success: false,
        message: 'Verified client not found. Please ensure you are logged in as a verified client.'
      });
    }
    
    // Simulate payment processing
    console.log('🔄 Processing payment...');
    const paymentResult = {
      success: true,
      gatewayTransactionId: 'GTW-' + Date.now(),
      processingFee: Math.round(servicePackage.price * 0.025),
      processedAt: new Date()
    };
    
    // Create payment transaction
    console.log('📝 Creating payment transaction...');
    const transactionId = 'TXN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const receiptNumber = 'RCP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    
    console.log('🔍 Creating transaction with client ID:', req.user.id);
    console.log('🔍 Client user type:', req.user.userType);
    console.log('🔍 Collection:', req.collection);

    const paymentTransaction = new PaymentTransaction({
      transactionId: transactionId,
      receiptNumber: receiptNumber,
      client: req.user.id,
      servicePackage: packageId,
      serviceType: 'ServicePackage', // Specify this is for service package
      amount: servicePackage.price,
      currency: 'LKR',
      paymentMethod: 'card',
      cardDetails: {
        last4Digits: paymentDetails.cardNumber.slice(-4),
        cardType: detectCardType(paymentDetails.cardNumber),
        expiryMonth: paymentDetails.expiryDate.split('/')[0],
        expiryYear: paymentDetails.expiryDate.split('/')[1]
      },
      paymentStatus: 'completed',
      paymentGatewayResponse: paymentResult,
      receiptGenerated: true,
      receiptData: {
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          description: `${servicePackage.name} Package - ${servicePackage.description}`,
          amount: servicePackage.price
        }],
        tax: Math.round(servicePackage.price * 0.15),
        totalAmount: servicePackage.price + Math.round(servicePackage.price * 0.15)
      }
    });
    
    await paymentTransaction.save();
    console.log('✅ Payment transaction saved:', paymentTransaction.transactionId);
    
    // Create service request
    console.log('📋 Creating service request...');
    const requestId = 'SRV-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    
    const serviceRequest = new ServiceRequest({
      requestId: requestId,
      client: req.user.id,
      clientName: clientData.fullName,
      clientEmail: clientData.email,
      servicePackage: packageId,
      packageName: servicePackage.name,
      amount: servicePackage.price,
      paymentTransaction: paymentTransaction._id,
      status: 'processing',
      serviceFeatures: servicePackage.features
    });
    
    await serviceRequest.save();
    console.log('✅ Service request saved:', serviceRequest.requestId);
    
    res.json({
      success: true,
      message: 'Payment processed successfully',
      transactionId: paymentTransaction.transactionId,
      receiptNumber: paymentTransaction.receiptNumber,
      serviceRequestId: serviceRequest.requestId,
      receipt: paymentTransaction.receiptData
    });
    
  } catch (error) {
    console.error('❌ Error processing payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing payment',
      error: error.message
    });
  }
};

// Get client's service requests and active services
const getClientServices = async (req, res) => {
  try {
    console.log('🔍 Fetching client services...');
    console.log('Client ID:', req.user.id);
    
    // Get all service requests for this client
    const serviceRequests = await ServiceRequest.find({ client: req.user.id })
      .populate('servicePackage')
      .populate('paymentTransaction')
      .sort({ createdAt: -1 });
    
    // Get active services
    const activeServices = serviceRequests.filter(req => req.status === 'active' || req.status === 'approved');
    
    // Get pending requests
    const pendingRequests = serviceRequests.filter(req => req.status === 'processing');
    
    // Get payment history
    const paymentHistory = await PaymentTransaction.find({ client: req.user.id })
      .populate('servicePackage')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${serviceRequests.length} service requests, ${activeServices.length} active services`);
    
    res.json({
      success: true,
      data: {
        allRequests: serviceRequests,
        activeServices,
        pendingRequests,
        paymentHistory,
        stats: {
          totalRequests: serviceRequests.length,
          activeServices: activeServices.length,
          pendingRequests: pendingRequests.length,
          totalSpent: paymentHistory
            .filter(p => p.paymentStatus === 'completed')
            .reduce((sum, p) => sum + p.amount, 0)
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching client services:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching client services',
      error: error.message
    });
  }
};

// Get receipt details
const getReceipt = async (req, res) => {
  try {
    const { receiptNumber } = req.params;
    
    console.log('🧾 Fetching receipt:', receiptNumber);
    
    const transaction = await PaymentTransaction.findOne({ 
      receiptNumber,
      client: req.user.id 
    }).populate('servicePackage');
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }
    
    res.json({
      success: true,
      receipt: {
        receiptNumber: transaction.receiptNumber,
        transactionId: transaction.transactionId,
        issueDate: transaction.receiptData.issueDate,
        clientInfo: {
          name: req.user.name || req.user.fullName,
          email: req.user.email
        },
        packageInfo: {
          name: transaction.servicePackage.name,
          description: transaction.servicePackage.description,
          amount: transaction.amount
        },
        paymentInfo: {
          method: transaction.paymentMethod,
          cardLast4: transaction.cardDetails.last4Digits,
          status: transaction.paymentStatus
        },
        receiptData: transaction.receiptData
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching receipt',
      error: error.message
    });
  }
};

// Helper function to detect card type
const detectCardType = (cardNumber) => {
  const firstDigit = cardNumber.charAt(0);
  const firstTwo = cardNumber.substring(0, 2);
  
  if (firstDigit === '4') return 'Visa';
  if (firstTwo >= '51' && firstTwo <= '55') return 'Mastercard';
  if (firstTwo === '34' || firstTwo === '37') return 'American Express';
  if (firstTwo === '60' || firstTwo === '62' || firstTwo === '64' || firstTwo === '65') return 'Discover';
  return 'Unknown';
};

// Get all available individual services
const getIndividualServices = async (req, res) => {
  try {
    console.log('🔍 Fetching individual services...');
    
    const { category } = req.query;
    let query = { isActive: true };
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    const services = await IndividualService.find(query)
      .sort({ isPopular: -1, price: 1 });
    
    // Group services by category
    const groupedServices = {
      consultation: services.filter(s => s.category === 'consultation'),
      documents: services.filter(s => s.category === 'documents'),
      representation: services.filter(s => s.category === 'representation')
    };
    
    console.log(`Found ${services.length} active individual services`);
    
    res.json({
      success: true,
      services: groupedServices,
      totalServices: services.length
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

// Process payment for individual service
const processIndividualServicePayment = async (req, res) => {
  try {
    console.log('💳 Processing individual service payment...');
    console.log('🔍 Authentication Debug:');
    console.log('  - User ID:', req.user?.id || req.user?._id);
    console.log('  - User Type:', req.user?.userType || req.userType);
    console.log('  - Collection:', req.collection);
    console.log('  - User object keys:', req.user ? Object.keys(req.user) : 'No user object');
    
    const { serviceId, paymentDetails, billingInfo, clientRequirements } = req.body;
    
    // Validate required fields
    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: 'Service ID is required'
      });
    }
    
    if (!paymentDetails || !paymentDetails.cardNumber || !paymentDetails.expiryDate || !paymentDetails.cvv) {
      return res.status(400).json({
        success: false,
        message: 'Complete payment details are required'
      });
    }
    
    if (!billingInfo || !billingInfo.fullName || !billingInfo.email) {
      return res.status(400).json({
        success: false,
        message: 'Complete billing information is required'
      });
    }
    
    // Get individual service
    console.log('🔍 Looking up individual service:', serviceId);
    const individualService = await IndividualService.findById(serviceId);
    if (!individualService) {
      console.log('❌ Individual service not found');
      return res.status(404).json({
        success: false,
        message: 'Individual service not found'
      });
    }
    console.log('✅ Found individual service:', individualService.name);
    
    // Get client details - use proper user ID
    const userId = req.user?.id || req.user?._id;
    console.log('🔍 Looking up client data with ID:', userId);
    console.log('🔍 User collection:', req.collection);
    
    let clientData = null;
    
    try {
      // Use VerifiedClient model as the system is designed for
      clientData = await VerifiedClient.findById(userId);
      console.log('VerifiedClient lookup result:', clientData ? 'Found' : 'Not found');
      
      if (clientData) {
        console.log('✅ Found verified client:', clientData.fullName);
      } else {
        console.log('❌ Client not found in VerifiedClient collection');
        console.log('🔍 This suggests the user is not properly authenticated as a verified client');
      }
    } catch (clientError) {
      console.log('❌ Error looking up client:', clientError.message);
    }
    
    if (!clientData) {
      console.log('❌ Client not found. Authentication details:');
      console.log('  - Token user ID:', userId);
      console.log('  - Token user type:', req.user?.userType || req.userType);
      console.log('  - Token collection:', req.collection);
      
      return res.status(404).json({
        success: false,
        message: 'Verified client not found. Please ensure you are logged in as a verified client.',
        debug: {
          userId: userId,
          userType: req.user?.userType || req.userType,
          collection: req.collection,
          suggestion: 'Please log in again with verified client credentials'
        }
      });
    }
    
    // Simulate payment processing
    console.log('🔄 Processing payment for service:', individualService.name);
    console.log('💰 Amount:', individualService.price);
    
    const paymentResult = {
      success: true,
      gatewayTransactionId: 'GTW-' + Date.now(),
      processingFee: Math.round(individualService.price * 0.025),
      processedAt: new Date()
    };
    
    // Create payment transaction
    console.log('📝 Creating payment transaction...');
    const transactionId = 'TXN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const receiptNumber = 'RCP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    
    console.log('🔍 Creating individual service transaction with client ID:', userId);
    console.log('🔍 Client user type:', req.user?.userType);
    console.log('🔍 Collection:', req.collection);

    const paymentTransaction = new PaymentTransaction({
      transactionId: transactionId,
      receiptNumber: receiptNumber,
      client: userId,
      servicePackage: serviceId,
      serviceType: 'IndividualService', // Specify this is for individual service
      amount: individualService.price,
      currency: 'LKR',
      paymentMethod: 'card',
      cardDetails: {
        last4Digits: paymentDetails.cardNumber.slice(-4),
        cardType: detectCardType(paymentDetails.cardNumber),
        expiryMonth: paymentDetails.expiryDate.split('/')[0],
        expiryYear: paymentDetails.expiryDate.split('/')[1]
      },
      paymentStatus: 'processing',
      paymentGatewayResponse: paymentResult,
      receiptGenerated: true,
      receiptData: {
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          description: `${individualService.name} - ${individualService.description}`,
          amount: individualService.price
        }],
        tax: Math.round(individualService.price * 0.15),
        totalAmount: individualService.price + Math.round(individualService.price * 0.15)
      }
    });
    
    await paymentTransaction.save();
    console.log('✅ Payment transaction saved:', paymentTransaction.transactionId);
    
    // Create individual service request
    console.log('📋 Creating individual service request...');
    const requestId = 'ISR-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    
    const serviceRequest = new IndividualServiceRequest({
      requestId: requestId,
      client: userId,
      clientName: clientData.fullName,
      clientEmail: clientData.email,
      individualService: serviceId,
      serviceName: individualService.name,
      serviceCategory: individualService.category,
      amount: individualService.price,
      paymentTransaction: paymentTransaction._id,
      status: 'processing',
      clientRequirements: clientRequirements || '',
      estimatedCompletion: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)) // 7 days from now
    });
    
    await serviceRequest.save();
    console.log('✅ Individual service request saved:', serviceRequest.requestId);
    
    console.log('🎉 Payment processing completed successfully!');
    console.log('📄 Transaction ID:', paymentTransaction.transactionId);
    console.log('📄 Service Request ID:', serviceRequest.requestId);
    
    const successResponse = {
      success: true,
      message: 'Individual service payment submitted successfully and is being processed',
      transactionId: paymentTransaction.transactionId,
      receiptNumber: paymentTransaction.receiptNumber,
      serviceRequestId: serviceRequest.requestId,
      estimatedCompletion: serviceRequest.estimatedCompletion,
      receipt: paymentTransaction.receiptData,
      status: 'processing',
      timestamp: new Date().toISOString()
    };
    
    console.log('📤 Sending success response to frontend');
    res.status(200).json(successResponse);
    
  } catch (error) {
    console.error('❌ Error processing individual service payment:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Provide more detailed error information
    let errorMessage = 'Error processing individual service payment';
    let statusCode = 500;
    let errorDetails = {
      message: error.message,
      timestamp: new Date().toISOString()
    };
    
    if (error.name === 'ValidationError') {
      errorMessage = 'Payment data validation failed';
      statusCode = 400;
      errorDetails.validationErrors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
      console.error('🔍 Validation Error Details:', errorDetails.validationErrors);
    } else if (error.name === 'CastError') {
      errorMessage = 'Invalid ID format provided';
      statusCode = 400;
      errorDetails.invalidField = error.path;
    } else if (error.code === 11000) {
      errorMessage = 'Duplicate transaction detected';
      statusCode = 409;
    }
    
    console.error('📤 Sending error response to frontend:', errorMessage);
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: error.message,
      details: errorDetails
    });
  }
};

// Get client's individual service requests
const getClientIndividualServices = async (req, res) => {
  try {
    console.log('🔍 Fetching client individual services...');
    
    const serviceRequests = await IndividualServiceRequest.find({ client: req.user.id })
      .populate('individualService')
      .populate('paymentTransaction')
      .populate('assignedLawyer', 'name email')
      .sort({ createdAt: -1 });
    
    // Group by status
    const groupedRequests = {
      processing: serviceRequests.filter(req => req.status === 'processing'),
      approved: serviceRequests.filter(req => req.status === 'approved'),
      inProgress: serviceRequests.filter(req => req.status === 'in_progress'),
      completed: serviceRequests.filter(req => req.status === 'completed'),
      rejected: serviceRequests.filter(req => req.status === 'rejected')
    };
    
    // Calculate stats
    const stats = {
      totalRequests: serviceRequests.length,
      processing: groupedRequests.processing.length,
      approved: groupedRequests.approved.length,
      inProgress: groupedRequests.inProgress.length,
      completed: groupedRequests.completed.length,
      rejected: groupedRequests.rejected.length,
      totalSpent: serviceRequests
        .filter(req => req.paymentTransaction?.paymentStatus === 'completed')
        .reduce((sum, req) => sum + req.amount, 0)
    };
    
    res.json({
      success: true,
      data: {
        allRequests: serviceRequests,
        groupedRequests,
        stats
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching client individual services:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching client individual services',
      error: error.message
    });
  }
};

module.exports = {
  getServicePackages,
  processPayment,
  getClientServices,
  getReceipt,
  getIndividualServices,
  processIndividualServicePayment,
  getClientIndividualServices
};