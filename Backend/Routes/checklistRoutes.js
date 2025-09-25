const express = require("express");
const Checklist = require("../Model/ChecklistModel");
const Case = require("../Model/CaseModel");
const { protect } = require("../Controllers/UnverifiedAuthController");
const router = express.Router();

// Get checklist for a specific case
router.get("/case/:caseId", protect, async (req, res) => {
  try {
    const { caseId } = req.params;
    const userId = req.user.id;

    // Verify the case belongs to the user
    const caseData = await Case.findOne({ _id: caseId, user: userId });
    if (!caseData) {
      return res.status(404).json({ message: "Case not found or access denied" });
    }

    // Find or create checklist for this case
    let checklist = await Checklist.findOne({ user: userId, case: caseId });
    
    if (!checklist) {
      // Create new checklist with default empty state
      checklist = new Checklist({
        user: userId,
        case: caseId,
        checklistItems: new Map()
      });
      await checklist.save();
    }

    res.json({
      success: true,
      checklist: {
        _id: checklist._id,
        checklistItems: Object.fromEntries(checklist.checklistItems),
        lastUpdated: checklist.lastUpdated
      }
    });

  } catch (error) {
    console.error("Error fetching checklist:", error);
    res.status(500).json({
      message: "Failed to fetch checklist",
      error: error.message
    });
  }
});

// Update checklist items for a specific case
router.put("/case/:caseId", protect, async (req, res) => {
  try {
    const { caseId } = req.params;
    const { checklistItems } = req.body;
    const userId = req.user.id;

    // Verify the case belongs to the user
    const caseData = await Case.findOne({ _id: caseId, user: userId });
    if (!caseData) {
      return res.status(404).json({ message: "Case not found or access denied" });
    }

    // Find or create checklist for this case
    let checklist = await Checklist.findOne({ user: userId, case: caseId });
    
    if (!checklist) {
      checklist = new Checklist({
        user: userId,
        case: caseId,
        checklistItems: new Map()
      });
    }

    // Update checklist items
    checklist.checklistItems = new Map(Object.entries(checklistItems || {}));
    checklist.lastUpdated = new Date();
    
    await checklist.save();

    res.json({
      success: true,
      message: "Checklist updated successfully",
      checklist: {
        _id: checklist._id,
        checklistItems: Object.fromEntries(checklist.checklistItems),
        lastUpdated: checklist.lastUpdated
      }
    });

  } catch (error) {
    console.error("Error updating checklist:", error);
    res.status(500).json({
      message: "Failed to update checklist",
      error: error.message
    });
  }
});

// Get all checklists for a user
router.get("/user", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const checklists = await Checklist.find({ user: userId })
      .populate('case', 'caseNumber caseType district status')
      .sort({ lastUpdated: -1 });

    res.json({
      success: true,
      checklists: checklists.map(checklist => ({
        _id: checklist._id,
        case: checklist.case,
        checklistItems: Object.fromEntries(checklist.checklistItems),
        lastUpdated: checklist.lastUpdated
      }))
    });

  } catch (error) {
    console.error("Error fetching user checklists:", error);
    res.status(500).json({
      message: "Failed to fetch checklists",
      error: error.message
    });
  }
});

module.exports = router;
