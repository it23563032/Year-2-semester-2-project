const express = require("express");
const mongoose = require("mongoose");
const LawyerAssignment = require("../Model/LawyerAssignment");
const Case = require("../Model/CaseModel");
const User = require("../Model/UserModel");
const VerifiedLawyer = require("../Model/VerifiedLawyer");
const VerifiedClient = require("../Model/VerifiedClient");
const AuthController = require("../Controllers/AuthControllers");
const { protect } = require("../Controllers/UnverifiedAuthController");
const { generateCasePDF } = require("../services/pdfService");
const router = express.Router();

// Get available lawyers for a case type
router.get("/available/:caseType", protect, async (req, res) => {
  try {
    console.log("Getting available lawyers for case type:", req.params.caseType);
    
    // Map case types to lawyer specializations (using exact enum values from VerifiedLawyer model)
    const specializationMap = {
      'smallClaims': ['Civil Litigation', 'Commercial Law'],
      'landDispute': ['Property Law', 'Civil Litigation'],
      'tenancy': ['Property Law', 'Civil Litigation'],
      'family': ['Family Law'],
      'consumer': ['Commercial Law', 'Civil Litigation'],
      'criminal': ['Criminal Defense'],
      'corporate': ['Corporate Law', 'Commercial Law'],
      'labor': ['Labor Law'],
      'tax': ['Tax Law'],
      'constitutional': ['Constitutional Law'],
      'intellectual': ['Intellectual Property'],
      'other': ['Civil Litigation'] // Default to Civil Litigation for general cases
    };
    
    const specializations = specializationMap[req.params.caseType] || ['Civil Litigation'];
    console.log("Looking for specializations:", specializations);
    
    // First try to find specialized lawyers in verified collection
    let lawyers = await VerifiedLawyer.find({
      lawyerType: { $in: specializations },
      availability: true,
      isActive: true
    }).select('fullName email lawyerType passoutYear ratings casesHandled lawyerId');
    
    // If no verified lawyers found, check old user model
    if (lawyers.length === 0) {
      lawyers = await User.find({
        userType: 'lawyer',
        specialization: { $in: specializations },
        availability: true
      }).select('name email specialization yearsExperience rating casesHandled');
    }
    
    console.log(`Found ${lawyers.length} specialized lawyers`);
    
    // If no specialized lawyers found, get general practice lawyers
    if (lawyers.length === 0) {
      console.log("No specialized lawyers found, getting general practice lawyers");
      // Try verified lawyers first
      lawyers = await VerifiedLawyer.find({
        availability: true,
        isActive: true
      }).select('fullName email lawyerType passoutYear ratings casesHandled lawyerId');
      
      // If still no lawyers, try old user model
      if (lawyers.length === 0) {
        lawyers = await User.find({
          userType: 'lawyer',
          availability: true
        }).select('name email specialization yearsExperience rating casesHandled');
      }
    }
    
    console.log(`Total lawyers found: ${lawyers.length}`);
    
    // Normalize lawyer data structure for frontend compatibility
    const normalizedLawyers = lawyers.map(lawyer => {
      if (lawyer.fullName) {
        // VerifiedLawyer model
        return {
          _id: lawyer._id,
          name: lawyer.fullName,
          email: lawyer.email,
          specialization: lawyer.lawyerType ? [lawyer.lawyerType] : ['Civil Litigation'],
          yearsExperience: lawyer.passoutYear ? new Date().getFullYear() - lawyer.passoutYear : 0,
          rating: lawyer.ratings || 0,
          casesHandled: lawyer.casesHandled || 0,
          lawyerId: lawyer.lawyerId
        };
      } else {
        // User model (legacy)
        return {
          _id: lawyer._id,
          name: lawyer.name,
          email: lawyer.email,
          specialization: lawyer.specialization || ['Civil Litigation'],
          yearsExperience: lawyer.yearsExperience || 0,
          rating: lawyer.rating || 0,
          casesHandled: lawyer.casesHandled || 0
        };
      }
    });
    
    res.json(normalizedLawyers);
  } catch (error) {
    console.error("Error getting lawyers:", error);
    res.status(500).json({ message: error.message });
  }
});

// Manual assignment request from client
router.post("/request-assignment", protect, async (req, res) => {
  try {
    console.log("Manual assignment request received:", req.body);
    const { caseId, lawyerId, clientMessage } = req.body;
    
    // Verify the case belongs to the requesting user
    const caseData = await Case.findById(caseId);
    if (!caseData) {
      return res.status(404).json({ message: "Case not found" });
    }
    
    if (caseData.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only request assignment for your own cases" });
    }
    
    // Verify the lawyer exists and is available (check both collections)
    let lawyer = await VerifiedLawyer.findById(lawyerId);
    if (!lawyer) {
      lawyer = await User.findById(lawyerId);
      if (!lawyer || lawyer.userType !== 'lawyer') {
        return res.status(404).json({ message: "Lawyer not found" });
      }
    }
    
    if (!lawyer.availability) {
      return res.status(400).json({ message: "Lawyer is not currently available" });
    }
    
    // Check if there's already a pending assignment for this case
    const existingAssignment = await LawyerAssignment.findOne({ 
      case: caseId, 
      status: { $in: ['pending', 'accepted'] } 
    });
    
    if (existingAssignment) {
      return res.status(400).json({ message: "Case already has a pending or accepted lawyer assignment" });
    }
    
    // Create new assignment request
    const assignment = new LawyerAssignment({
      case: caseId,
      lawyer: lawyerId,
      assignedBy: 'client',
      status: 'pending',
      clientMessage: clientMessage || 'Please review and accept this case assignment.'
    });
    
    await assignment.save();
    
    // Update case status to show lawyer request is pending (don't set currentLawyer yet)
    await Case.findByIdAndUpdate(caseId, { 
      status: 'lawyer_requested',
      currentLawyer: null // Ensure no lawyer is set until accepted
    });
    
    console.log("Manual assignment request created:", assignment._id);
    
    res.status(201).json({
      message: "Assignment request sent to lawyer",
      assignment: assignment
    });
    
  } catch (error) {
    console.error("Error creating manual assignment:", error);
    res.status(500).json({ message: error.message });
  }
});

// Auto-assign lawyer to case
router.post("/auto-assign", protect, async (req, res) => {
  try {
    console.log("Auto-assign request received:", req.body);
    const { caseId } = req.body;
    
    // Get case details
    const caseData = await Case.findById(caseId);
    if (!caseData) {
      console.log("Case not found:", caseId);
      return res.status(404).json({ message: "Case not found" });
    }
    
    console.log("Case found:", caseData.caseNumber, "Type:", caseData.caseType);
    
    // Map case types to lawyer specializations (using exact enum values from VerifiedLawyer model)
    const specializationMap = {
      'smallClaims': ['Civil Litigation', 'Commercial Law'],
      'landDispute': ['Property Law', 'Civil Litigation'],
      'tenancy': ['Property Law', 'Civil Litigation'],
      'family': ['Family Law'],
      'consumer': ['Commercial Law', 'Civil Litigation'],
      'criminal': ['Criminal Defense'],
      'corporate': ['Corporate Law', 'Commercial Law'],
      'labor': ['Labor Law'],
      'tax': ['Tax Law'],
      'constitutional': ['Constitutional Law'],
      'intellectual': ['Intellectual Property'],
      'other': ['Civil Litigation'] // Default to Civil Litigation for general cases
    };
    
    const specializations = specializationMap[caseData.caseType] || ['Civil Litigation'];
    console.log("Looking for lawyers with specializations:", specializations);
    
    // Find best available lawyer for this case type
    // Find lawyers with matching specialization (check both old and new collections)
    let lawyer = await VerifiedLawyer.findOne({
      lawyerType: { $in: specializations },
      availability: true,
      isActive: true
    }).sort({ ratings: -1, passoutYear: 1 });
    
    // If not found in verified lawyers, check old user model
    if (!lawyer) {
      lawyer = await User.findOne({
        userType: 'lawyer',
        specialization: { $in: specializations },
        availability: true
      }).sort({ rating: -1, yearsExperience: -1 });
    }
    
    if (!lawyer) {
      console.log("No lawyer found, trying general practice");
      // Try to find any available lawyer in verified collection first
      let generalLawyer = await VerifiedLawyer.findOne({
        availability: true,
        isActive: true
      }).sort({ ratings: -1, passoutYear: 1 });
      
      // If not found, try old user model
      if (!generalLawyer) {
        generalLawyer = await User.findOne({
          userType: 'lawyer',
          availability: true
        }).sort({ rating: -1, yearsExperience: -1 });
      }
      
      if (!generalLawyer) {
        console.log("No lawyers available at all");
        return res.status(404).json({ message: "No available lawyers found" });
      }
      
      console.log("Found general lawyer:", generalLawyer.fullName || generalLawyer.name);
      
      // Create assignment request with general lawyer (pending approval)
      const assignment = await LawyerAssignment.create({
        case: caseId,
        lawyer: generalLawyer._id,
        assignedBy: 'system',
        status: 'pending',
        clientMessage: 'Auto-assignment by system. Please review and accept this case.'
      });
      
      // Update case status to show lawyer request pending (don't set currentLawyer yet)
      await Case.findByIdAndUpdate(caseId, {
        status: 'lawyer_requested',
        currentLawyer: null // Don't set lawyer until accepted
      });
      
      return res.json({ 
        message: "Lawyer assignment request sent successfully. The lawyer will review and respond to your request.",
        assignment,
        lawyer: {
          _id: generalLawyer._id,
          name: generalLawyer.fullName || generalLawyer.name,
          email: generalLawyer.email,
          specialization: generalLawyer.lawyerType ? [generalLawyer.lawyerType] : (generalLawyer.specialization || ['Civil Litigation'])
        }
      });
    }
    
    console.log("Found specialized lawyer:", lawyer.fullName || lawyer.name);
    console.log("Lawyer ID for assignment:", lawyer._id);
    console.log("Lawyer collection:", lawyer.fullName ? 'VerifiedLawyer' : 'User');
    
    // Create assignment request (pending approval)
    const assignment = await LawyerAssignment.create({
      case: caseId,
      lawyer: lawyer._id,
      assignedBy: 'system',
      status: 'pending',
      clientMessage: 'Auto-assignment by system. Please review and accept this case.'
    });
    
    console.log("Assignment created:", assignment._id, "for lawyer:", assignment.lawyer);
    
    // Update case status to show lawyer request pending (don't set currentLawyer yet)
    await Case.findByIdAndUpdate(caseId, {
      status: 'lawyer_requested',
      currentLawyer: null // Don't set lawyer until accepted
    });
    
    console.log("Lawyer assignment request sent successfully");
    
    res.json({ 
      message: "Lawyer assignment request sent successfully. The lawyer will review and respond to your request.",
      assignment,
      lawyer: {
        _id: lawyer._id,
        name: lawyer.fullName || lawyer.name,
        email: lawyer.email,
        specialization: lawyer.lawyerType ? [lawyer.lawyerType] : (lawyer.specialization || ['Civil Litigation'])
      }
    });
  } catch (error) {
    console.error("Auto-assign error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Client requests specific lawyer
router.post("/request", protect, async (req, res) => {
  try {
    console.log("Lawyer request received:", req.body);
    const { caseId, lawyerId, message } = req.body;
    
    // Check if client owns the case
    const caseData = await Case.findOne({ _id: caseId, user: req.user.id });
    if (!caseData) {
      return res.status(404).json({ message: "Case not found or access denied" });
    }
    
    // Check if lawyer exists and is available (check both collections)
    let lawyer = await VerifiedLawyer.findOne({
      _id: lawyerId,
      availability: true,
      isActive: true
    });
    
    // If not found in verified lawyers, check old user model
    if (!lawyer) {
      lawyer = await User.findOne({
        _id: lawyerId,
        userType: 'lawyer',
        availability: true
      });
    }
    
    if (!lawyer) {
      return res.status(404).json({ message: "Lawyer not available" });
    }
    
    // Check if there's already a pending assignment for this case
    const existingAssignment = await LawyerAssignment.findOne({ 
      case: caseId, 
      status: { $in: ['pending', 'accepted'] } 
    });
    
    if (existingAssignment) {
      return res.status(400).json({ message: "Case already has a pending or accepted lawyer assignment" });
    }
    
    // Create assignment request
    const assignment = await LawyerAssignment.create({
      case: caseId,
      lawyer: lawyerId,
      assignedBy: 'client',
      status: 'pending',
      clientMessage: message
    });
    
    // Update case status to show lawyer request is pending (don't set currentLawyer yet)
    await Case.findByIdAndUpdate(caseId, { 
      status: 'lawyer_requested',
      currentLawyer: null // Don't set lawyer until accepted
    });
    
    console.log("Lawyer request created successfully:", assignment._id);
    
    res.json({ 
      message: "Lawyer request sent successfully",
      assignment
    });
  } catch (error) {
    console.error("Error creating lawyer request:", error);
    res.status(500).json({ message: error.message });
  }
});

// Lawyer responds to assignment request
router.post("/response", protect, async (req, res) => {
  try {
    console.log("🚨 CRITICAL: Lawyer assignment response received");
    console.log("Request body:", req.body);
    console.log("User ID:", req.user.id);
    console.log("User type:", req.user.userType);
    
    const { assignmentId, accepted, response } = req.body;
    
    // Check if user is a lawyer
    if (req.user.userType !== 'lawyer' && req.user.userType !== 'verified_lawyer') {
      return res.status(403).json({ message: "Only lawyers can respond to assignments" });
    }
    
    // Find assignment with detailed debugging
    console.log(`🔍 Looking for assignment with ID: ${assignmentId} and lawyer: ${req.user.id}`);
    
    const assignment = await LawyerAssignment.findOne({
      _id: assignmentId,
      lawyer: req.user.id
    });
    
    if (!assignment) {
      console.error(`❌ Assignment not found with assignmentId: ${assignmentId} and lawyer: ${req.user.id}`);
      
      // Debug: Check if assignment exists with different lawyer ID
      const anyAssignment = await LawyerAssignment.findById(assignmentId);
      if (anyAssignment) {
        console.error(`⚠️ Assignment exists but with different lawyer: ${anyAssignment.lawyer} vs ${req.user.id}`);
        console.error(`⚠️ Assignment details:`, anyAssignment);
      } else {
        console.error(`❌ Assignment ${assignmentId} does not exist at all`);
      }
      
      return res.status(404).json({ message: "Assignment not found or you are not the assigned lawyer" });
    }
    
    console.log(`✅ Assignment found:`, assignment);
    console.log(`✅ Assignment lawyer: ${assignment.lawyer}`);
    console.log(`✅ Request user: ${req.user.id}`);
    console.log(`✅ IDs match: ${assignment.lawyer.toString() === req.user.id.toString()}`);
    console.log(`✅ Assignment case: ${assignment.case}`);
    
    // Update assignment
    assignment.status = accepted ? 'accepted' : 'rejected';
    assignment.lawyerResponse = response;
    assignment.responseDate = new Date();
    
    await assignment.save();
    
    if (accepted) {
      console.log(`🚨 LAWYER ACCEPTING ASSIGNMENT: ${assignmentId}`);
      console.log(`👨‍💼 Lawyer ID: ${req.user.id}`);
      console.log(`📋 Case ID: ${assignment.case}`);
      console.log(`🔧 Assignment object:`, assignment);
      
      // VERIFY CASE EXISTS BEFORE UPDATE
      const caseBeforeUpdate = await Case.findById(assignment.case);
      if (!caseBeforeUpdate) {
        console.error(`❌ CRITICAL: Case ${assignment.case} not found!`);
        return res.status(404).json({ message: "Case not found" });
      }
      
      console.log(`✅ Case found: ${caseBeforeUpdate.caseNumber}, current status: ${caseBeforeUpdate.status}, current lawyer: ${caseBeforeUpdate.currentLawyer}`);
      
      // CRITICAL FIX: Ensure proper ObjectId handling
      const mongoose = require('mongoose');
      const lawyerIdToUse = new mongoose.Types.ObjectId(req.user.id);
      console.log(`🔧 Will update case with lawyer ObjectId: ${lawyerIdToUse}`);
      console.log(`🔧 Lawyer ID type: ${typeof lawyerIdToUse}`);
      
      // BULLETPROOF UPDATE: Try multiple methods to ensure it works
      let updateSuccess = false;
      let updateResult = null;
      
      // Method 1: Standard update with ObjectId
      try {
        console.log(`🔧 Method 1: Attempting findByIdAndUpdate...`);
        updateResult = await Case.findByIdAndUpdate(assignment.case, {
          currentLawyer: lawyerIdToUse,
          status: 'lawyer_assigned'
        }, { new: true });
        
        console.log(`🔧 Method 1 raw result:`, updateResult);
        
        if (updateResult && updateResult.currentLawyer) {
          console.log(`✅ Method 1 SUCCESS: currentLawyer set to ${updateResult.currentLawyer}`);
          console.log(`✅ currentLawyer toString: ${updateResult.currentLawyer.toString()}`);
          updateSuccess = true;
        } else {
          console.error(`❌ Method 1 FAILED: updateResult exists but currentLawyer is null`);
        }
      } catch (error1) {
        console.error(`❌ Method 1 ERROR:`, error1);
      }
      
      // Method 2: If method 1 failed, try updateOne with string ID
      if (!updateSuccess) {
        try {
          console.log(`🔧 Method 2: Attempting updateOne with string ID...`);
          const result = await Case.updateOne(
            { _id: assignment.case },
            { $set: { currentLawyer: req.user.id, status: 'lawyer_assigned' } }
          );
          
          console.log(`🔧 Method 2 raw result:`, result);
          
          if (result.modifiedCount > 0) {
            console.log(`✅ Method 2 SUCCESS: Modified ${result.modifiedCount} document`);
            updateSuccess = true;
            updateResult = await Case.findById(assignment.case);
            console.log(`🔧 Method 2 verification result:`, updateResult);
          } else {
            console.error(`❌ Method 2 FAILED: modifiedCount = ${result.modifiedCount}`);
          }
        } catch (error2) {
          console.error(`❌ Method 2 ERROR:`, error2);
        }
      }
      
      // Method 3: If both failed, try direct document modification
      if (!updateSuccess) {
        try {
          console.log(`🔧 Method 3: Direct document modification...`);
          const caseDoc = await Case.findById(assignment.case);
          if (caseDoc) {
            caseDoc.currentLawyer = req.user.id;
            caseDoc.status = 'lawyer_assigned';
            const saveResult = await caseDoc.save();
            console.log(`🔧 Method 3 save result:`, saveResult);
            
            if (saveResult && saveResult.currentLawyer) {
              console.log(`✅ Method 3 SUCCESS: Direct save worked`);
              updateSuccess = true;
              updateResult = saveResult;
            }
          }
        } catch (error3) {
          console.error(`❌ Method 3 ERROR:`, error3);
        }
      }
      
      // FINAL VERIFICATION AND ERROR HANDLING
      if (!updateSuccess) {
        console.error(`🚨 CRITICAL FAILURE: All update methods failed for case ${assignment.case}`);
        return res.status(500).json({ 
          message: "Failed to assign lawyer to case - database update failed",
          assignmentId,
          caseId: assignment.case,
          lawyerId: lawyerIdToUse
        });
      }
      
      // VERIFICATION: Double-check the update worked
      const finalVerification = await Case.findById(assignment.case);
      if (finalVerification && finalVerification.currentLawyer) {
        console.log(`🎉 FINAL SUCCESS: Case ${assignment.case} now has currentLawyer: ${finalVerification.currentLawyer}`);
        console.log(`🎉 Status: ${finalVerification.status}`);
      } else {
        console.error(`🚨 VERIFICATION FAILED: currentLawyer is still null!`);
        return res.status(500).json({ 
          message: "Assignment accepted but failed to update case properly",
          debug: {
            caseId: assignment.case,
            lawyerId: lawyerIdToUse,
            finalCurrentLawyer: finalVerification?.currentLawyer,
            finalStatus: finalVerification?.status
          }
        });
      }
      
      // Update lawyer's current cases (optional - not critical for main functionality)
      try {
        await User.findByIdAndUpdate(req.user.id, {
          $push: { currentCases: assignment.case }
        });
        console.log(`✅ Updated User model for lawyer ${req.user.id}`);
      } catch (userError) {
        console.log('User model update failed, trying VerifiedLawyer model');
        try {
          await require('../Model/VerifiedLawyer').findByIdAndUpdate(req.user.id, {
            $push: { currentCases: assignment.case }
          });
          console.log(`✅ Updated VerifiedLawyer model for lawyer ${req.user.id}`);
        } catch (verifiedLawyerError) {
          console.log('VerifiedLawyer model update failed, but main assignment is complete');
        }
      }
      
      console.log(`🎉 ASSIGNMENT ACCEPTANCE COMPLETE: ${assignmentId} accepted, case ${assignment.case} updated with lawyer ${lawyerIdToUse}`);
    } else {
      // If rejected, remove current lawyer and reset status
      await Case.findByIdAndUpdate(assignment.case, {
        currentLawyer: null,
        status: 'verified' // Back to verified status, ready for new lawyer request
      });
      
      console.log(`Assignment ${assignmentId} rejected, case status reset to verified`);
    }
    
    res.json({ 
      message: `Assignment ${accepted ? 'accepted' : 'rejected'} successfully`,
      assignment
    });
  } catch (error) {
    console.error("Error processing lawyer response:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get pending assignments for a lawyer (working version)
// Get assignments for a specific case
router.get("/case/:caseId", protect, async (req, res) => {
  try {
    const { caseId } = req.params;
    const userId = req.user.id;
    
    console.log(`Getting assignments for case ${caseId} by user ${userId}`);
    
    // First verify the case belongs to the user
    const caseData = await Case.findOne({ _id: caseId, user: userId });
    if (!caseData) {
      return res.status(404).json({ message: "Case not found or access denied" });
    }
    
    // Get all assignments for this case
    const assignments = await LawyerAssignment.find({ case: caseId })
      .populate('lawyer', 'name email userType')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${assignments.length} assignments for case ${caseId}`);
    
    res.json({
      success: true,
      assignments: assignments
    });
    
  } catch (error) {
    console.error("Error fetching case assignments:", error);
    res.status(500).json({ 
      message: "Failed to fetch assignments",
      error: error.message 
    });
  }
});

router.get("/pending", protect, async (req, res) => {
  try {
    console.log("=== PENDING ASSIGNMENTS REQUEST ===");
    console.log("Lawyer ID:", req.user.id);
    console.log("User Type:", req.user.userType);
    
    // Check if user is a lawyer
    if (req.user.userType !== 'lawyer' && req.user.userType !== 'verified_lawyer') {
      return res.status(403).json({ message: "Only lawyers can view pending assignments" });
    }
    
    // Debug: Check all assignments for this lawyer (any status)
    const allAssignments = await LawyerAssignment.find({ lawyer: req.user.id });
    console.log(`Total assignments for this lawyer: ${allAssignments.length}`);
    allAssignments.forEach(a => console.log(`Assignment ${a._id}: status=${a.status}, case=${a.case}, assignedBy=${a.assignedBy}`));
    
    // Debug: Check all pending assignments (any lawyer)
    const allPendingAssignments = await LawyerAssignment.find({ status: 'pending' });
    console.log(`Total pending assignments in system: ${allPendingAssignments.length}`);
    allPendingAssignments.forEach(a => console.log(`Pending assignment ${a._id}: lawyer=${a.lawyer}, case=${a.case}`));
    
    // Find pending assignments for this lawyer
    const assignments = await LawyerAssignment.find({
      lawyer: req.user.id,
      status: 'pending'
    });
    
    console.log(`Found ${assignments.length} pending assignments for this specific lawyer`);
    
    if (assignments.length === 0) {
      return res.json({ assignments: [] });
    }
    
    // Manually enrich each assignment
    const Case = require('../Model/CaseModel');
    const User = require('../Model/UserModel');
    
    const enrichedAssignments = [];
    
    for (const assignment of assignments) {
      try {
        // Get case info
        const caseInfo = await Case.findById(assignment.case);
        
        let clientInfo = null;
        if (caseInfo && caseInfo.user) {
          clientInfo = await User.findById(caseInfo.user).select('name email');
        }
        
        enrichedAssignments.push({
          _id: assignment._id,
          status: assignment.status,
          assignedBy: assignment.assignedBy,
          clientMessage: assignment.clientMessage,
          createdAt: assignment.createdAt,
          case: {
            _id: caseInfo?._id,
            caseNumber: caseInfo?.caseNumber,
            caseType: caseInfo?.caseType,
            plaintiffName: caseInfo?.plaintiffName,
            defendantName: caseInfo?.defendantName,
            caseDescription: caseInfo?.caseDescription,
            district: caseInfo?.district, // Add district field
            user: {
              _id: clientInfo?._id,
              name: clientInfo?.name,
              email: clientInfo?.email
            }
          }
        });
      } catch (err) {
        console.error('Error enriching assignment:', err);
        // Include assignment with minimal data
        enrichedAssignments.push({
          _id: assignment._id,
          status: assignment.status,
          assignedBy: assignment.assignedBy,
          clientMessage: assignment.clientMessage,
          createdAt: assignment.createdAt,
          case: {
            caseNumber: 'Error loading case',
            caseType: 'unknown',
            district: 'Unknown',
            user: { name: 'Unknown' }
          }
        });
      }
    }
    
    console.log(`Returning ${enrichedAssignments.length} enriched assignments`);
    res.json({ assignments: enrichedAssignments });
    
  } catch (error) {
    console.error("Error fetching pending assignments:", error);
    res.status(500).json({ message: error.message });
  }
});

// Client requests lawyer to file the case in court
router.post("/request-court-filing", protect, async (req, res) => {
  try {
    console.log("=== FILING REQUEST DEBUG ===");
    console.log("Filing request received:", req.body);
    console.log("User ID:", req.user.id);
    const { caseId, message } = req.body;
    
    // Verify the case belongs to the requesting user
    const caseData = await Case.findById(caseId);
    if (!caseData) {
      console.log("❌ Case not found:", caseId);
      return res.status(404).json({ message: "Case not found" });
    }
    
    console.log("📝 Case found:", {
      caseNumber: caseData.caseNumber,
      status: caseData.status,
      caseUser: caseData.user,
      currentLawyer: caseData.currentLawyer,
      filingRequested: caseData.filingRequested
    });
    
    if (caseData.user.toString() !== req.user.id) {
      console.log("❌ User ID mismatch:", caseData.user.toString(), "vs", req.user.id);
      return res.status(403).json({ message: "You can only request filing for your own cases" });
    }
    
    // Check if case has an assigned lawyer
    if (!caseData.currentLawyer) {
      console.log("❌ No lawyer assigned");
      return res.status(400).json({ message: "Case must have an assigned lawyer before filing can be requested" });
    }
    
    // Check if case status allows filing request
    if (caseData.status !== 'lawyer_assigned') {
      console.log("❌ Case status not ready:", caseData.status);
      return res.status(400).json({ message: "Case is not ready for filing. Current status: " + caseData.status });
    }
    
    // Check if filing has already been requested
    if (caseData.filingRequested) {
      return res.status(400).json({ message: "Filing has already been requested for this case" });
    }
    
    // Update case with filing request (preserve currentLawyer)
    const currentCase = await Case.findById(caseId);
    await Case.findByIdAndUpdate(caseId, {
      filingRequested: true,
      filingRequestDate: new Date(),
      filingRequestMessage: message || 'Client requests to file this case in court.',
      status: 'filing_requested',
      // Preserve the currentLawyer field
      currentLawyer: currentCase.currentLawyer
    });
    
    console.log("Filing request created successfully for case:", caseData.caseNumber);
    
    res.json({
      message: "Filing request sent to your lawyer successfully",
      caseNumber: caseData.caseNumber
    });
    
  } catch (error) {
    console.error("Error creating filing request:", error);
    res.status(500).json({ message: error.message });
  }
});

// Lawyer submits case filing to court
router.post("/submit-court-filing", protect, async (req, res) => {
  try {
    console.log("Court filing request received:", req.body);
    const { caseId, courtName, courtAddress, courtDistrict, filingFee, hearingDate } = req.body;
    
    // Check if user is a lawyer
    if (req.user.userType !== 'lawyer' && req.user.userType !== 'verified_lawyer') {
      return res.status(403).json({ message: "Only lawyers can file cases in court" });
    }
    
    // Find the case
    const caseData = await Case.findById(caseId);
    if (!caseData) {
      return res.status(404).json({ message: "Case not found" });
    }
    
    // Check if the lawyer is assigned to this case
    if (!caseData.currentLawyer || caseData.currentLawyer.toString() !== req.user.id) {
      return res.status(403).json({ message: "You are not assigned to this case" });
    }
    
    // Check if filing has been requested by the client
    if (!caseData.filingRequested) {
      return res.status(400).json({ message: "Filing has not been requested for this case. Client must request court filing first." });
    }
    
    // Check if already filed
    if (caseData.status === 'filed') {
      return res.status(400).json({ message: "Case has already been filed in court" });
    }
    
    // Create court filing record
    const CourtFiling = require('../Model/CourtFiling');
    const courtFiling = new CourtFiling({
      case: caseId,
      lawyer: req.user.id,
      court: {
        name: courtName,
        address: courtAddress,
        district: courtDistrict
      },
      filingFee: filingFee || 0,
      status: 'filed',
      submittedAt: new Date(),
      confirmedAt: new Date(),
      filedAt: new Date(),
      hearingDate: hearingDate ? new Date(hearingDate) : undefined
    });
    
    // Generate court reference using same prefix as case number
    const courtReference = `CL${new Date().getFullYear()}-${caseId.slice(-6)}`;
    
    // Update court filing with reference
    courtFiling.courtReference = courtReference;
    await courtFiling.save();
    
    // Update case with court details and status (preserve currentLawyer)
    const currentCase = await Case.findById(caseId);
    await Case.findByIdAndUpdate(caseId, {
      status: 'filed',
      filingStatus: 'filed',
      courtDetails: {
        name: courtName,
        reference: courtReference,
        filingDate: new Date(),
        hearingDate: hearingDate ? new Date(hearingDate) : undefined,
        filedBy: req.user.id
      },
      // Preserve the currentLawyer field
      currentLawyer: currentCase.currentLawyer
    });
    
    console.log("Case filed successfully:", caseData.caseNumber);
    
    res.json({
      message: "Case filed in court successfully",
      courtFiling: courtFiling,
      caseNumber: caseData.caseNumber
    });
    
  } catch (error) {
    console.error("Error filing case in court:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get cases requiring filing for a lawyer
router.get("/cases-to-file", protect, async (req, res) => {
  try {
    console.log("=== CASES TO FILE DEBUG ===");
    console.log("Getting cases to file for lawyer:", req.user.id);
    console.log("User type:", req.user.userType);
    
    // Check if user is a lawyer
    if (req.user.userType !== 'lawyer' && req.user.userType !== 'verified_lawyer') {
      return res.status(403).json({ message: "Only lawyers can view cases to file" });
    }
    
    // Debug: Check all cases assigned to this lawyer
    const allAssignedCases = await Case.find({ currentLawyer: req.user.id });
    console.log(`📊 All cases assigned to this lawyer: ${allAssignedCases.length}`);
    allAssignedCases.forEach(c => console.log(`- Case ${c.caseNumber}: status=${c.status}, filingRequested=${c.filingRequested}`));
    
    // Find cases assigned to this lawyer that need filing
    const casesToFile = await Case.find({
      currentLawyer: req.user.id,
      filingRequested: true,
      status: 'filing_requested'
    }).populate('user', 'name fullName email').sort({ filingRequestDate: 1 });
    
    console.log(`✅ Found ${casesToFile.length} cases to file with query conditions`);
    casesToFile.forEach(c => console.log(`- Filing case ${c.caseNumber}: status=${c.status}, filingRequested=${c.filingRequested}`));
    
    res.json({ cases: casesToFile });
    
  } catch (error) {
    console.error("Error fetching cases to file:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get filed cases for a lawyer
router.get("/filed-cases", protect, async (req, res) => {
  try {
    console.log("Getting filed cases for lawyer:", req.user.id);
    
    // Check if user is a lawyer
    if (req.user.userType !== 'lawyer' && req.user.userType !== 'verified_lawyer') {
      return res.status(403).json({ message: "Only lawyers can view filed cases" });
    }
    
    // Find cases assigned to this lawyer that have been filed
    const filedCases = await Case.find({
      currentLawyer: req.user.id,
      status: 'filed'
    }).sort({ 'courtDetails.filingDate': -1 });
    
    console.log(`Found ${filedCases.length} filed cases`);
    
    // Manually populate user info from both UserModel and VerifiedClient
    const enrichedFiledCases = [];
    for (const caseItem of filedCases) {
      console.log(`\n🔍 Processing case ${caseItem.caseNumber}:`);
      console.log(`   User ID in case: ${caseItem.user}`);
      
      let clientInfo = null;
      
      // Try VerifiedClient first (since that's where real clients are)
      if (caseItem.user) {
        console.log('   Checking VerifiedClient model...');
        clientInfo = await VerifiedClient.findById(caseItem.user).select('fullName email');
        if (clientInfo) {
          console.log(`   ✅ Found in VerifiedClient: ${clientInfo.fullName}`);
          // Normalize the field names
          clientInfo = {
            _id: clientInfo._id,
            name: clientInfo.fullName,
            email: clientInfo.email,
            userType: 'verified_client'
          };
        } else {
          console.log('   ❌ Not found in VerifiedClient, trying UserModel...');
          // Try UserModel as fallback
          clientInfo = await User.findById(caseItem.user).select('name email userType');
          if (clientInfo) {
            console.log(`   ✅ Found in UserModel: ${clientInfo.name}`);
          } else {
            console.log('   ❌ Not found in either model');
          }
        }
      }
      
      // Add the case with populated user info
      const enrichedCase = caseItem.toObject();
      enrichedCase.user = clientInfo;
      enrichedFiledCases.push(enrichedCase);
      
      console.log(`   📋 Final result - Case ${caseItem.caseNumber} - Client: ${clientInfo?.name || 'Unknown'}`);
    }
    
    res.json({ cases: enrichedFiledCases });
    
  } catch (error) {
    console.error("Error fetching filed cases:", error);
    res.status(500).json({ message: error.message });
  }
});

// Download PDF for a specific case
router.get("/download-pdf/:caseId", protect, async (req, res) => {
  try {
    const { caseId } = req.params;
    console.log("PDF download request for case:", caseId, "by user:", req.user.id);
    
    // Find the case with all needed populations
    const caseData = await Case.findById(caseId)
      .populate('user', 'name email')
      .populate('currentLawyer', 'name email');
    
    if (!caseData) {
      return res.status(404).json({ message: "Case not found" });
    }
    
    // Check if user has access to this case
    const hasAccess = caseData.user._id.toString() === req.user.id || // Case owner (client)
                      (caseData.currentLawyer && caseData.currentLawyer.toString() === req.user.id); // Assigned lawyer
    
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied. You don't have permission to download this case PDF." });
    }
    
    // Generate PDF
    const pdfBuffer = await generateCasePDF(caseData);
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Case_${caseData.caseNumber}_${new Date().getTime()}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Send PDF
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({ message: "Error generating PDF: " + error.message });
  }
});

// Debug route to check all assignments
router.get("/debug/all-assignments", protect, async (req, res) => {
  try {
    if (req.user.userType !== 'admin' && req.user.userType !== 'verifier') {
      return res.status(403).json({ message: "Admin only" });
    }
    
    const assignments = await LawyerAssignment.find({}).populate('case', 'caseNumber').populate('lawyer', 'name fullName email');
    res.json({ 
      total: assignments.length,
      assignments: assignments.map(a => ({
        _id: a._id,
        caseNumber: a.case?.caseNumber || 'Unknown',
        lawyerName: a.lawyer?.fullName || a.lawyer?.name || 'Unknown',
        lawyerEmail: a.lawyer?.email || 'Unknown',
        status: a.status,
        assignedBy: a.assignedBy,
        createdAt: a.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Debug route to check available lawyers
router.get("/debug/lawyers", protect, async (req, res) => {
  try {
    if (req.user.userType !== 'admin' && req.user.userType !== 'verifier') {
      return res.status(403).json({ message: "Admin only" });
    }
    
    const verifiedLawyers = await VerifiedLawyer.find({}).select('fullName email lawyerType availability isActive');
    const userLawyers = await User.find({ userType: 'lawyer' }).select('name email specialization availability');
    
    res.json({ 
      verifiedLawyers: {
        total: verifiedLawyers.length,
        lawyers: verifiedLawyers.map(l => ({
          _id: l._id,
          name: l.fullName,
          email: l.email,
          specialization: l.lawyerType,
          availability: l.availability,
          isActive: l.isActive,
          collection: 'VerifiedLawyer'
        }))
      },
      userLawyers: {
        total: userLawyers.length,
        lawyers: userLawyers.map(l => ({
          _id: l._id,
          name: l.name,
          email: l.email,
          specialization: l.specialization,
          availability: l.availability,
          collection: 'User'
        }))
      }
    });
  } catch (error) {
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

    // Get lawyer details - try multiple approaches
    let lawyerName = 'Unknown Lawyer';
    let lawyerId = req.user.id;
    
    // 1. Try from populated currentLawyer
    if (caseData.currentLawyer?.name) {
      lawyerName = caseData.currentLawyer.name;
    } else if (caseData.currentLawyer?.fullName) {
      lawyerName = caseData.currentLawyer.fullName;
    } else {
      // 2. Try to fetch lawyer directly
      try {
        const lawyerUser = await User.findById(req.user.id);
        if (lawyerUser) {
          lawyerName = lawyerUser.name || lawyerUser.fullName || lawyerName;
        }
        
        // 3. Try VerifiedLawyer model as fallback
        if (lawyerName === 'Unknown Lawyer') {
          const VerifiedLawyer = require('../Model/VerifiedLawyer');
          const verifiedLawyer = await VerifiedLawyer.findOne({ userId: req.user.id });
          if (verifiedLawyer) {
            lawyerName = verifiedLawyer.fullName || verifiedLawyer.name || lawyerName;
          }
        }
      } catch (err) {
        console.log('❌ Could not fetch lawyer info:', err.message);
      }
    }
    
    // Get client information - handle case where user might not be populated
    let clientId = caseData.user?._id || caseData.user;
    let clientName = 'Unknown Client';
    
    // 1. Try from populated user
    if (caseData.user?.name) {
      clientName = caseData.user.name;
    } else if (caseData.user?.fullName) {
      clientName = caseData.user.fullName;
    } else {
      // 2. Try to fetch client directly from both models
      console.log('⚠️ Client info missing, trying to fetch from both models...');
      try {
        // Try UserModel first
        let clientUser = await User.findById(caseData.user);
        if (clientUser) {
          clientId = clientUser._id;
          clientName = clientUser.name || clientUser.fullName || clientName;
          console.log('✅ Found client in UserModel:', { id: clientId, name: clientName });
        } else {
          // Try VerifiedClient model
          clientUser = await VerifiedClient.findById(caseData.user);
          if (clientUser) {
            clientId = clientUser._id;
            clientName = clientUser.fullName || clientUser.name || clientName;
            console.log('✅ Found client in VerifiedClient:', { id: clientId, name: clientName });
          }
        }
      } catch (err) {
        console.log('❌ Could not fetch client info:', err.message);
      }
    }
    
    // Ensure we have required fields with fallbacks
    const finalClientId = clientId || new mongoose.Types.ObjectId();
    const finalClientName = clientName;
    const finalLawyerName = lawyerName;
    
    console.log('📋 Final data for schedule request:', {
      clientId: finalClientId,
      clientName: finalClientName,
      lawyerName: finalLawyerName,
      district: caseData.district
    });

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
      lawyerName: finalLawyerName,
      client: finalClientId,
      clientName: finalClientName,
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

// Get client's scheduled hearings
router.get("/client-schedule", protect, async (req, res) => {
  try {
    console.log('=== FETCHING CLIENT SCHEDULE ===');
    console.log('Client ID:', req.user.id);
    console.log('User Type:', req.user.userType);
    
    // Check if user is a client (allow various client user types)
    const allowedClientTypes = ['client', 'user', 'verified_client'];
    const restrictedTypes = ['lawyer', 'verified_lawyer', 'court_scheduler'];
    
    if (restrictedTypes.includes(req.user.userType)) {
      return res.status(403).json({ 
        message: "Access denied. This endpoint is for clients only.",
        userType: req.user.userType
      });
    }
    
    console.log('✅ User type allowed:', req.user.userType);

    // Import required models
    const ScheduledCase = require('../Model/ScheduledCase');
    const CourtScheduleRequest = require('../Model/CourtScheduleRequest');
    
    // Find all scheduled cases for this client
    console.log('🔍 Searching for scheduled hearings with client ID:', req.user.id);
    const scheduledHearings = await ScheduledCase.find({ 
      client: req.user.id 
    })
    .populate('case', 'caseNumber caseType plaintiffName defendantName status createdAt')
    .populate('lawyer', 'name email')
    .sort({ hearingDate: 1 });

    console.log(`Found ${scheduledHearings.length} scheduled hearings for client`);
    
    // Also get schedule requests (both scheduled and unscheduled) for this client
    console.log('🔍 Searching for schedule requests with client ID:', req.user.id);
    const scheduleRequests = await CourtScheduleRequest.find({ 
      client: req.user.id 
    })
    .populate('case', 'caseNumber caseType plaintiffName defendantName status')
    .populate('lawyer', 'name email')
    .sort({ createdAt: -1 });

    console.log(`Found ${scheduleRequests.length} schedule requests for client`);
    
    // Get cases for this client with enhanced lawyer information
    console.log('🔍 Searching for cases with user ID:', req.user.id);
    const clientCases = await Case.find({ 
      user: req.user.id,
      status: { $in: ['filed', 'scheduling_requested', 'hearing_scheduled'] }
    })
    .populate('currentLawyer', 'name email fullName')
    .sort({ createdAt: -1 });
    
    // Enhance cases with lawyer assignment data
    const enhancedClientCases = await Promise.all(
      clientCases.map(async (caseItem) => {
        let lawyerInfo = null;
        
        // If currentLawyer exists, use it
        if (caseItem.currentLawyer) {
          lawyerInfo = {
            name: caseItem.currentLawyer.name || caseItem.currentLawyer.fullName,
            email: caseItem.currentLawyer.email
          };
        } 
        // If no currentLawyer, try to get from assignments
        else {
          try {
            const assignments = await LawyerAssignment.find({ case: caseItem._id })
              .populate('lawyer', 'name email fullName')
              .sort({ createdAt: -1 });
            
            if (assignments.length > 0) {
              // Find accepted assignment first, then any assignment
              const acceptedAssignment = assignments.find(a => a.status === 'accepted');
              const assignment = acceptedAssignment || assignments[0];
              
              if (assignment.lawyer) {
                lawyerInfo = {
                  name: assignment.lawyer.name || assignment.lawyer.fullName,
                  email: assignment.lawyer.email
                };
                console.log(`✅ Found lawyer for case ${caseItem.caseNumber}: ${lawyerInfo.name}`);
              }
            }
          } catch (error) {
            console.log(`❌ Error fetching assignments for case ${caseItem.caseNumber}:`, error.message);
          }
        }
        
        // Return enhanced case object
        return {
          ...caseItem.toObject(),
          lawyerInfo: lawyerInfo
        };
      })
    );

    console.log(`Found ${enhancedClientCases.length} cases for client`);
    
    // Debug: Check scheduling data for hearing_scheduled cases
    const hearingScheduledCases = enhancedClientCases.filter(c => c.status === 'hearing_scheduled');
    console.log(`Found ${hearingScheduledCases.length} cases with hearing_scheduled status`);
    
    hearingScheduledCases.forEach(caseItem => {
      console.log(`🔍 Case ${caseItem.caseNumber} scheduling details:`, {
        hearingDate: caseItem.hearingDate,
        hearingTime: caseItem.hearingTime,
        courtroom: caseItem.courtroom,
        courtDetails: caseItem.courtDetails,
        status: caseItem.status
      });
    });
    
    // Calculate statistics
    const stats = {
      totalCases: enhancedClientCases.length,
      scheduledHearings: scheduledHearings.length,
      pendingRequests: scheduleRequests.filter(req => !req.isScheduled).length,
      completedHearings: scheduledHearings.filter(hearing => 
        new Date(hearing.hearingDate) < new Date()
      ).length,
      upcomingHearings: scheduledHearings.filter(hearing => 
        new Date(hearing.hearingDate) >= new Date()
      ).length
    };

    res.json({
      success: true,
      stats,
      scheduledHearings,
      scheduleRequests,
      clientCases: enhancedClientCases
    });
    
  } catch (error) {
    console.error("Error fetching client schedule:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching schedule data",
      error: error.message 
    });
  }
});

module.exports = router;
