require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { createServer } = require('http');
const SocketService = require('./services/socketService');

const app = express();

// Enhanced CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('Origin not allowed by CORS:', origin);
      callback(null, true); // Allow all origins for development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Access-Control-Allow-Headers'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// middleware
app.use(express.json());

// Routes
const authRoutes = require("./Routes/AuthRoutes");
const unverifiedAuthRoutes = require("./Routes/UnverifiedAuthRoutes");
const adminRoutes = require("./Routes/AdminRoutes");
const caseRoutes = require("./Routes/CaseRoutes");
const verificationRoutes = require("./Routes/verification");
const lawyerAssignmentRoutes = require("./Routes/lawyerAssignment");
const lawyerRoutes = require("./Routes/lawyers");
const lawyerDashboardRoutes = require("./Routes/lawyerRoutes");
const chatRoutes = require("./Routes/chatRoutes");
const caseUpdateRoutes = require("./Routes/caseUpdateRoutes");
const documentRoutes = require("./Routes/documentRoutes");
const profileRoutes = require("./Routes/ProfileRoutes");
const courtSchedulerRoutes = require("./Routes/courtSchedulerRoutes");
const premiumServicesRoutes = require("./Routes/premiumServicesRoutes");
const checklistRoutes = require("./Routes/checklistRoutes");
const chatbotRoutes = require("./Routes/chatbotRoutes");
const adjournmentRoutes = require("./Routes/adjournmentRoutes");
const financeManagerRoutes = require("./Routes/financeManagerRoutes");
const setupRoutes = require("./Routes/setupRoutes");
const ratingRoutes = require("./Routes/ratingRoutes");

app.use("/auth", authRoutes);
app.use("/unverified-auth", unverifiedAuthRoutes);
app.use("/admin", adminRoutes);
app.use("/cases", caseRoutes);
app.use("/verification", verificationRoutes);
app.use("/api/lawyer-assignment", lawyerAssignmentRoutes);
app.use("/lawyers", lawyerRoutes);
app.use("/api/lawyer", lawyerDashboardRoutes);
app.use("/api/chat", chatRoutes); // Fixed: Added /api prefix for chat routes
app.use("/chat", chatRoutes); // Keep both for backward compatibility
app.use("/case-updates", caseUpdateRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/court-scheduler", courtSchedulerRoutes);
app.use("/api/premium-services", premiumServicesRoutes);
app.use("/api/checklist", checklistRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/adjournment", adjournmentRoutes);
app.use("/api/finance-manager", financeManagerRoutes);
app.use("/api/setup", setupRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/feedback", require('./Routes/feedbackRoutes'));
app.use("/api/email", require('./Routes/emailRoutes'));
app.use("/api/notifications", require('./Routes/notificationRoutes'));
app.use("/api/analytics", require('./Routes/analyticsRoutes'));
app.use("/api/financial-aid", require('./Routes/financialAidRoutes'));

// Debug endpoint to test individual service payment without authentication
app.post("/api/debug/individual-payment", async (req, res) => {
  try {
    console.log('🔍 DEBUG: Testing individual service payment...');
    console.log('Request body:', req.body);
    
    const IndividualService = require('./Model/IndividualService');
    const PaymentTransaction = require('./Model/PaymentTransaction');
    const IndividualServiceRequest = require('./Model/IndividualServiceRequest');
    const mongoose = require('mongoose');
    
    const { serviceId, paymentDetails, billingInfo, clientRequirements } = req.body;
    
    // Validate required fields
    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: 'Service ID is required'
      });
    }
    
    // Get individual service
    const individualService = await IndividualService.findById(serviceId);
    if (!individualService) {
      return res.status(404).json({
        success: false,
        message: 'Individual service not found'
      });
    }
    
    console.log('✅ Found service:', individualService.name);
    
    // Simulate payment processing
    const paymentResult = {
      success: true,
      gatewayTransactionId: 'DEBUG-' + Date.now(),
      processingFee: Math.round(individualService.price * 0.025),
      processedAt: new Date()
    };
    
    // Create payment transaction (without client reference for debug)
    const transactionId = 'DEBUG-TXN-' + Date.now();
    const receiptNumber = 'DEBUG-RCP-' + Date.now();
    
    const paymentTransaction = new PaymentTransaction({
      transactionId: transactionId,
      receiptNumber: receiptNumber,
      client: new mongoose.Types.ObjectId(), // Dummy client ID
      servicePackage: serviceId,
      amount: individualService.price,
      currency: 'LKR',
      paymentMethod: 'card',
      cardDetails: {
        last4Digits: paymentDetails?.cardNumber?.slice(-4) || '1234',
        cardType: 'Debug',
        expiryMonth: '12',
        expiryYear: '25'
      },
      paymentStatus: 'completed',
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
    
    // Create individual service request (without client reference for debug)
    const serviceRequest = new IndividualServiceRequest({
      client: new mongoose.Types.ObjectId(), // Dummy client ID
      clientName: billingInfo?.fullName || 'Debug User',
      clientEmail: billingInfo?.email || 'debug@test.com',
      individualService: serviceId,
      serviceName: individualService.name,
      serviceCategory: individualService.category,
      amount: individualService.price,
      paymentTransaction: paymentTransaction._id,
      status: 'processing',
      clientRequirements: clientRequirements || 'Debug requirements',
      estimatedCompletion: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)) // 7 days from now
    });
    
    await serviceRequest.save();
    console.log('✅ Service request saved:', serviceRequest.requestId);
    
    res.json({
      success: true,
      message: 'DEBUG: Individual service payment processed successfully',
      transactionId: paymentTransaction.transactionId,
      receiptNumber: paymentTransaction.receiptNumber,
      serviceRequestId: serviceRequest.requestId,
      estimatedCompletion: serviceRequest.estimatedCompletion,
      receipt: paymentTransaction.receiptData
    });
    
  } catch (error) {
    console.error('❌ DEBUG: Error processing individual service payment:', error);
    res.status(500).json({
      success: false,
      message: 'DEBUG: Error processing individual service payment',
      error: error.message
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ message: "Server is running" });
});

// Quick setup endpoint for individual services (no auth required for initial setup)
app.post("/api/quick-setup/individual-services", async (req, res) => {
  try {
    const IndividualService = require('./Model/IndividualService');
    
    console.log('🔄 Quick setup: Creating individual services...');
    
    // Clear existing services
    await IndividualService.deleteMany({});
    
    const services = [
      // CONSULTATION & ADVICE
      {
        name: 'Extended Video Consultation',
        category: 'consultation',
        description: 'Purchase an additional 1-hour video call with a specialist lawyer (corporate, family, property).',
        price: 2500,
        duration: '1 hour',
        deliverable: 'Video consultation session',
        requirements: ['Brief description of your legal issue'],
        specialization: ['corporate', 'family', 'property'],
        complexity: 'standard',
        estimatedTurnaround: '24-48 hours to schedule',
        features: [
          { name: 'One-on-one video call', description: 'Direct access to specialist lawyer', included: true },
          { name: 'Session recording', description: 'Recording provided', included: true },
          { name: 'Follow-up summary', description: 'Written summary provided', included: true }
        ],
        isActive: true,
        isPopular: true
      },
      {
        name: 'Quick Question',
        category: 'consultation',
        description: 'A text-based "ask a lawyer" service for 1-2 simple questions with guaranteed response within 1 hour.',
        price: 500,
        duration: '1 hour response time',
        deliverable: 'Written legal advice',
        requirements: ['Clear, specific legal questions (max 2)'],
        specialization: ['general'],
        complexity: 'simple',
        estimatedTurnaround: '1 hour',
        features: [
          { name: 'Fast response', description: 'Guaranteed response within 1 hour', included: true },
          { name: 'Written advice', description: 'Clear, actionable legal guidance', included: true }
        ],
        isActive: true,
        isPopular: true
      },
      {
        name: 'Legal Health Check',
        category: 'consultation',
        description: 'A comprehensive review of user\'s legal situation with detailed report.',
        price: 5000,
        duration: '3-5 business days',
        deliverable: 'Detailed legal health report',
        requirements: ['Business/personal details', 'Current legal documents'],
        specialization: ['corporate', 'business'],
        complexity: 'complex',
        estimatedTurnaround: '3-5 business days',
        features: [
          { name: 'Comprehensive analysis', description: 'Full legal review', included: true },
          { name: 'Risk assessment', description: 'Risk identification', included: true }
        ],
        isActive: true,
        isPopular: false
      },
      // DOCUMENT SERVICES
      {
        name: 'Document Drafting - Simple',
        category: 'documents',
        description: 'Draft custom legal documents (Will, Rental Agreement, NDA, Service Contract).',
        price: 3000,
        duration: '2-3 business days',
        deliverable: 'Custom legal document',
        requirements: ['Document type needed', 'Party details'],
        specialization: ['contract', 'general'],
        complexity: 'simple',
        estimatedTurnaround: '2-3 business days',
        features: [
          { name: 'Custom drafting', description: 'Tailored to your needs', included: true },
          { name: 'Legal review', description: 'Lawyer reviewed', included: true }
        ],
        isActive: true,
        isPopular: true
      },
      {
        name: 'Document Drafting - Complex',
        category: 'documents',
        description: 'Draft complex legal documents (Employment Contracts, Partnership Agreements).',
        price: 8000,
        duration: '5-7 business days',
        deliverable: 'Complex legal document',
        requirements: ['Detailed requirements', 'All party information'],
        specialization: ['corporate', 'employment'],
        complexity: 'complex',
        estimatedTurnaround: '5-7 business days',
        features: [
          { name: 'Complex drafting', description: 'Multi-clause documents', included: true },
          { name: 'Senior lawyer review', description: 'Expert review', included: true }
        ],
        isActive: true,
        isPopular: false
      },
      {
        name: 'Document Review & Redlining',
        category: 'documents',
        description: 'Review contracts with detailed comments and suggested changes.',
        price: 2500,
        duration: '1-2 business days',
        deliverable: 'Reviewed document with comments',
        requirements: ['Document to be reviewed'],
        specialization: ['contract', 'general'],
        complexity: 'standard',
        estimatedTurnaround: '1-2 business days',
        features: [
          { name: 'Detailed review', description: 'Line-by-line analysis', included: true },
          { name: 'Risk assessment', description: 'Issue identification', included: true }
        ],
        isActive: true,
        isPopular: true
      },
      {
        name: 'Document Customization',
        category: 'documents',
        description: 'Customize pre-existing legal templates with your specific details.',
        price: 1000,
        duration: '1 business day',
        deliverable: 'Customized legal document',
        requirements: ['Template selection', 'Your details'],
        specialization: ['general'],
        complexity: 'simple',
        estimatedTurnaround: '1 business day',
        features: [
          { name: 'Template customization', description: 'Professional adaptation', included: true },
          { name: 'Quick turnaround', description: 'Same day delivery', included: true }
        ],
        isActive: true,
        isPopular: true
      },
      // REPRESENTATION & LIAISON
      {
        name: 'Lawyer Representation Letter',
        category: 'representation',
        description: 'Have a lawyer send formal legal notice on official letterhead.',
        price: 4000,
        duration: '2-3 business days',
        deliverable: 'Official legal notice',
        requirements: ['Issue details', 'Desired outcome'],
        specialization: ['litigation', 'general'],
        complexity: 'standard',
        estimatedTurnaround: '2-3 business days',
        features: [
          { name: 'Official letterhead', description: 'Lawyer letterhead', included: true },
          { name: 'Legal weight', description: 'Full legal authority', included: true }
        ],
        isActive: true,
        isPopular: true
      },
      {
        name: 'Court Liaison Service',
        category: 'representation',
        description: 'Lawyer/paralegal handles court filings, status checks, and document collection.',
        price: 3000,
        duration: 'Same day service',
        deliverable: 'Court filing service',
        requirements: ['Documents to file', 'Court information'],
        specialization: ['court procedures', 'litigation'],
        complexity: 'standard',
        estimatedTurnaround: 'Same day',
        features: [
          { name: 'Court filing', description: 'Professional filing', included: true },
          { name: 'Status updates', description: 'Real-time updates', included: true }
        ],
        isActive: true,
        isPopular: true
      },
      {
        name: 'Court Date Representation',
        category: 'representation',
        description: 'Have a lawyer appear for you in simple, procedural court matters.',
        price: 8000,
        duration: 'Court date',
        deliverable: 'Court representation',
        requirements: ['Case details', 'Court information'],
        specialization: ['court representation'],
        complexity: 'standard',
        estimatedTurnaround: 'Scheduled court date',
        features: [
          { name: 'Professional representation', description: 'Lawyer appears for you', included: true },
          { name: 'Post-hearing report', description: 'Detailed report', included: true }
        ],
        isActive: true,
        isPopular: false
      }
    ];
    
    const createdServices = await IndividualService.insertMany(services);
    
    res.json({
      success: true,
      message: `Created ${createdServices.length} individual services`,
      services: createdServices.map(s => ({ name: s.name, category: s.category, price: s.price }))
    });
    
  } catch (error) {
    console.error('❌ Error in quick setup:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting up individual services',
      error: error.message
    });
  }
});

// API service status endpoint
app.get("/api/status", (req, res) => {
  res.status(200).json({ 
    message: "API services are running",
    services: {
      chat: "Available at /api/chat/",
      documents: "Available at /api/documents/",
      pdf: "Available at /api/cases/:caseId/generate-pdf",
      lawyerAssignment: "Available at /api/lawyer-assignment/",
      financialAid: "Available at /api/financial-aid/",
      financeManager: "Available at /api/finance-manager/"
    },
    timestamp: new Date().toISOString()
  });
});

// Test chat endpoint
app.get("/api/chat/test", (req, res) => {
  res.status(200).json({ 
    message: "Chat service is running",
    endpoints: [
      "GET /api/chat/case/:caseId - Get messages for a case",
      "POST /api/chat/send - Send a message",
      "PUT /api/chat/mark-read/:caseId - Mark messages as read",
      "GET /api/chat/unread-count - Get unread message count"
    ]
  });
});

// Test PDF endpoint
app.get("/api/cases/test-pdf", (req, res) => {
  res.status(200).json({ 
    message: "PDF service is available",
    endpoint: "GET /api/cases/:caseId/generate-pdf - Generate PDF for a case",
    note: "Requires authentication and case access"
  });
});

// Test document service endpoint
app.get("/api/documents/test", (req, res) => {
  res.status(200).json({
    message: "Document service is running",
    endpoints: [
      "POST /api/documents/upload - Upload a document",
      "GET /api/documents/my-documents - Get user's documents",
      "GET /api/documents/case/:caseId - Get documents for a case",
      "GET /api/documents/:documentId/download - Download a document",
      "DELETE /api/documents/:documentId - Delete a document",
      "POST /api/documents/:documentId/share - Share document with user",
      "GET /api/documents/stats - Get document statistics"
    ],
    note: "All endpoints require authentication"
  });
});

// Test financial aid endpoint
app.get("/api/financial-aid/test-endpoint", (req, res) => {
  res.status(200).json({
    message: "Financial aid service is running",
    endpoints: [
      "POST /api/financial-aid/submit - Submit financial aid request",
      "GET /api/financial-aid/my-requests - Get client's aid requests",
      "GET /api/financial-aid/request/:requestId - Get aid request details",
      "PUT /api/financial-aid/request/:requestId - Update aid request",
      "DELETE /api/financial-aid/request/:requestId - Cancel aid request"
    ],
    note: "All endpoints require verified client authentication"
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = createServer(app);

// Initialize Socket.IO service
let socketService;

// Try multiple MongoDB connection options
const connectToMongoDB = async () => {
  const connectionOptions = [
    "mongodb+srv://triveni:M9fLy2oWyu8ewljr@cluster0.it4e3sl.mongodb.net/legal-management-system?retryWrites=true&w=majority",
    "mongodb://localhost:27017/legal-management-system",
    "mongodb://127.0.0.1:27017/legal-management-system"
  ];

  for (const connectionString of connectionOptions) {
    try {
      console.log(`Attempting to connect to: ${connectionString.includes('cluster0') ? 'MongoDB Atlas' : 'Local MongoDB'}`);
      await mongoose.connect(connectionString, {
        serverSelectionTimeoutMS: 5000, // 5 seconds
        socketTimeoutMS: 45000, // 45 seconds
      });
      console.log("✅ MongoDB connected successfully!");
      return;
    } catch (error) {
      console.log(`❌ Failed to connect with this option: ${error.message}`);
    }
  }
  
  console.error("❌ Could not connect to any MongoDB instance");
  console.log("Please ensure MongoDB is running locally or check your internet connection for Atlas");
};

connectToMongoDB()
.then(() => {
    console.log("Connected to MongoDB");
    
    // Initialize Socket.IO service after MongoDB connection
    socketService = new SocketService(server);
    console.log("Socket.IO service initialized");
    
    // Initialize Email Report Scheduler
    const SchedulerService = require('./services/schedulerService');
    const schedulerService = new SchedulerService();
    schedulerService.startAllSchedulers();
    console.log("Email report scheduler initialized");
    
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`WebSocket server running on port ${PORT}`);
    });
})
.catch(err => console.log("MongoDB connection error:", err));

// Export for potential use in other modules
module.exports = { app, server, socketService: () => socketService };
