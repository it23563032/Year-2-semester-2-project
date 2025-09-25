const AdjournmentRequest = require('../Model/AdjournmentRequest');
const Case = require('../Model/CaseModel');
const ScheduledCase = require('../Model/ScheduledCase');
const Notification = require('../Model/Notification');
const VerifiedClient = require('../Model/VerifiedClient');
const VerifiedLawyer = require('../Model/VerifiedLawyer');

// Create new adjournment request
const createAdjournmentRequest = async (req, res) => {
  try {
    console.log('🔍 Starting adjournment request creation...');
    const { caseId, preferredDate, preferredTime, reason, urgency } = req.body;
    const clientId = req.user.id;
    
    console.log('📋 Request data:', { caseId, preferredDate, preferredTime, reason, urgency, clientId });

    // Validate required fields
    if (!caseId || !preferredDate || !reason) {
      console.log('❌ Validation failed - missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Case ID, preferred date, and reason are required'
      });
    }

    // Check if case exists and belongs to client
    console.log('🔍 Looking up case:', caseId);
    const caseItem = await Case.findById(caseId);
    if (!caseItem) {
      console.log('❌ Case not found:', caseId);
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }
    
    console.log('✅ Case found:', caseItem.caseNumber, 'Status:', caseItem.status, 'User:', caseItem.user);

    if (caseItem.user.toString() !== clientId) {
      console.log('❌ Access denied - case belongs to different user');
      return res.status(403).json({
        success: false,
        message: 'Access denied to this case'
      });
    }

    // Check if case is scheduled for hearing
    if (caseItem.status !== 'hearing_scheduled') {
      console.log('❌ Case not scheduled for hearing - status:', caseItem.status);
      return res.status(400).json({
        success: false,
        message: 'Only scheduled cases can request adjournment'
      });
    }

    // Check if there's already a pending request for this case
    console.log('🔍 Checking for existing pending requests...');
    const existingRequest = await AdjournmentRequest.findOne({
      case: caseId,
      status: 'pending'
    });

    if (existingRequest) {
      console.log('❌ Pending request already exists:', existingRequest._id);
      return res.status(400).json({
        success: false,
        message: 'There is already a pending adjournment request for this case'
      });
    }
    console.log('✅ No existing pending requests found');

    // Get original hearing details from scheduled case
    console.log('🔍 Looking up scheduled case for caseId:', caseId);
    const scheduledCase = await ScheduledCase.findOne({ case: caseId });
    if (!scheduledCase) {
      console.log('❌ No scheduled hearing found for case:', caseId);
      return res.status(400).json({
        success: false,
        message: 'No scheduled hearing found for this case'
      });
    }
    
    console.log('✅ Scheduled case found:', scheduledCase.hearingDate, scheduledCase.hearingTime);

    // Create adjournment request
    const adjournmentRequest = new AdjournmentRequest({
      case: caseId,
      client: clientId,
      lawyer: caseItem.currentLawyer,
      originalHearingDate: scheduledCase.hearingDate,
      originalHearingTime: {
        startTime: scheduledCase.hearingTime?.startTime,
        endTime: scheduledCase.hearingTime?.endTime
      },
      preferredDate: new Date(preferredDate),
      preferredTime: preferredTime ? {
        startTime: preferredTime.startTime,
        endTime: preferredTime.endTime
      } : null,
      reason,
      urgency: urgency || 'medium'
    });

    console.log('💾 Saving adjournment request...');
    try {
      await adjournmentRequest.save();
      console.log('✅ Adjournment request saved successfully - ID:', adjournmentRequest._id);
    } catch (saveError) {
      console.error('❌ Error saving adjournment request:', saveError);
      if (saveError.code === 11000) { // Duplicate key error
        return res.status(400).json({
          success: false,
          message: 'There is already a pending adjournment request for this case'
        });
      }
      throw saveError; // Re-throw if it's not a duplicate key error
    }

    // Create notification for court scheduler
    // Note: This notification will be handled by the scheduler system
    // The notification model expects specific fields that don't match this use case
    // For now, we'll skip notification creation to prevent errors
    // TODO: Implement proper notification system for adjournment requests
    console.log(`📋 Adjournment request created for case ${caseItem.caseNumber} - ID: ${adjournmentRequest._id}`);

    res.status(201).json({
      success: true,
      message: 'Adjournment request submitted successfully',
      data: adjournmentRequest
    });

  } catch (error) {
    console.error('❌ Error creating adjournment request:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get adjournment requests for court scheduler
const getAdjournmentRequests = async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = {};
    if (status) {
      query.status = status;
    }

    const requests = await AdjournmentRequest.find(query)
      .populate('case', 'caseNumber caseType plaintiffName defendantName district')
      .populate('client', 'name email')
      .populate('lawyer', 'name email')
      .sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      data: requests
    });

  } catch (error) {
    console.error('Error fetching adjournment requests:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get client's adjournment requests
const getClientAdjournmentRequests = async (req, res) => {
  try {
    const clientId = req.user.id;

    const requests = await AdjournmentRequest.find({ client: clientId })
      .populate('case', 'caseNumber caseType plaintiffName defendantName')
      .populate('lawyer', 'name email')
      .sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      data: requests
    });

  } catch (error) {
    console.error('Error fetching client adjournment requests:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Accept adjournment request
const acceptAdjournmentRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { newHearingDate, newHearingTime, schedulerNotes } = req.body;
    const schedulerId = req.user.id;

    // Validate required fields
    if (!newHearingDate) {
      return res.status(400).json({
        success: false,
        message: 'New hearing date is required'
      });
    }

    // Find the adjournment request
    const adjournmentRequest = await AdjournmentRequest.findById(requestId)
      .populate('case')
      .populate('client');

    if (!adjournmentRequest) {
      return res.status(404).json({
        success: false,
        message: 'Adjournment request not found'
      });
    }

    if (adjournmentRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'This request has already been processed'
      });
    }

    // Update the adjournment request
    adjournmentRequest.status = 'accepted';
    adjournmentRequest.newHearingDate = new Date(newHearingDate);
    adjournmentRequest.newHearingTime = newHearingTime ? {
      startTime: newHearingTime.startTime,
      endTime: newHearingTime.endTime
    } : null;
    adjournmentRequest.schedulerNotes = schedulerNotes;
    adjournmentRequest.reviewedAt = new Date();
    adjournmentRequest.reviewedBy = schedulerId;

    await adjournmentRequest.save();

    // Update the case with new hearing details
    const caseItem = await Case.findById(adjournmentRequest.case._id);
    caseItem.hearingDate = new Date(newHearingDate);
    caseItem.hearingTime = newHearingTime ? {
      startTime: newHearingTime.startTime,
      endTime: newHearingTime.endTime
    } : null;
    caseItem.status = 'hearing_scheduled'; // Keep as hearing_scheduled with new date/time
    await caseItem.save();

    // Update the ScheduledCase record with new hearing details
    const scheduledCase = await ScheduledCase.findOne({ case: adjournmentRequest.case._id });
    if (scheduledCase) {
      scheduledCase.hearingDate = new Date(newHearingDate);
      scheduledCase.hearingTime = newHearingTime ? {
        startTime: newHearingTime.startTime,
        endTime: newHearingTime.endTime
      } : scheduledCase.hearingTime;
      scheduledCase.status = 'scheduled'; // Update status to scheduled
      await scheduledCase.save();
      console.log(`✅ ScheduledCase updated for case ${caseItem.caseNumber} - New date: ${new Date(newHearingDate).toLocaleDateString('en-LK')}`);
    } else {
      console.log(`⚠️ No ScheduledCase found for case ${caseItem.caseNumber} - only Case record updated`);
    }

    // Create notification for client
    // Note: This notification will be handled by the scheduler system
    // The notification model expects specific fields that don't match this use case
    // For now, we'll skip notification creation to prevent errors
    // TODO: Implement proper notification system for adjournment requests
    console.log(`Adjournment request accepted for case ${caseItem.caseNumber} - New date: ${new Date(newHearingDate).toLocaleDateString('en-LK')}`);

    res.status(200).json({
      success: true,
      message: 'Adjournment request accepted successfully',
      data: adjournmentRequest
    });

  } catch (error) {
    console.error('Error accepting adjournment request:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Reject adjournment request
const rejectAdjournmentRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { schedulerNotes } = req.body;
    const schedulerId = req.user.id;

    // Find the adjournment request
    const adjournmentRequest = await AdjournmentRequest.findById(requestId)
      .populate('case')
      .populate('client');

    if (!adjournmentRequest) {
      return res.status(404).json({
        success: false,
        message: 'Adjournment request not found'
      });
    }

    if (adjournmentRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'This request has already been processed'
      });
    }

    // Update the adjournment request
    adjournmentRequest.status = 'rejected';
    adjournmentRequest.schedulerNotes = schedulerNotes;
    adjournmentRequest.reviewedAt = new Date();
    adjournmentRequest.reviewedBy = schedulerId;

    await adjournmentRequest.save();

    // Create notification for client
    // Note: This notification will be handled by the scheduler system
    // The notification model expects specific fields that don't match this use case
    // For now, we'll skip notification creation to prevent errors
    // TODO: Implement proper notification system for adjournment requests
    console.log(`Adjournment request rejected for case ${adjournmentRequest.case.caseNumber} - Reason: ${schedulerNotes}`);

    res.status(200).json({
      success: true,
      message: 'Adjournment request rejected successfully',
      data: adjournmentRequest
    });

  } catch (error) {
    console.error('Error rejecting adjournment request:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get adjournment request details
const getAdjournmentRequestDetails = async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await AdjournmentRequest.findById(requestId)
      .populate('case', 'caseNumber caseType plaintiffName defendantName district status')
      .populate('client', 'name email phone')
      .populate('lawyer', 'name email phone')
      .populate('reviewedBy', 'name email');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Adjournment request not found'
      });
    }

    res.status(200).json({
      success: true,
      data: request
    });

  } catch (error) {
    console.error('Error fetching adjournment request details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  createAdjournmentRequest,
  getAdjournmentRequests,
  getClientAdjournmentRequests,
  acceptAdjournmentRequest,
  rejectAdjournmentRequest,
  getAdjournmentRequestDetails
};
