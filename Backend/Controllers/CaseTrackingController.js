const CaseTracking = require('../Model/CaseTracking');
const CaseModel = require('../Model/CaseModel');
const UserModel = require('../Model/UserModel');

// Get all cases for tracking dashboard (for court scheduler)
const getAllCasesForTracking = async (req, res) => {
  try {
    console.log('=== FETCHING ALL CASES FOR TRACKING ===');
    const { district, status } = req.query;
    
    let query = {};
    if (district && district !== 'all') {
      query.district = district;
    }
    if (status && status !== 'all') {
      query.status_dummy = status;
    }
    
    console.log('Query:', query);
    
    const cases = await CaseTracking.find(query)
      .populate('case', 'caseNumber caseType status')
      .populate('lawyer', 'name email')
      .populate('client', 'name email')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${cases.length} cases for tracking`);
    
    res.json({
      success: true,
      count: cases.length,
      cases
    });
  } catch (error) {
    console.error('Error fetching cases for tracking:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cases for tracking',
      error: error.message
    });
  }
};

// Update case status (for court scheduler)
const updateCaseStatus = async (req, res) => {
  try {
    const { trackingId } = req.params;
    const { status, notes, hearingDate, hearingTime, courtroom } = req.body;
    
    console.log('=== UPDATING CASE STATUS ===');
    console.log('Tracking ID:', trackingId);
    console.log('New Status:', status);
    
    const caseTracking = await CaseTracking.findById(trackingId);
    if (!caseTracking) {
      return res.status(404).json({
        success: false,
        message: 'Case tracking record not found'
      });
    }
    
    // Get current user info
    const currentUser = await UserModel.findById(req.user.id);
    const currentUserName = currentUser ? currentUser.name : 'Unknown User';
    
    // Add to status history
    const statusUpdate = {
      status: status,
      updatedBy: req.user.id,
      updatedByName: currentUserName,
      notes: notes || '',
      updatedAt: new Date()
    };
    
    // Update the case tracking record
    const updateData = {
      status_dummy: status,
      $push: { statusHistory: statusUpdate }
    };
    
    // Handle specific status updates
    if (status === 'hearing_scheduled' && hearingDate && hearingTime) {
      updateData.hearingDetails = {
        hearingDate: new Date(hearingDate),
        hearingTime: hearingTime,
        courtroom: courtroom || 'Main Court'
      };
    } else if (status === 'adjourned') {
      updateData.adjournmentDetails = {
        originalDate: caseTracking.hearingDetails?.hearingDate,
        newDate: hearingDate ? new Date(hearingDate) : null,
        reason: notes,
        adjournedBy: req.user.id
      };
    } else if (status === 'closed') {
      updateData.completionDetails = {
        completedDate: new Date(),
        completionNotes: notes,
        closedBy: req.user.id
      };
    }
    
    const updatedCaseTracking = await CaseTracking.findByIdAndUpdate(
      trackingId,
      updateData,
      { new: true }
    ).populate('case', 'caseNumber caseType')
     .populate('lawyer', 'name email')
     .populate('client', 'name email');
    
    console.log('✅ Case status updated successfully');
    
    res.json({
      success: true,
      message: 'Case status updated successfully',
      caseTracking: updatedCaseTracking
    });
    
  } catch (error) {
    console.error('Error updating case status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating case status',
      error: error.message
    });
  }
};

// Get tracking details for a specific case (for clients)
const getCaseTrackingDetails = async (req, res) => {
  try {
    const { caseId } = req.params;
    
    console.log('=== FETCHING CASE TRACKING DETAILS ===');
    console.log('Case ID:', caseId);
    
    const caseTracking = await CaseTracking.findOne({ case: caseId })
      .populate('case', 'caseNumber caseType status')
      .populate('lawyer', 'name email')
      .populate('client', 'name email')
      .sort({ 'statusHistory.updatedAt': -1 });
    
    if (!caseTracking) {
      return res.status(404).json({
        success: false,
        message: 'Case tracking record not found'
      });
    }
    
    console.log('✅ Case tracking details found');
    
    res.json({
      success: true,
      caseTracking
    });
    
  } catch (error) {
    console.error('Error fetching case tracking details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching case tracking details',
      error: error.message
    });
  }
};

// Get tracking details for client's cases
const getClientCaseTracking = async (req, res) => {
  try {
    const clientId = req.user.id;
    
    console.log('=== FETCHING CLIENT CASE TRACKING ===');
    console.log('Client ID:', clientId);
    
    const caseTracking = await CaseTracking.find({ client: clientId })
      .populate('case', 'caseNumber caseType status')
      .populate('lawyer', 'name email')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${caseTracking.length} cases for client`);
    
    res.json({
      success: true,
      count: caseTracking.length,
      caseTracking
    });
    
  } catch (error) {
    console.error('Error fetching client case tracking:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching client case tracking',
      error: error.message
    });
  }
};

// Create tracking record for a case (when case is created)
const createTrackingRecord = async (caseData) => {
  try {
    console.log('=== CREATING TRACKING RECORD ===');
    console.log('Case Data:', caseData);
    
    // Check if tracking record already exists
    const existingTracking = await CaseTracking.findOne({ case: caseData._id });
    if (existingTracking) {
      console.log('Tracking record already exists');
      return existingTracking;
    }
    
    const trackingRecord = new CaseTracking({
      case: caseData._id,
      caseNumber: caseData.caseNumber,
      caseType: caseData.caseType,
      plaintiffName: caseData.plaintiffName,
      defendantName: caseData.defendantName,
      lawyer: caseData.currentLawyer,
      lawyerName: 'Not Assigned',
      client: caseData.user,
      clientName: 'Loading...',
      district: caseData.district,
      status_dummy: 'pending_review',
      statusHistory: [{
        status: 'pending_review',
        updatedBy: caseData.user,
        updatedByName: 'System',
        notes: 'Case created and pending review',
        updatedAt: new Date()
      }]
    });
    
    // Get lawyer and client names if available
    if (caseData.currentLawyer) {
      const lawyer = await UserModel.findById(caseData.currentLawyer);
      if (lawyer) {
        trackingRecord.lawyerName = lawyer.name;
      }
    }
    
    const client = await UserModel.findById(caseData.user);
    if (client) {
      trackingRecord.clientName = client.name;
    }
    
    await trackingRecord.save();
    console.log('✅ Tracking record created successfully');
    
    return trackingRecord;
  } catch (error) {
    console.error('Error creating tracking record:', error);
    throw error;
  }
};

// Get tracking statistics
const getTrackingStats = async (req, res) => {
  try {
    const { district } = req.query;
    
    let matchQuery = {};
    if (district && district !== 'all') {
      matchQuery.district = district;
    }
    
    const stats = await CaseTracking.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status_dummy',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Format stats
    const formattedStats = {
      pending_review: 0,
      verified: 0,
      hearing_scheduled: 0,
      in_hearing: 0,
      adjourned: 0,
      closed: 0,
      total: 0
    };
    
    stats.forEach(stat => {
      formattedStats[stat._id] = stat.count;
      formattedStats.total += stat.count;
    });
    
    res.json({
      success: true,
      stats: formattedStats
    });
    
  } catch (error) {
    console.error('Error fetching tracking stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tracking statistics',
      error: error.message
    });
  }
};

// Copy all cases from CaseModel to CaseTracking table
const copyAllCasesToTracking = async (req, res) => {
  try {
    console.log('🔍 Copying all cases from CaseModel to CaseTracking...');
    
    // Get all cases from CaseModel
    const allCases = await CaseModel.find({}).populate('user currentLawyer');
    
    console.log(`Found ${allCases.length} cases to copy`);
    console.log('Cases found:', allCases.map(c => ({ id: c._id, caseNumber: c.caseNumber, status: c.status })));
    
    let copiedCount = 0;
    let skippedCount = 0;
    
    for (const caseDoc of allCases) {
      try {
        // Check if tracking record already exists
        const existingTracking = await CaseTracking.findOne({ case: caseDoc._id });
        
        if (existingTracking) {
          console.log(`⚠️ Tracking record already exists for case ${caseDoc.caseNumber}`);
          skippedCount++;
          continue;
        }
        
        // Create new tracking record
        const newTracking = new CaseTracking({
          case: caseDoc._id,
          caseNumber: caseDoc.caseNumber,
          caseType: caseDoc.caseType,
          client: caseDoc.user._id,
          clientName: caseDoc.user.name,
          lawyer: caseDoc.currentLawyer ? caseDoc.currentLawyer._id : null,
          lawyerName: caseDoc.currentLawyer ? caseDoc.currentLawyer.name : 'Not Assigned',
          district: caseDoc.district,
          status_dummy: 'pending_review', // Default status for tracking
          statusHistory: [{
            status: 'pending_review',
            updatedBy: null,
            updatedByName: 'System',
            notes: 'Initial tracking record created by copying from main case data.',
            updatedAt: new Date()
          }]
        });
        
        await newTracking.save();
        console.log(`✅ Created tracking record for case ${caseDoc.caseNumber}`);
        copiedCount++;
        
      } catch (error) {
        console.error(`❌ Error creating tracking record for case ${caseDoc.caseNumber}:`, error);
        if (error.code === 11000) {
          skippedCount++; // Duplicate key error
        }
      }
    }
    
    res.json({
      success: true,
      message: `Successfully copied ${copiedCount} cases to tracking table. ${skippedCount} cases were skipped (already exist).`,
      copiedCount,
      skippedCount,
      totalCases: allCases.length
    });
    
  } catch (error) {
    console.error('❌ Error copying cases to tracking:', error);
    res.status(500).json({
      success: false,
      message: 'Error copying cases to tracking table',
      error: error.message
    });
  }
};

module.exports = {
  getAllCasesForTracking,
  updateCaseStatus,
  getCaseTrackingDetails,
  getClientCaseTracking,
  createTrackingRecord,
  getTrackingStats,
  copyAllCasesToTracking
};
