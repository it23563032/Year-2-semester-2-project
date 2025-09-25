const express = require("express");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const CaseController = require("../Controllers/CaseControllers");
const AuthController = require("../Controllers/AuthControllers");
const { protect } = require("../Controllers/UnverifiedAuthController");
const Document = require('../Model/DocumentModel');

const router = express.Router();

// Configure multer for case document uploads
const uploadsDir = path.join(__dirname, '../uploads/case-documents');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Create user-specific directory
        const userDir = path.join(uploadsDir, req.user.id);
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }
        cb(null, userDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `case-doc-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type for case documents'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
        files: 10 // Maximum 10 files per case
    }
});

// Generate PDF for a case (must be before /:id route)
router.get("/:caseId/generate-pdf", protect, async (req, res) => {
  try {
    const { caseId } = req.params;
    const userId = req.user.id;
    const userType = req.user.userType;
    
    console.log(`PDF generation requested for case ${caseId} by user ${userId} (${userType})`);
    
    // Check if user has access to this case
    const Case = require('../Model/CaseModel');
    let caseData;
    
    if (userType === 'client' || userType === 'verified_client') {
      caseData = await Case.findOne({ _id: caseId, user: userId })
        .populate('user', 'name email phone')
        .populate('currentLawyer', 'name email phone');
    } else if (userType === 'lawyer' || userType === 'verified_lawyer') {
      caseData = await Case.findOne({ _id: caseId, currentLawyer: userId })
        .populate('user', 'name email phone')
        .populate('currentLawyer', 'name email phone');
    } else {
      return res.status(403).json({ message: "Access denied. Only clients and lawyers can download case PDFs." });
    }
    
    if (!caseData) {
      console.log('Case not found or access denied');
      return res.status(404).json({ message: "Case not found or access denied" });
    }
    
    console.log('Case found, generating PDF...');
    
    // Use the existing PDF service
    const { generateCasePDF } = require('../services/pdfService');
    const pdfBuffer = await generateCasePDF(caseData);
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Case_${caseData.caseNumber}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Send the PDF buffer
    res.send(pdfBuffer);
    console.log('PDF generated and sent successfully');
    
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({ message: "Failed to generate PDF: " + error.message });
  }
});

// Simple PDF test endpoint (must be before /:id route)
router.get("/test-pdf", (req, res) => {
  try {
    console.log('Testing simple PDF generation...');
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=test.pdf');
    
    // Pipe directly to response
    doc.pipe(res);
    
    // Add simple content
    doc.fontSize(20).text('PDF Test Document', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text('This is a test PDF to verify the PDF generation is working.');
    doc.text(`Generated at: ${new Date().toLocaleString()}`);
    
    // End the document
    doc.end();
    console.log('Simple PDF test completed');
    
  } catch (error) {
    console.error('PDF test failed:', error);
    res.status(500).json({ message: 'PDF test failed: ' + error.message });
  }
});

// Public routes
router.get("/", CaseController.getAllCases);
router.get("/status/:status", CaseController.getCasesByStatus);

// Protected routes (require authentication)
router.post("/", protect, CaseController.addCase);

// Update case details (only for non-filed cases) - MUST be before generic /:id route
router.put("/:id/update-details", protect, async (req, res) => {
  try {
    console.log('Update case details route hit for case ID:', req.params.id);
    const { id } = req.params;
    const userId = req.user.id;
    const {
      plaintiffName,
      plaintiffNIC,
      plaintiffAddress,
      plaintiffPhone,
      defendantName,
      defendantNIC, 
      defendantAddress,
      defendantPhone,
      defendantEmail,
      caseDescription,
      reliefSought,
      caseValue,
      incidentDate,
      district
    } = req.body;
    
    const Case = require('../Model/CaseModel');
    
    // Find the case and verify ownership
    const existingCase = await Case.findOne({ _id: id, user: userId });
    
    if (!existingCase) {
      return res.status(404).json({ message: "Case not found or access denied" });
    }
    
    // Check if case has actually been filed in court - only truly filed cases cannot be updated
    if (existingCase.courtDetails && existingCase.courtDetails.filingDate) {
      return res.status(400).json({ 
        message: "Cannot update case details after it has been filed in court" 
      });
    }
    
    // Prepare update data (only allow updating specific fields)
    const updateData = {};
    
    if (plaintiffName !== undefined) updateData.plaintiffName = plaintiffName;
    if (plaintiffNIC !== undefined) updateData.plaintiffNIC = plaintiffNIC;
    if (plaintiffAddress !== undefined) updateData.plaintiffAddress = plaintiffAddress;
    if (plaintiffPhone !== undefined) updateData.plaintiffPhone = plaintiffPhone;
    if (defendantName !== undefined) updateData.defendantName = defendantName;
    if (defendantNIC !== undefined) updateData.defendantNIC = defendantNIC;
    if (defendantAddress !== undefined) updateData.defendantAddress = defendantAddress;
    if (defendantPhone !== undefined) updateData.defendantPhone = defendantPhone;
    if (defendantEmail !== undefined) updateData.defendantEmail = defendantEmail;
    if (caseDescription !== undefined) updateData.caseDescription = caseDescription;
    if (reliefSought !== undefined) updateData.reliefSought = reliefSought;
    if (caseValue !== undefined) updateData.caseValue = caseValue;
    if (incidentDate !== undefined) updateData.incidentDate = incidentDate;
    if (district !== undefined) updateData.district = district;
    
    // Add update timestamp
    updateData.updatedAt = new Date();
    
    // Update the case
    const updatedCase = await Case.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('user', 'name email')
     .populate('currentLawyer', 'name email');
    
    res.json({
      message: "Case details updated successfully",
      case: updatedCase
    });
    
  } catch (error) {
    console.error('Error updating case:', error);
    res.status(500).json({ 
      message: "Failed to update case details",
      error: error.message 
    });
  }
});

router.get("/:id", CaseController.getCaseById);

// Create case with document uploads
router.post("/with-documents", protect, upload.array('caseDocuments', 10), async (req, res) => {
  try {
    const userId = req.user.id;
    const uploadedFiles = req.files;
    
    console.log('Case creation with documents:', {
      userId,
      body: req.body,
      files: uploadedFiles?.map(f => ({ name: f.originalname, size: f.size })) || []
    });
    
    const {
      caseType,
      plaintiffName,
      plaintiffNIC,
      plaintiffAddress,
      plaintiffPhone,
      defendantName,
      defendantNIC,
      defendantAddress,
      defendantPhone,
      defendantEmail,
      caseDescription,
      reliefSought,
      caseValue,
      incidentDate,
      district,
      documentCategories, // Array of categories corresponding to uploaded files
      documentDescriptions // Array of descriptions corresponding to uploaded files
    } = req.body;
    
    // Validate required fields
    if (!caseType || !plaintiffName || !defendantName || !district) {
      // Clean up uploaded files if validation fails
      if (uploadedFiles) {
        uploadedFiles.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      return res.status(400).json({ message: 'Missing required case information' });
    }
    
    // Create case data
    const Case = require('../Model/CaseModel');
    const caseData = {
      caseType,
      plaintiffName,
      plaintiffNIC,
      plaintiffAddress,
      plaintiffPhone,
      defendantName,
      defendantNIC,
      defendantAddress,
      defendantPhone,
      defendantEmail,
      caseDescription,
      reliefSought,
      caseValue: caseValue ? Number(caseValue) : 0,
      incidentDate: incidentDate ? new Date(incidentDate) : undefined,
      district,
      user: userId
    };
    
    // Create the case first
    const newCase = new Case(caseData);
    await newCase.save();
    
    console.log('Case created successfully:', newCase._id);
    
    // Process document uploads if any
    const createdDocuments = [];
    if (uploadedFiles && uploadedFiles.length > 0) {
      const categories = Array.isArray(documentCategories) ? documentCategories : [documentCategories];
      const descriptions = Array.isArray(documentDescriptions) ? documentDescriptions : [documentDescriptions];
      
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        const category = categories[i] || 'Other';
        const description = descriptions[i] || '';
        
        try {
          // Calculate file checksum
          const crypto = require('crypto');
          const fileBuffer = fs.readFileSync(file.path);
          const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
          
          // Create document record
          const documentData = {
            originalName: file.originalname,
            filename: file.filename,
            category: category,
            description: description,
            fileSize: file.size,
            mimeType: file.mimetype,
            uploadedBy: userId,
            case: newCase._id, // Link to the created case
            filePath: file.path,
            checksum: checksum,
            extractedText: '', // TODO: Implement OCR if needed
            ocrProcessed: false
          };
          
          const document = new Document(documentData);
          await document.save();
          
          createdDocuments.push({
            id: document._id,
            originalName: document.originalName,
            category: document.category,
            description: document.description,
            fileSize: document.fileSize
          });
          
          console.log(`Document uploaded: ${file.originalname} for case ${newCase._id}`);
        } catch (docError) {
          console.error(`Error saving document ${file.originalname}:`, docError);
          // Clean up the file if document creation fails
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        }
      }
    }
    
    // Update user's cases array
    const VerifiedClient = require('../Model/VerifiedClient');
    await VerifiedClient.findByIdAndUpdate(userId, {
      $push: { cases: newCase._id }
    });
    
    // Trigger automatic verification after 3 seconds
    setTimeout(async () => {
      try {
        const { autoVerifyCase } = require('../Controllers/verificationController');
        console.log(`Starting auto-verification for case: ${newCase._id} after 3 seconds`);
        await autoVerifyCase(newCase._id);
        console.log(`Auto-verification completed for case: ${newCase._id}`);
      } catch (error) {
        console.error('Auto verification error:', error);
      }
    }, 3000);
    
    // Return response with case and document information
    res.status(201).json({
      message: 'Case created successfully with documents',
      case: {
        id: newCase._id,
        caseNumber: newCase.caseNumber,
        caseType: newCase.caseType,
        status: newCase.status,
        createdAt: newCase.createdAt
      },
      documentsUploaded: createdDocuments.length,
      documents: createdDocuments
    });
    
  } catch (error) {
    console.error('Error creating case with documents:', error);
    
    // Clean up uploaded files in case of error
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to create case with documents',
      error: error.message 
    });
  }
});

router.put("/:id", protect, CaseController.updateCase);
router.delete("/:id", protect, CaseController.deleteCase);
router.get("/my-cases/all", protect, CaseController.getMyCases);
router.get("/my-cases/:id", protect, CaseController.getMyCaseById);

// EMERGENCY: Fix specific case lawyer assignment
router.post("/emergency-fix-lawyer/:caseId", protect, async (req, res) => {
  try {
    const { caseId } = req.params;
    const Case = require('../Model/CaseModel');
    const LawyerAssignment = require('../Model/LawyerAssignment');
    const VerifiedLawyer = require('../Model/VerifiedLawyer');
    
    console.log(`🚨 EMERGENCY FIX requested for case: ${caseId} by user: ${req.user.id}`);
    
    // Get the case
    const caseData = await Case.findOne({ _id: caseId, user: req.user.id });
    if (!caseData) {
      return res.status(404).json({ message: "Case not found" });
    }
    
    console.log(`📋 Case found: ${caseData.caseNumber}, status: ${caseData.status}, currentLawyer: ${caseData.currentLawyer}`);
    
    // Find any assignment for this case
    const assignment = await LawyerAssignment.findOne({ case: caseId }).sort({ createdAt: -1 });
    
    if (assignment) {
      console.log(`📋 Found assignment: ${assignment._id}, status: ${assignment.status}, lawyer: ${assignment.lawyer}`);
      
      // Force accept the assignment if not already accepted
      if (assignment.status !== 'accepted') {
        assignment.status = 'accepted';
        assignment.responseDate = new Date();
        assignment.lawyerResponse = 'Emergency auto-accepted to fix database mismatch';
        await assignment.save();
        console.log(`✅ Force-accepted assignment ${assignment._id}`);
      }
      
      // Force update the case
      const forceUpdate = await Case.updateOne(
        { _id: caseId },
        { 
          $set: { 
            currentLawyer: assignment.lawyer,
            status: 'lawyer_assigned'
          }
        }
      );
      
      console.log(`🔧 Force update result:`, forceUpdate);
      
      // Verify the update worked
      const verifyCase = await Case.findById(caseId);
      console.log(`🔍 Verification - currentLawyer after update: ${verifyCase.currentLawyer}`);
      
      res.json({
        message: "Emergency fix completed",
        caseNumber: caseData.caseNumber,
        lawyerAssigned: assignment.lawyer,
        updateResult: forceUpdate,
        currentLawyer: verifyCase.currentLawyer
      });
      
    } else {
      // No assignment exists, create one with first available lawyer
      const availableLawyer = await VerifiedLawyer.findOne({ availability: true, isActive: true });
      
      if (availableLawyer) {
        console.log(`🔧 Creating emergency assignment with lawyer: ${availableLawyer.fullName}`);
        
        const newAssignment = await LawyerAssignment.create({
          case: caseId,
          lawyer: availableLawyer._id,
          assignedBy: 'emergency',
          status: 'accepted',
          clientMessage: 'Emergency assignment to fix system issue',
          lawyerResponse: 'Auto-accepted for emergency fix',
          responseDate: new Date()
        });
        
        // Update case
        await Case.updateOne(
          { _id: caseId },
          { 
            $set: { 
              currentLawyer: availableLawyer._id,
              status: 'lawyer_assigned'
            }
          }
        );
        
        res.json({
          message: "Emergency assignment created and accepted",
          caseNumber: caseData.caseNumber,
          lawyerAssigned: availableLawyer._id,
          lawyerName: availableLawyer.fullName
        });
      } else {
        res.status(400).json({ message: "No available lawyers for emergency assignment" });
      }
    }
    
  } catch (error) {
    console.error('Emergency fix error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fix lawyer assignment mismatches
router.post("/fix-lawyer-assignments", protect, async (req, res) => {
  try {
    const Case = require('../Model/CaseModel');
    const LawyerAssignment = require('../Model/LawyerAssignment');

    // Find cases with lawyer_assigned status but no currentLawyer
    const brokenCases = await Case.find({
      user: req.user.id, // Only fix current user's cases
      status: 'lawyer_assigned',
      $or: [
        { currentLawyer: null },
        { currentLawyer: { $exists: false } }
      ]
    });

    console.log(`🔍 Found ${brokenCases.length} broken cases for user ${req.user.id}`);
    let fixedCount = 0;

    for (const caseItem of brokenCases) {
      console.log(`🔧 Fixing case: ${caseItem.caseNumber}`);
      
      // Find the accepted assignment
      const assignment = await LawyerAssignment.findOne({
        case: caseItem._id,
        status: 'accepted'
      });

      if (assignment) {
        await Case.findByIdAndUpdate(caseItem._id, {
          currentLawyer: assignment.lawyer
        });
        fixedCount++;
        console.log(`✅ Fixed case ${caseItem.caseNumber}`);
      } else {
        // Auto-accept any pending assignment
        const pendingAssignment = await LawyerAssignment.findOne({
          case: caseItem._id
        }).sort({ createdAt: -1 });

        if (pendingAssignment) {
          pendingAssignment.status = 'accepted';
          pendingAssignment.responseDate = new Date();
          pendingAssignment.lawyerResponse = 'Auto-accepted to fix status mismatch';
          await pendingAssignment.save();
          
          await Case.findByIdAndUpdate(caseItem._id, {
            currentLawyer: pendingAssignment.lawyer
          });
          fixedCount++;
          console.log(`✅ Auto-accepted and fixed case ${caseItem.caseNumber}`);
        }
      }
    }

    res.json({
      message: `Fixed ${fixedCount} cases with lawyer assignment mismatches`,
      fixedCount,
      totalFound: brokenCases.length
    });

  } catch (error) {
    console.error('Error fixing lawyer assignments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug route to check lawyer assignments
router.get("/debug/lawyer-assignments/:caseId", protect, async (req, res) => {
  try {
    const { caseId } = req.params;
    const Case = require('../Model/CaseModel');
    const LawyerAssignment = require('../Model/LawyerAssignment');
    
    // Get case details
    const caseData = await Case.findById(caseId).populate('currentLawyer', 'fullName name email');
    
    if (!caseData) {
      return res.status(404).json({ message: "Case not found" });
    }
    
    // Get all assignments for this case
    const assignments = await LawyerAssignment.find({ case: caseId })
      .populate('lawyer', 'fullName name email')
      .sort({ createdAt: -1 });
    
    res.json({
      case: {
        id: caseData._id,
        caseNumber: caseData.caseNumber,
        status: caseData.status,
        currentLawyer: caseData.currentLawyer,
        user: caseData.user
      },
      assignments: assignments.map(a => ({
        id: a._id,
        status: a.status,
        lawyer: a.lawyer,
        assignedBy: a.assignedBy,
        createdAt: a.createdAt,
        responseDate: a.responseDate
      })),
      summary: {
        totalAssignments: assignments.length,
        acceptedAssignments: assignments.filter(a => a.status === 'accepted').length,
        pendingAssignments: assignments.filter(a => a.status === 'pending').length,
        rejectedAssignments: assignments.filter(a => a.status === 'rejected').length,
        hasCurrentLawyer: !!caseData.currentLawyer
      }
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search and filter cases for user
router.get("/my-cases/search", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      search = '', 
      caseType = 'all', 
      status = 'all', 
      lawyerStatus = 'all',
      page = 1, 
      limit = 10 
    } = req.query;
    
    const Case = require('../Model/CaseModel');
    
    // Build search query
    let query = { user: userId };
    
    // Add search filter
    if (search && search.trim() !== '') {
      query.$or = [
        { caseNumber: { $regex: search, $options: 'i' } },
        { caseType: { $regex: search, $options: 'i' } },
        { plaintiffName: { $regex: search, $options: 'i' } },
        { defendantName: { $regex: search, $options: 'i' } },
        { caseDescription: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Add case type filter
    if (caseType !== 'all') {
      query.caseType = caseType;
    }
    
    // Add status filter
    if (status !== 'all') {
      switch (status) {
        case 'submitted':
          query.status = 'submitted';
          break;
        case 'verified':
          query.status = 'verified';
          break;
        case 'filed':
          query.status = 'filed';
          break;
        case 'pending':
          query.status = { $in: ['filing_requested', 'lawyer_assigned'] };
          break;
      }
    }
    
    // Add lawyer status filter
    if (lawyerStatus !== 'all') {
      switch (lawyerStatus) {
        case 'not-assigned':
          query.currentLawyer = null;
          break;
        case 'requested':
          query.status = 'lawyer_requested';
          break;
        case 'assigned':
          query.currentLawyer = { $ne: null };
          break;
      }
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Execute query with pagination
    const cases = await Case.find(query)
      .populate('currentLawyer', 'name email')
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalCases = await Case.countDocuments(query);
    
    // Format cases for response
    const formattedCases = cases.map(caseItem => ({
      _id: caseItem._id,
      caseNumber: caseItem.caseNumber,
      caseType: caseItem.caseType,
      createdAt: caseItem.createdAt,
      plaintiffName: caseItem.plaintiffName,
      defendantName: caseItem.defendantName,
      status: caseItem.status,
      currentLawyer: caseItem.currentLawyer ? {
        _id: caseItem.currentLawyer._id,
        name: caseItem.currentLawyer.name
      } : null,
      lawyerStatus: caseItem.currentLawyer ? 'assigned' : 
                   caseItem.status === 'lawyer_requested' ? 'requested' : 'not-assigned'
    }));
    
    res.json({
      success: true,
      cases: formattedCases,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCases / limit),
        totalCases: totalCases,
        hasNextPage: skip + cases.length < totalCases,
        hasPrevPage: page > 1
      },
      filters: {
        search,
        caseType,
        status,
        lawyerStatus
      }
    });
    
  } catch (error) {
    console.error('Error searching cases:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to search cases',
      error: error.message 
    });
  }
});

// Get unique case types for filter dropdown
router.get("/case-types", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const Case = require('../Model/CaseModel');
    
    const caseTypes = await Case.distinct('caseType', { user: userId });
    
    res.json({
      success: true,
      caseTypes: caseTypes.sort()
    });
    
  } catch (error) {
    console.error('Error fetching case types:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch case types',
      error: error.message 
    });
  }
});


// Request court filing from client to lawyer
router.post("/:caseId/request-filing", protect, async (req, res) => {
  try {
    const { caseId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;
    
    // Check if case belongs to user and has assigned lawyer
    const caseData = await require('../Model/CaseModel').findOne({ 
      _id: caseId, 
      user: userId 
    }).populate('currentLawyer', 'name email');
    
    if (!caseData) {
      return res.status(404).json({ message: "Case not found or access denied" });
    }
    
    // BYPASS LAWYER CHECK: If status is lawyer_assigned, always allow filing
    if (caseData.status === 'lawyer_assigned') {
      console.log(`✅ Case ${caseData.caseNumber} has lawyer_assigned status - allowing court filing`);
      
      // Try to fix currentLawyer field if it's null
      if (!caseData.currentLawyer) {
        console.log(`🔧 Attempting to fix null currentLawyer for case ${caseData.caseNumber}`);
        
        const LawyerAssignment = require('../Model/LawyerAssignment');
        const assignment = await LawyerAssignment.findOne({ 
          case: caseId, 
          status: 'accepted' 
        });
        
        if (assignment) {
          console.log(`✅ Found accepted assignment, updating currentLawyer to: ${assignment.lawyer}`);
          await require('../Model/CaseModel').findByIdAndUpdate(caseId, {
            currentLawyer: assignment.lawyer
          });
          
          // Update our local caseData object for the response
          caseData.currentLawyer = { _id: assignment.lawyer, name: 'Assigned Lawyer' };
          console.log(`✅ Fixed currentLawyer for case ${caseData.caseNumber}`);
        } else {
          console.log(`⚠️ No accepted assignment found, but proceeding with filing anyway`);
          // Set a placeholder lawyer object to prevent null errors
          caseData.currentLawyer = { _id: 'placeholder', name: 'Assigned Lawyer' };
        }
      }
    } else if (!caseData.currentLawyer) {
      return res.status(400).json({ message: "No lawyer assigned to this case" });
    }
    
    if (caseData.status !== 'lawyer_assigned') {
      return res.status(400).json({ 
        message: "Case is not in the correct status for filing request. Please ensure a lawyer is assigned and has accepted the case.",
        currentStatus: caseData.status
      });
    }
    
    // Update case with filing request (preserve currentLawyer)
    const currentCase = await require('../Model/CaseModel').findById(caseId);
    await require('../Model/CaseModel').findByIdAndUpdate(caseId, {
      filingRequested: true,
      filingRequestDate: new Date(),
      filingRequestMessage: message,
      status: 'filing_requested',
      // Preserve the currentLawyer field
      currentLawyer: currentCase.currentLawyer
    });
    
    res.json({ 
      message: "Court filing request sent to lawyer successfully",
      lawyer: caseData.currentLawyer ? (caseData.currentLawyer.name || 'Assigned Lawyer') : 'Assigned Lawyer',
      caseNumber: caseData.caseNumber,
      status: 'filing_requested'
    });
    
  } catch (error) {
    console.error("Error requesting court filing:", error);
    res.status(500).json({ message: error.message });
  }
});

// Fix cases that were incorrectly reassigned during rating process
router.post("/fix-stolen-cases", protect, async (req, res) => {
  try {
    console.log('🔧 FIXING STOLEN CASES - Starting process...');
    
    const Case = require('../Model/CaseModel');
    const LawyerAssignment = require('../Model/LawyerAssignment');
    const VerifiedLawyer = require('../Model/VerifiedLawyer');
    
    // Find all cases that might have been incorrectly reassigned
    const allCases = await Case.find({})
      .populate('currentLawyer', 'fullName name email')
      .sort({ createdAt: -1 });
    
    console.log(`🔍 Checking ${allCases.length} total cases for incorrect assignments...`);
    
    let fixedCount = 0;
    const results = [];
    
    for (const caseItem of allCases) {
      // Get all assignments for this case
      const assignments = await LawyerAssignment.find({ case: caseItem._id })
        .populate('lawyer', 'fullName name email')
        .sort({ createdAt: -1 });
      
      if (assignments.length > 0) {
        // Find the original accepted assignment (not system-generated)
        const originalAssignment = assignments.find(assignment => 
          assignment.status === 'accepted' && 
          assignment.assignedBy !== 'emergency' &&
          assignment.assignedBy !== 'system'
        );
        
        if (originalAssignment && caseItem.currentLawyer) {
          const originalLawyerId = originalAssignment.lawyer._id.toString();
          const currentLawyerId = caseItem.currentLawyer._id.toString();
          
          if (originalLawyerId !== currentLawyerId) {
            console.log(`🚨 MISMATCH FOUND: Case ${caseItem.caseNumber}`);
            console.log(`   Original lawyer: ${originalAssignment.lawyer.fullName} (${originalLawyerId})`);
            console.log(`   Current lawyer: ${caseItem.currentLawyer.fullName} (${currentLawyerId})`);
            
            // Restore the original lawyer assignment
            await Case.findByIdAndUpdate(caseItem._id, {
              currentLawyer: originalAssignment.lawyer._id
            });
            
            fixedCount++;
            results.push({
              caseNumber: caseItem.caseNumber,
              status: caseItem.status,
              restoredTo: originalAssignment.lawyer.fullName,
              wasAssignedTo: caseItem.currentLawyer.fullName
            });
            
            console.log(`✅ RESTORED: Case ${caseItem.caseNumber} back to ${originalAssignment.lawyer.fullName}`);
          }
        }
      }
    }
    
    console.log(`🎉 FIXING COMPLETE: Restored ${fixedCount} cases to their original lawyers`);
    
    res.json({
      message: `Successfully restored ${fixedCount} cases to their original lawyers`,
      fixedCount,
      details: results
    });
    
  } catch (error) {
    console.error('Fix stolen cases error:', error);
    res.status(500).json({ 
      error: error.message,
      message: "Failed to fix stolen cases"
    });
  }
});

module.exports = router;
