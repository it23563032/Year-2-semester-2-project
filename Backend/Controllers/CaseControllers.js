const Case = require("../Model/CaseModel");
const User = require("../Model/UserModel");
const VerifiedClient = require("../Model/VerifiedClient");
const VerifiedLawyer = require("../Model/VerifiedLawyer");
const mongoose = require("mongoose");

// Get all cases (for admin purposes)
const getAllCases = async (req, res, next) => {
    try {
        const cases = await Case.find().sort({ createdAt: -1 });
        
        if (!cases || cases.length === 0) {
            return res.status(404).json({ message: "No cases found" });
        }

        return res.status(200).json({ cases });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Server error", error: err.message });
    }
};
// Add new case (with user association)
const addCase = async (req, res, next) => {
  try {
    // Get user from protected route
    const userId = req.user.id;
    
    console.log("=== BACKEND CASE SUBMISSION DEBUG ===");
    console.log("User ID:", userId);
    console.log("Full request body:", req.body);
    console.log("District field specifically:", req.body.district);
    console.log("District type:", typeof req.body.district);
    console.log("All body keys:", Object.keys(req.body));
    console.log("==========================================");
    
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
      documents
    } = req.body;

    // Create the case data with proper document formatting
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
      // Handle documents properly
      documents: documents ? documents.map(doc => ({
        filename: doc.filename || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        originalName: doc.originalName || 'document',
        uploadDate: new Date()
      })) : [],
      user: userId  // Associate case with user
    };

    console.log("=== CASE DATA CREATION DEBUG ===");
    console.log("Case data object:", caseData);
    console.log("District in case data:", caseData.district);
    console.log("District type:", typeof caseData.district);
    console.log("======================================");

    const newCase = new Case(caseData);

    console.log("=== MONGOOSE CASE OBJECT DEBUG ===");
    console.log("New case object:", newCase);
    console.log("District in new case:", newCase.district);
    console.log("===================================");

    try {
      await newCase.save();
      console.log("=== CASE SAVED DEBUG ===");
      console.log("Case saved successfully with ID:", newCase._id);
      console.log("District after save:", newCase.district);
      console.log("Full saved case:", newCase.toObject());
      console.log("=========================");
    } catch (saveError) {
      console.error("Error saving case:", saveError);
      console.error("Save error details:", {
        name: saveError.name,
        message: saveError.message,
        code: saveError.code,
        errors: saveError.errors
      });
      throw saveError; // Re-throw to be caught by outer catch
    }

    // Add case to user's cases array (check which collection the user is in)
    try {
      let userUpdate = null;
      
      // Try verified client first
      userUpdate = await VerifiedClient.findByIdAndUpdate(userId, {
        $push: { cases: newCase._id }
      });
      
      // If not found in verified clients, try old user model
      if (!userUpdate) {
        userUpdate = await User.findByIdAndUpdate(userId, {
          $push: { cases: newCase._id }
        });
      }
      
      console.log("User updated with new case ID:", userUpdate ? "Success" : "User not found in any collection");
    } catch (userUpdateError) {
      console.error("Error updating user:", userUpdateError);
      // Don't fail the case creation if user update fails
    }

    // Trigger automatic verification after 3 seconds
    setTimeout(async () => {
      try {
        const { autoVerifyCase } = require('../Controllers/verificationController');
        console.log(`Starting auto-verification for case: ${newCase._id} after 3 seconds`);
        await autoVerifyCase(newCase._id);
        console.log(`Auto-verification completed for case: ${newCase._id}`);
        
        // After verification, trigger lawyer assignment
        setTimeout(async () => {
          try {
            console.log(`Starting auto-lawyer assignment for case: ${newCase._id} after verification`);
            const axios = require('axios');
            await axios.post(`http://localhost:5000/api/lawyer-assignment/auto-assign`, {
              caseId: newCase._id
            }, {
              headers: {
                'Authorization': `Bearer ${req.headers.authorization?.split(' ')[1]}`
              }
            });
            console.log(`Auto-lawyer assignment completed for case: ${newCase._id}`);
          } catch (assignmentError) {
            console.error("Auto lawyer assignment error:", assignmentError.message);
            // Don't fail if lawyer assignment fails
          }
        }, 2000); // 2 seconds after verification
        
      } catch (error) {
        console.error("Auto verification error:", error);
        // Don't fail the case creation if auto-verification fails
      }
    }, 3000); // Exactly 3 seconds delay

    // Return response
    console.log("Sending success response:", {
      message: "Case submitted successfully",
      caseId: newCase._id,
      caseNumber: newCase.caseNumber
    });
    
    return res.status(201).json({
      message: "Case submitted successfully",
      case: newCase
    });

  } catch (err) {
    console.error("Error in addCase:", err);
    console.error("Error stack:", err.stack);
    
    // Check for specific validation errors
    if (err.name === 'ValidationError') {
      console.error("Validation errors:", err.errors);
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: Object.values(err.errors).map(e => e.message)
      });
    }
    
    if (err.code === 11000) {
      console.error("Duplicate key error:", err.keyValue);
      return res.status(400).json({ 
        message: "Duplicate case number", 
        error: "A case with this number already exists"
      });
    }
    
    return res.status(500).json({ message: "Unable to add case", error: err.message });
  }
};

// Get case by ID
const getCaseById = async (req, res, next) => {
    try {
        const id = req.params.id;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid case ID format" });
        }

        const caseData = await Case.findById(id);
        
        if (!caseData) {
            return res.status(404).json({ message: "Case not found" });
        }

        // Manually resolve user info from multiple collections
        const getUserInfo = async (userId) => {
            if (!userId) return null;
            
            // Try VerifiedClient first
            let user = await VerifiedClient.findById(userId).select('fullName email');
            if (user) {
                return { _id: user._id, name: user.fullName, email: user.email, userType: 'verified_client' };
            }
            
            // Try VerifiedLawyer
            user = await VerifiedLawyer.findById(userId).select('fullName email');
            if (user) {
                return { _id: user._id, name: user.fullName, email: user.email, userType: 'verified_lawyer' };
            }
            
            // Try original User model
            user = await User.findById(userId).select('name email userType');
            if (user) {
                return { _id: user._id, name: user.name, email: user.email, userType: user.userType };
            }
            
            return null;
        };

        // Get user and lawyer info
        const userInfo = await getUserInfo(caseData.user);
        const lawyerInfo = await getUserInfo(caseData.currentLawyer);
        
        // Create response with resolved user info
        const caseResponse = {
            ...caseData.toObject(),
            user: userInfo,
            currentLawyer: lawyerInfo
        };

        return res.status(200).json({ case: caseResponse });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Update case
const updateCase = async (req, res, next) => {
    try {
        const id = req.params.id;
        const updateData = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid case ID format" });
        }

        const updatedCase = await Case.findByIdAndUpdate(
            id, 
            updateData, 
            { new: true, runValidators: true }
        );

        if (!updatedCase) {
            return res.status(404).json({ message: "Case not found" });
        }

        return res.status(200).json({
            message: "Case updated successfully",
            case: updatedCase
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Unable to update case", error: err.message });
    }
};

// Delete case
const deleteCase = async (req, res, next) => {
    try {
        const id = req.params.id;
        const userId = req.user.id;

        console.log(`Delete request for case ID: ${id} by user: ${userId}`);

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid case ID format" });
        }

        // First find the case to verify ownership and check if it's filed
        const caseToDelete = await Case.findById(id);
        
        if (!caseToDelete) {
            return res.status(404).json({ message: "Case not found" });
        }

        console.log(`Found case: ${caseToDelete._id}, owner: ${caseToDelete.user}, status: ${caseToDelete.status}`);
        
        // Check ownership - only allow users to delete their own cases
        if (caseToDelete.user.toString() !== userId.toString()) {
            return res.status(403).json({ message: "You do not have permission to delete this case" });
        }

        // Prevent deletion of filed cases
        if (caseToDelete.status === 'filed') {
            return res.status(400).json({ message: "Cannot delete cases that have been filed with the court" });
        }

        // Now delete the case
        const deletedCase = await Case.findByIdAndDelete(id);

        if (!deletedCase) {
            return res.status(404).json({ message: "Case not found" });
        }

        console.log(`Case deleted successfully: ${deletedCase._id}`);

        // Remove case from user's cases array
        await User.findByIdAndUpdate(deletedCase.user, {
            $pull: { cases: deletedCase._id }
        });

        return res.status(200).json({ message: "Case deleted successfully" });
    } catch (err) {
        console.error('Delete case error:', err);
        return res.status(500).json({ message: "Unable to delete case", error: err.message });
    }
};

// Get cases by status
const getCasesByStatus = async (req, res, next) => {
    try {
        const { status } = req.params;
        
        const cases = await Case.find({ status }).sort({ createdAt: -1 });
        
        if (!cases || cases.length === 0) {
            return res.status(404).json({ message: `No ${status} cases found` });
        }

        return res.status(200).json({ cases });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Server error", error: err.message });
    }
};

// ... existing code ...

// In CaseControllers.js, update getMyCases function:
const getMyCases = async (req, res, next) => {
  try {
    console.log('=== GET MY CASES DEBUG ===');
    const userId = req.user.id;
    console.log('👤 User ID from token:', userId);
    console.log('👤 User details from token:', req.user);
    
    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log('❌ Invalid user ID format:', userId);
      return res.status(400).json({ message: "Invalid user ID format" });
    }
    
    console.log('🔍 Searching for cases with user ID:', userId);
    const cases = await Case.find({ user: userId })
      .populate('currentLawyer', 'fullName name lawyerType email phone')
      .sort({ createdAt: -1 });
    console.log(`📊 Found ${cases.length} cases for user`);
    
    // AGGRESSIVE auto-fix for cases without currentLawyer populated
    const LawyerAssignment = require('../Model/LawyerAssignment');
    const VerifiedLawyer = require('../Model/VerifiedLawyer');
    
    let fixedCases = 0;
    
    console.log('🔍 Starting aggressive auto-fix for lawyer assignments...');
    
    for (let caseItem of cases) {
      // Check if case should have a lawyer but doesn't - ESPECIALLY lawyer_assigned status
      if (!caseItem.currentLawyer && (
        caseItem.status === 'hearing_scheduled' || 
        caseItem.status === 'filed' || 
        caseItem.status === 'lawyer_assigned' ||
        caseItem.status === 'filing_requested' ||
        caseItem.status === 'scheduling_requested'
      )) {
        console.log(`🔍 Auto-fixing lawyer assignment for case ${caseItem.caseNumber} (Status: ${caseItem.status})`);
        
        // Special handling for cases with "lawyer_assigned" status but no currentLawyer
        if (caseItem.status === 'lawyer_assigned') {
          console.log(`🚨 CRITICAL: Case ${caseItem.caseNumber} has 'lawyer_assigned' status but no currentLawyer!`);
          console.log(`🔧 This is a data integrity issue that must be fixed immediately!`);
        }
        
        // Find accepted assignment for this case
        let assignment = await LawyerAssignment.findOne({
          case: caseItem._id,
          status: 'accepted'
        }).populate('lawyer', 'fullName name lawyerType email phone');
        
        if (assignment && assignment.lawyer) {
          console.log(`✅ Found accepted assignment for case ${caseItem.caseNumber}:`, assignment.lawyer.fullName || assignment.lawyer.name);
          
          // Update the case in the database to fix it permanently
          await Case.findByIdAndUpdate(caseItem._id, {
            currentLawyer: assignment.lawyer._id
          });
          
          // Update the current object for immediate return
          caseItem.currentLawyer = assignment.lawyer;
          fixedCases++;
        } else {
          console.log(`⚠️ No accepted assignment found for case ${caseItem.caseNumber}, checking pending assignments...`);
          
          // For lawyer_assigned status cases, this is a critical error - force fix
          if (caseItem.status === 'lawyer_assigned') {
            console.log(`🚨 CRITICAL ERROR: Case ${caseItem.caseNumber} has 'lawyer_assigned' status but no accepted assignment!`);
            
            // Try to find ANY assignment for this case and force accept it
            const anyAssignment = await LawyerAssignment.findOne({
              case: caseItem._id
            }).populate('lawyer', 'fullName name lawyerType email phone').sort({ createdAt: -1 });
            
            if (anyAssignment && anyAssignment.lawyer) {
              console.log(`🔧 Force-fixing: Found assignment for case ${caseItem.caseNumber}, forcing acceptance...`);
              
              // Force accept the assignment
              anyAssignment.status = 'accepted';
              anyAssignment.responseDate = new Date();
              anyAssignment.lawyerResponse = 'Auto-accepted due to lawyer_assigned status mismatch';
              await anyAssignment.save();
              
              // Update the case
              await Case.findByIdAndUpdate(caseItem._id, {
                currentLawyer: anyAssignment.lawyer._id,
                status: 'lawyer_assigned'
              });
              
              caseItem.currentLawyer = anyAssignment.lawyer;
              fixedCases++;
              console.log(`✅ FORCE-FIXED case ${caseItem.caseNumber} with lawyer ${anyAssignment.lawyer.fullName || anyAssignment.lawyer.name}`);
            } else {
              console.log(`❌ CRITICAL: No assignments at all found for lawyer_assigned case ${caseItem.caseNumber}`);
            }
          }
          // For hearing_scheduled cases, auto-accept pending assignments
          else if (caseItem.status === 'hearing_scheduled') {
            const pendingAssignment = await LawyerAssignment.findOne({
              case: caseItem._id,
              status: 'pending'
            }).populate('lawyer', 'fullName name lawyerType email phone');
            
            if (pendingAssignment && pendingAssignment.lawyer) {
              console.log(`🔄 Auto-accepting pending assignment for hearing_scheduled case ${caseItem.caseNumber}`);
              
              // Accept the assignment
              pendingAssignment.status = 'accepted';
              pendingAssignment.responseDate = new Date();
              pendingAssignment.lawyerResponse = 'Auto-accepted for hearing scheduled case';
              await pendingAssignment.save();
              
              // Update the case - DON'T change status to hearing_scheduled unless properly scheduled
              await Case.findByIdAndUpdate(caseItem._id, {
                currentLawyer: pendingAssignment.lawyer._id,
                status: 'lawyer_assigned' // Correct status - not hearing_scheduled until court scheduler schedules it
              });
              
              // Update the current object
              caseItem.currentLawyer = pendingAssignment.lawyer;
              fixedCases++;
              console.log(`✅ Auto-accepted and fixed case ${caseItem.caseNumber}`);
            } else {
              console.log(`❌ No lawyer assignment found for case ${caseItem.caseNumber}`);
            }
          }
        }
      }
    }
    
    if (fixedCases > 0) {
      console.log(`🔧 Auto-fixed ${fixedCases} cases with missing lawyer assignments`);
    }
    
    if (cases.length > 0) {
      console.log('📋 User\'s cases:');
      cases.forEach((caseItem, index) => {
        console.log(`${index + 1}. ${caseItem.caseNumber} - ${caseItem.caseType} - Status: ${caseItem.status}`);
      });
    } else {
      console.log('⚠️ No cases found for this user');
      
      // Debug: Check all cases to see what users they belong to
      const allCases = await Case.find({});
      console.log(`📊 Total cases in database: ${allCases.length}`);
      if (allCases.length > 0) {
        console.log('All cases and their user IDs:');
        allCases.forEach((caseItem, index) => {
          console.log(`${index + 1}. ${caseItem.caseNumber} - User: ${caseItem.user} - Matches current user: ${caseItem.user.toString() === userId}`);
        });
      }
    }
    
    // Return empty array instead of 404 when no cases found
    return res.status(200).json({ cases: cases || [] });
  } catch (err) {
    console.error('❌ Error in getMyCases:', err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ... existing code ...
// Get a specific case for the current user (to ensure users can only access their own cases)
const getMyCaseById = async (req, res, next) => {
    try {
        const caseId = req.params.id;
        const userId = req.user.id;
        
        if (!mongoose.Types.ObjectId.isValid(caseId)) {
            return res.status(400).json({ message: "Invalid case ID format" });
        }

        const caseData = await Case.findOne({ _id: caseId, user: userId });
        
        if (!caseData) {
            return res.status(404).json({ message: "Case not found or you don't have access to this case" });
        }

        return res.status(200).json({ case: caseData });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Server error", error: err.message });
    }
};
exports.getAllCases = getAllCases;
exports.addCase = addCase;
exports.getCaseById = getCaseById;
exports.updateCase = updateCase;
exports.deleteCase = deleteCase;
exports.getCasesByStatus = getCasesByStatus;
exports.getMyCases = getMyCases;
exports.getMyCaseById = getMyCaseById;
