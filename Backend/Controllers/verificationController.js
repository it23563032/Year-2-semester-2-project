// controllers/verificationController.js
const Verification = require("../Model/Verification");
const Case = require("../Model/CaseModel");

// Get verification status
const getVerificationStatus = async (req, res) => {
  try {
    const { caseId } = req.params;
    
    const verification = await Verification.findOne({ case: caseId });
    
    if (!verification) {
      return res.status(200).json({ 
        message: "Verification record not found",
        status: "pending" 
      });
    }
    
    res.status(200).json(verification);
  } catch (error) {
    console.error("Error fetching verification status:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create verification record
const createVerification = async (req, res) => {
  try {
    const { caseId, status, issues } = req.body;
    
    const verification = await Verification.create({
      case: caseId,
      status,
      issues,
      verificationDate: status === 'verified' ? new Date() : null
    });
    
    // Update case status
    await Case.findByIdAndUpdate(caseId, {
      verificationStatus: status
    });
    
    res.status(201).json(verification);
  } catch (error) {
    console.error("Error creating verification:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Auto verification function (call this after case creation)
const autoVerifyCase = async (caseId) => {
  try {
    console.log(`Starting auto-verification for case: ${caseId}`);
    
    const caseData = await Case.findById(caseId);
    
    if (!caseData) {
      throw new Error("Case not found");
    }
    
    console.log(`Case data found: ${caseData.caseNumber}`);
    
    // Check for completeness
    const issues = [];
    
    // EXTREMELY relaxed verification criteria - all cases will be verified
    if (!caseData.documents || caseData.documents.length < 1) {
      issues.push({
        field: "documents",
        message: "At least one document is required"
      });
    }
    
    if (!caseData.caseDescription || caseData.caseDescription.length < 3) {
      issues.push({
        field: "description",
        message: "Case description is too brief (minimum 3 characters)"
      });
    }
    
    if (!caseData.plaintiffNIC || caseData.plaintiffNIC.length < 2) {
      issues.push({
        field: "plaintiffNIC",
        message: "Plaintiff NIC number is required"
      });
    }
    
    // ALL cases will be automatically verified - no rejections
    let status = 'verified';
    // Only reject if ALL three critical fields are completely empty
    if (issues.length >= 3 && 
        (!caseData.documents || caseData.documents.length === 0) &&
        (!caseData.caseDescription || caseData.caseDescription.trim().length === 0) &&
        (!caseData.plaintiffNIC || caseData.plaintiffNIC.trim().length === 0)) {
      status = 'rejected';
    }
    
    console.log(`Verification status determined: ${status}, Issues: ${issues.length}`);
    
    // Create verification record
    const verification = await Verification.create({
      case: caseId,
      status,
      issues,
      verificationDate: status === 'verified' ? new Date() : null
    });
    
    console.log(`Verification record created: ${verification._id}`);
    
    // Update case status
    await Case.findByIdAndUpdate(caseId, {
      verificationStatus: status
    });
    
    console.log(`Case ${caseId} auto-verified with status: ${status}`);
    return { status, issues };
  } catch (error) {
    console.error("Auto verification error:", error);
    throw error;
  }
};

module.exports = {
  getVerificationStatus,
  createVerification,
  autoVerifyCase
};