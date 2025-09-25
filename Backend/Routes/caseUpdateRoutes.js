const express = require("express");
const Case = require("../Model/CaseModel");
const CaseUpdate = require("../Model/CaseUpdateModel");
const User = require("../Model/UserModel");
const AuthController = require("../Controllers/AuthControllers");
const { protect } = require("../Controllers/UnverifiedAuthController");
const router = express.Router();

// Get pending updates for a case (lawyer only)
router.get("/pending/:caseId", protect, async (req, res) => {
  try {
    const { caseId } = req.params;
    
    // Check if user is a lawyer assigned to this case
    const caseData = await Case.findOne({
      _id: caseId,
      currentLawyer: req.user.id
    });

    if (!caseData) {
      return res.status(404).json({ message: "Case not found or you are not assigned to this case." });
    }

    const updates = await CaseUpdate.find({
      case: caseId,
      status: "pending"
    }).populate('user', 'name email');

    res.json({ updates });
  } catch (error) {
    console.error("Error fetching pending updates:", error);
    res.status(500).json({ message: error.message });
  }
});

// Request case update (client only)
router.post("/request", protect, async (req, res) => {
  try {
    const { caseId, updateType, newValue, reason } = req.body;
    
    // Check if user is the case owner
    const caseData = await Case.findOne({
      _id: caseId,
      user: req.user.id
    });

    if (!caseData) {
      return res.status(404).json({ message: "Case not found or access denied." });
    }

    // Prevent updates for cases that have actually been filed in court
    if (caseData.courtDetails && caseData.courtDetails.filingDate) {
      return res.status(400).json({ message: "Cannot update cases that have been filed with the court." });
    }

    // Get old value based on update type
    let oldValue;
    switch (updateType) {
      case "description":
        oldValue = caseData.caseDescription;
        break;
      case "relief_sought":
        oldValue = caseData.reliefSought;
        break;
      case "case_value":
        oldValue = caseData.caseValue;
        break;
      case "incident_date":
        oldValue = caseData.incidentDate;
        break;
      case "defendant_info":
        oldValue = {
          name: caseData.defendantName,
          nic: caseData.defendantNIC,
          phone: caseData.defendantPhone,
          email: caseData.defendantEmail,
          address: caseData.defendantAddress
        };
        break;
      default:
        oldValue = null;
    }

    // Create update request
    const updateRequest = new CaseUpdate({
      case: caseId,
      user: req.user.id,
      updateType,
      oldValue,
      newValue,
      reason
    });

    await updateRequest.save();

    res.json({ 
      message: "Update request submitted successfully. Your lawyer will review it.",
      updateRequest 
    });
  } catch (error) {
    console.error("Error requesting case update:", error);
    res.status(500).json({ message: error.message });
  }
});

// Review update request (lawyer only)
router.put("/review/:updateId", protect, async (req, res) => {
  try {
    const { updateId } = req.params;
    const { status, reviewNotes } = req.body;
    
    // Check if user is a lawyer
    if (req.user.userType !== 'lawyer') {
      return res.status(403).json({ message: "Access denied. Only lawyers can review update requests." });
    }

    const updateRequest = await CaseUpdate.findById(updateId).populate('case');
    
    if (!updateRequest) {
      return res.status(404).json({ message: "Update request not found." });
    }

    // Check if lawyer is assigned to this case
    if (updateRequest.case.currentLawyer.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied. You are not assigned to this case." });
    }

    // Update the request
    updateRequest.status = status;
    updateRequest.reviewedBy = req.user.id;
    updateRequest.reviewNotes = reviewNotes;
    updateRequest.reviewedAt = new Date();

    await updateRequest.save();

    // If approved, apply the update to the case
    if (status === 'approved') {
      const caseData = await Case.findById(updateRequest.case._id);
      
      switch (updateRequest.updateType) {
        case "description":
          caseData.caseDescription = updateRequest.newValue;
          break;
        case "relief_sought":
          caseData.reliefSought = updateRequest.newValue;
          break;
        case "case_value":
          caseData.caseValue = updateRequest.newValue;
          break;
        case "incident_date":
          caseData.incidentDate = updateRequest.newValue;
          break;
        case "defendant_info":
          if (updateRequest.newValue.name) caseData.defendantName = updateRequest.newValue.name;
          if (updateRequest.newValue.nic) caseData.defendantNIC = updateRequest.newValue.nic;
          if (updateRequest.newValue.phone) caseData.defendantPhone = updateRequest.newValue.phone;
          if (updateRequest.newValue.email) caseData.defendantEmail = updateRequest.newValue.email;
          if (updateRequest.newValue.address) caseData.defendantAddress = updateRequest.newValue.address;
          break;
      }
      
      await caseData.save();
    }

    res.json({ 
      message: `Update request ${status} successfully`,
      updateRequest 
    });
  } catch (error) {
    console.error("Error reviewing update request:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get update history for a case
router.get("/history/:caseId", protect, async (req, res) => {
  try {
    const { caseId } = req.params;
    
    // Check if user has access to this case
    const caseData = await Case.findOne({
      _id: caseId,
      $or: [
        { user: req.user.id },
        { currentLawyer: req.user.id }
      ]
    });

    if (!caseData) {
      return res.status(404).json({ message: "Case not found or access denied." });
    }

    const updates = await CaseUpdate.find({
      case: caseId
    })
    .populate('user', 'name')
    .populate('reviewedBy', 'name')
    .sort({ createdAt: -1 });

    res.json({ updates });
  } catch (error) {
    console.error("Error fetching update history:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
