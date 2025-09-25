const express = require("express");
const Case = require("../Model/CaseModel");
const User = require("../Model/UserModel");
const LawyerAssignment = require("../Model/LawyerAssignment");
const AuthController = require("../Controllers/AuthControllers");
const { protect } = require("../Controllers/UnverifiedAuthController");
const router = express.Router();

// Function to get district court name based on district
const getDistrictCourtName = (district) => {
  const districtCourtMap = {
    'Colombo': 'Colombo District Court',
    'Gampaha': 'Gampaha District Court',
    'Kalutara': 'Kalutara District Court',
    'Kandy': 'Kandy District Court',
    'Matale': 'Matale District Court',
    'Nuwara Eliya': 'Nuwara Eliya District Court',
    'Galle': 'Galle District Court',
    'Matara': 'Matara District Court',
    'Hambantota': 'Hambantota District Court',
    'Jaffna': 'Jaffna District Court',
    'Kilinochchi': 'Kilinochchi District Court',
    'Mannar': 'Mannar District Court',
    'Vavuniya': 'Vavuniya District Court',
    'Mullaitivu': 'Mullaitivu District Court',
    'Batticaloa': 'Batticaloa District Court',
    'Ampara': 'Ampara District Court',
    'Trincomalee': 'Trincomalee District Court',
    'Kurunegala': 'Kurunegala District Court',
    'Puttalam': 'Puttalam District Court',
    'Anuradhapura': 'Anuradhapura District Court',
    'Polonnaruwa': 'Polonnaruwa District Court',
    'Badulla': 'Badulla District Court',
    'Moneragala': 'Moneragala District Court',
    'Ratnapura': 'Ratnapura District Court',
    'Kegalle': 'Kegalle District Court'
  };
  
  return districtCourtMap[district] || `${district} District Court`;
};

// Get assigned cases for lawyer
router.get("/cases", protect, async (req, res) => {
  try {
    console.log('🔍 LAWYER CASES DEBUG - Fetching cases for lawyer:', req.user.id);
    console.log('👤 User type:', req.user.userType);
    console.log('📧 User email:', req.user.email);
    
    // Check if user is a lawyer
    if (req.user.userType !== 'lawyer' && req.user.userType !== 'verified_lawyer') {
      return res.status(403).json({ message: "Access denied. This endpoint is for lawyers only." });
    }

    // Find cases assigned to this lawyer with detailed logging
    console.log('🔍 Searching for cases with currentLawyer:', req.user.id);
    
    // First, let's see all cases that might be related to this lawyer
    const allCases = await Case.find({})
      .populate('user', 'name fullName email phone')
      .sort({ createdAt: -1 });
    
    console.log(`📊 Total cases in database: ${allCases.length}`);
    
    // Filter and log cases that have this lawyer
    const relatedCases = allCases.filter(caseItem => {
      const hasLawyer = caseItem.currentLawyer && caseItem.currentLawyer.toString() === req.user.id;
      if (hasLawyer) {
        console.log(`✅ Found assigned case: ${caseItem.caseNumber} (${caseItem.status}) - currentLawyer: ${caseItem.currentLawyer}`);
      }
      return hasLawyer;
    });
    
    console.log(`🎯 Cases assigned to this lawyer: ${relatedCases.length}`);
    
    // Also check for cases that might have this lawyer in a different way
    const potentialCases = allCases.filter(caseItem => {
      const isRelated = caseItem.status === 'hearing_scheduled' || 
                       caseItem.status === 'filed' || 
                       caseItem.status === 'lawyer_assigned' ||
                       caseItem.status === 'scheduling_requested';
      if (isRelated) {
        console.log(`🔍 Potential case: ${caseItem.caseNumber} (${caseItem.status}) - currentLawyer: ${caseItem.currentLawyer}`);
      }
      return isRelated;
    });
    
    console.log(`📋 Cases that should have lawyers: ${potentialCases.length}`);

    // Find cases assigned to this lawyer (original query)
    const assignedCases = await Case.find({ currentLawyer: req.user.id })
      .populate('user', 'name fullName email phone')
      .sort({ createdAt: -1 });

    console.log(`✅ Final result: ${assignedCases.length} cases returned to lawyer dashboard`);
    assignedCases.forEach(caseItem => {
      console.log(`   📋 ${caseItem.caseNumber} (${caseItem.status}) - Client: ${caseItem.user?.name || caseItem.user?.fullName}`);
    });

    res.json({ cases: assignedCases });
  } catch (error) {
    console.error("Error fetching lawyer cases:", error);
    res.status(500).json({ message: error.message });
  }
});

// Request additional documents from client
router.post("/request-documents", protect, async (req, res) => {
  try {
    const { caseId, message, reviewNotes } = req.body;
    
    // Check if user is a lawyer
    if (req.user.userType !== 'lawyer' && req.user.userType !== 'verified_lawyer') {
      return res.status(403).json({ message: "Access denied. This endpoint is for lawyers only." });
    }

    // Check if lawyer is assigned to this case
    const caseData = await Case.findOne({ 
      _id: caseId, 
      currentLawyer: req.user.id 
    });

    if (!caseData) {
      return res.status(404).json({ message: "Case not found or you are not assigned to this case." });
    }

    // Update case with document request (preserve currentLawyer)
    const currentCase = await Case.findById(caseId);
    await Case.findByIdAndUpdate(caseId, {
      status: 'under_review',
      lawyerNotes: reviewNotes,
      documentRequest: message,
      documentRequestDate: new Date(),
      // Preserve the currentLawyer field
      currentLawyer: currentCase.currentLawyer
    });

    res.json({ 
      message: "Document request sent to client successfully",
      caseId,
      requestMessage: message
    });
  } catch (error) {
    console.error("Error requesting documents:", error);
    res.status(500).json({ message: error.message });
  }
});

// Mark case as ready to file
router.post("/ready-to-file", protect, async (req, res) => {
  try {
    const { caseId, reviewNotes } = req.body;
    
    // Check if user is a lawyer
    if (req.user.userType !== 'lawyer' && req.user.userType !== 'verified_lawyer') {
      return res.status(403).json({ message: "Access denied. This endpoint is for lawyers only." });
    }

    // Check if lawyer is assigned to this case
    const caseData = await Case.findOne({ 
      _id: caseId, 
      currentLawyer: req.user.id 
    });

    if (!caseData) {
      return res.status(404).json({ message: "Case not found or you are not assigned to this case." });
    }

    // Update case status (preserve currentLawyer)
    const currentCase = await Case.findById(caseId);
    await Case.findByIdAndUpdate(caseId, {
      status: 'approved',
      filingStatus: 'ready_to_file',
      lawyerNotes: reviewNotes,
      readyToFileDate: new Date(),
      // Preserve the currentLawyer field
      currentLawyer: currentCase.currentLawyer
    });

    res.json({ 
      message: "Case marked as ready to file successfully",
      caseId
    });
  } catch (error) {
    console.error("Error marking case ready to file:", error);
    res.status(500).json({ message: error.message });
  }
});

// Submit case filing to court
router.post("/submit-court-filing", protect, async (req, res) => {
  try {
    const { caseId, reviewNotes } = req.body;
    
    // Check if user is a lawyer
    if (req.user.userType !== 'lawyer' && req.user.userType !== 'verified_lawyer') {
      return res.status(403).json({ message: "Access denied. This endpoint is for lawyers only." });
    }

    // Check if lawyer is assigned to this case
    const caseData = await Case.findOne({ 
      _id: caseId, 
      currentLawyer: req.user.id 
    }).populate('user', 'name email userType')
     .populate('currentLawyer', 'name email userType');

    if (!caseData) {
      return res.status(404).json({ message: "Case not found or you are not assigned to this case." });
    }

    console.log('📋 Case data for filing:', {
      caseNumber: caseData.caseNumber,
      district: caseData.district,
      user: caseData.user,
      currentLawyer: caseData.currentLawyer
    });

    // Get lawyer details (use populated data first, fallback to direct query)
    const lawyer = caseData.currentLawyer || await require('../Model/UserModel').findById(req.user.id);

    // Generate court reference using same prefix as case number
    const courtReference = `CL${new Date().getFullYear()}-${caseId.slice(-6)}`;

    // Update case with court filing details (preserve currentLawyer)
    const currentCase = await Case.findById(caseId);
    const courtName = getDistrictCourtName(caseData.district);
    const updatedCase = await Case.findByIdAndUpdate(caseId, {
      status: 'filed',
      filingStatus: 'filed',
      lawyerNotes: reviewNotes,
      courtDetails: {
        name: courtName,
        reference: courtReference,
        filingDate: new Date(),
        filedBy: req.user.id
      },
      // Preserve the currentLawyer field
      currentLawyer: currentCase.currentLawyer
    }, { new: true });

    // Create court filing record
    const CourtFiling = require('../Model/CourtFiling');
    const courtFiling = new CourtFiling({
      case: caseId,
      lawyer: req.user.id,
      court: {
        name: courtName,
        district: caseData.district
      },
      status: 'filed',
      filedAt: new Date(),
      courtReference
    });
    await courtFiling.save();

    res.json({ 
      message: "Case filed with court successfully. You can now request court scheduling.",
      caseId,
      courtReference,
      filingDate: new Date(),
      nextStep: "Request court scheduling from your dashboard"
    });
  } catch (error) {
    console.error("Error filing case:", error);
    res.status(500).json({ message: error.message });
  }
});

// Request court scheduling for a filed case
router.post("/request-scheduling/:caseId", protect, async (req, res) => {
  try {
    const { caseId } = req.params;
    const { message } = req.body;
    
    console.log('=== LAWYER REQUESTING COURT SCHEDULING ===');
    console.log('Case ID:', caseId);
    console.log('Lawyer ID:', req.user.id);
    console.log('Message:', message);
    
    // Check if user is a lawyer
    if (req.user.userType !== 'lawyer' && req.user.userType !== 'verified_lawyer') {
      return res.status(403).json({ message: "Access denied. This endpoint is for lawyers only." });
    }

    // Check if case exists and is filed
    const caseData = await Case.findOne({ 
      _id: caseId, 
      currentLawyer: req.user.id,
      status: 'filed'
    }).populate('user', 'name email userType')
     .populate('currentLawyer', 'name email userType');

    if (!caseData) {
      return res.status(404).json({ 
        message: "Filed case not found or you are not assigned to this case." 
      });
    }

    // Check if schedule request already exists
    const CourtScheduleRequest = require('../Model/CourtScheduleRequest');
    const existingRequest = await CourtScheduleRequest.findOne({ case: caseId });
    
    if (existingRequest) {
      return res.status(400).json({ 
        message: "Court scheduling has already been requested for this case.",
        scheduleRequest: existingRequest
      });
    }

    // Get lawyer details
    const lawyer = caseData.currentLawyer || await require('../Model/UserModel').findById(req.user.id);
    
    // Create schedule request
    const scheduleRequestData = {
      case: caseId,
      courtFiling: new mongoose.Types.ObjectId(), // Will be linked properly later
      district: caseData.district,
      caseNumber: caseData.caseNumber,
      caseType: caseData.caseType,
      plaintiffName: caseData.plaintiffName,
      defendantName: caseData.defendantName,
      lawyer: req.user.id,
      lawyerName: lawyer?.name || 'Lawyer Name Not Available',
      client: caseData.user?._id || caseData.user,
      clientName: caseData.user?.name || 'Client Name Not Available',
      filedDate: caseData.courtDetails?.filingDate || new Date(),
      priority: caseData.caseType === 'urgent' ? 'high' : 'medium',
      isScheduled: false,
      requestMessage: message
    };
    
    console.log('📋 Creating schedule request:', scheduleRequestData);
    
    const scheduleRequest = new CourtScheduleRequest(scheduleRequestData);
    await scheduleRequest.save();
    
    // Update case status to indicate scheduling has been requested (preserve currentLawyer)
    const currentCase = await Case.findById(caseId);
    await Case.findByIdAndUpdate(caseId, {
      status: 'scheduling_requested',
      // Preserve the currentLawyer field
      currentLawyer: currentCase.currentLawyer
    });
    
    console.log('✅ Schedule request created successfully:', scheduleRequest._id);
    
    res.json({ 
      message: "Court scheduling requested successfully. Your case has been added to the court scheduler queue.",
      scheduleRequest: {
        id: scheduleRequest._id,
        caseNumber: scheduleRequest.caseNumber,
        district: scheduleRequest.district,
        priority: scheduleRequest.priority
      }
    });
    
  } catch (error) {
    console.error("Error requesting court scheduling:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get case details for lawyer review
router.get("/case/:caseId", protect, async (req, res) => {
  try {
    const { caseId } = req.params;
    
    // Check if user is a lawyer
    if (req.user.userType !== 'lawyer' && req.user.userType !== 'verified_lawyer') {
      return res.status(403).json({ message: "Access denied. This endpoint is for lawyers only." });
    }

    // Find case assigned to this lawyer
    const caseData = await Case.findOne({ 
      _id: caseId, 
      currentLawyer: req.user.id 
    }).populate('user', 'name email phone');

    if (!caseData) {
      return res.status(404).json({ message: "Case not found or you are not assigned to this case." });
    }

    res.json({ case: caseData });
  } catch (error) {
    console.error("Error fetching case details:", error);
    res.status(500).json({ message: error.message });
  }
});

// Generate PDF for lawyer assigned case
router.get("/case/:caseId/generate-pdf", protect, async (req, res) => {
  try {
    const { caseId } = req.params;
    const userId = req.user.id;
    
    console.log(`PDF generation requested by lawyer ${userId} for case ${caseId}`);
    
    // Check if user is a lawyer
    if (req.user.userType !== 'lawyer' && req.user.userType !== 'verified_lawyer') {
      return res.status(403).json({ message: "Access denied. This endpoint is for lawyers only." });
    }

    // Find case assigned to this lawyer
    const caseData = await Case.findOne({ 
      _id: caseId, 
      currentLawyer: userId 
    })
      .populate('user', 'name fullName email phone')
      .populate('currentLawyer', 'name email phone');

    if (!caseData) {
      console.log('Case not found or lawyer not assigned');
      return res.status(404).json({ message: "Case not found or you are not assigned to this case." });
    }
    
    console.log('Case found, generating PDF for lawyer...');
    
    // Use the existing PDF service
    const { generateCasePDF } = require('../services/pdfService');
    const pdfBuffer = await generateCasePDF(caseData);
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Case_${caseData.caseNumber}_Lawyer.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Send the PDF buffer
    res.send(pdfBuffer);
    console.log('PDF generated and sent successfully to lawyer');
    
  } catch (error) {
    console.error("Error generating PDF for lawyer:", error);
    res.status(500).json({ message: "Failed to generate PDF: " + error.message });
  }
});

// Get lawyer performance data
router.get("/performance", protect, async (req, res) => {
  try {
    const lawyerId = req.user.id;
    
    // Get all ratings for this lawyer
    const Rating = require('../Model/Rating');
    const ratings = await Rating.find({ lawyer: lawyerId })
      .sort({ createdAt: -1 })
      .limit(10); // Get last 10 ratings

    // Get lawyer info
    const VerifiedLawyer = require('../Model/VerifiedLawyer');
    const lawyer = await VerifiedLawyer.findById(lawyerId).select('ratings totalReviews fullName');

    res.status(200).json({
      success: true,
      ratings: ratings,
      lawyerInfo: {
        fullName: lawyer?.fullName,
        currentRating: lawyer?.ratings || 0,
        totalReviews: lawyer?.totalReviews || 0
      }
    });

  } catch (error) {
    console.error("Error fetching lawyer performance:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error while fetching performance data",
      error: error.message 
    });
  }
});

module.exports = router;
