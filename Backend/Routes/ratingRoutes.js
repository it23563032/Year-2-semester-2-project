const express = require("express");
const Rating = require("../Model/Rating");
const Case = require("../Model/CaseModel");
const VerifiedLawyer = require("../Model/VerifiedLawyer");
const VerifiedClient = require("../Model/VerifiedClient");
const { protect } = require("../Controllers/UnverifiedAuthController");
const router = express.Router();

// Submit a rating for a lawyer
router.post("/submit", protect, async (req, res) => {
  try {
    const { caseId, rating } = req.body;
    const clientId = req.user.id;
    
    console.log('=== RATING SUBMISSION DEBUG ===');
    console.log('Case ID:', caseId);
    console.log('Rating:', rating);
    console.log('Client ID:', clientId);

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false,
        message: "Rating must be between 1 and 5" 
      });
    }

    // Find the case and verify client ownership
    const caseData = await Case.findById(caseId).populate('currentLawyer');
    
    console.log('Case data found:', caseData ? {
      caseNumber: caseData.caseNumber,
      status: caseData.status,
      currentLawyer: caseData.currentLawyer,
      user: caseData.user
    } : 'NOT FOUND');
    
    if (!caseData) {
      return res.status(404).json({ 
        success: false,
        message: "Case not found" 
      });
    }

    if (caseData.user.toString() !== clientId) {
      return res.status(403).json({ 
        success: false,
        message: "You can only rate lawyers for your own cases" 
      });
    }

    // Enhanced lawyer lookup - try multiple approaches
    let lawyerId = null;
    let lawyerName = null;
    
    // Method 1: Check if currentLawyer is populated
    if (caseData.currentLawyer) {
      if (typeof caseData.currentLawyer === 'object') {
        // Already populated
        lawyerId = caseData.currentLawyer._id;
        lawyerName = caseData.currentLawyer.fullName || caseData.currentLawyer.name;
        console.log(`✅ Method 1: Found lawyer from populated currentLawyer: ${lawyerName}`);
      } else {
        // currentLawyer is just an ID, need to populate
        const lawyer = await VerifiedLawyer.findById(caseData.currentLawyer);
        if (lawyer) {
          lawyerId = lawyer._id;
          lawyerName = lawyer.fullName || lawyer.name;
          console.log(`✅ Method 1b: Found lawyer by ID lookup: ${lawyerName}`);
        }
      }
    }
    
    // Method 2: If no currentLawyer, try to find from assignments
    if (!lawyerId) {
      console.log(`🔍 Method 2: Looking for lawyer assignment for case ${caseData.caseNumber}`);
      
      const LawyerAssignment = require('../Model/LawyerAssignment');
      
      // Check all assignments for this case
      const allAssignments = await LawyerAssignment.find({
        case: caseId
      }).populate('lawyer', 'fullName name');
      
      console.log(`Found ${allAssignments.length} assignments for case ${caseData.caseNumber}:`);
      allAssignments.forEach((assign, index) => {
        console.log(`${index + 1}. Status: ${assign.status}, Lawyer: ${assign.lawyer?.fullName || assign.lawyer?.name || 'No lawyer'}`);
      });
      
      // Try to find an assignment with a lawyer (any status)
      const assignment = allAssignments.find(assign => assign.lawyer);
      
      if (assignment && assignment.lawyer) {
        lawyerId = assignment.lawyer._id;
        lawyerName = assignment.lawyer.fullName || assignment.lawyer.name;
        console.log(`✅ Method 2: Found lawyer from assignment: ${lawyerName} (Status: ${assignment.status})`);
      }
    }
    
    // Method 3: For hearing_scheduled cases, assign the first lawyer in database
    if (!lawyerId && caseData.status === 'hearing_scheduled') {
      console.log(`🔍 Method 3: Assigning first lawyer in database for hearing_scheduled case ${caseData.caseNumber}`);
      
      // Get the first lawyer in the database (sorted by creation date)
      const firstLawyer = await VerifiedLawyer.findOne({}).sort({ createdAt: 1 });
      
      if (firstLawyer) {
        lawyerId = firstLawyer._id;
        lawyerName = firstLawyer.fullName || firstLawyer.name;
        
        console.log(`✅ Method 3: Assigned first lawyer ${lawyerName} to case ${caseData.caseNumber}`);
        
        // Update the case to have this lawyer assigned
        await Case.findByIdAndUpdate(caseId, { currentLawyer: lawyerId });
        console.log(`✅ Updated case ${caseData.caseNumber} with first lawyer ${lawyerName}`);
      } else {
        console.log(`❌ No verified lawyers found in database`);
      }
    }
    
    if (!lawyerId) {
      console.log(`❌ No lawyer found for case ${caseData.caseNumber} after all methods`);
      console.log(`🔍 Final case details:`, {
        status: caseData.status,
        currentLawyer: caseData.currentLawyer,
        caseNumber: caseData.caseNumber
      });
      
      return res.status(400).json({ 
        success: false,
        message: "No lawyer assigned to this case. Please contact support if you believe this is an error." 
      });
    }

    // Handle multiple ratings - try to create new, if duplicate exists, update it
    console.log(`💾 Saving rating to database:`, {
      case: caseId,
      lawyer: lawyerId,
      client: clientId,
      rating: rating,
      caseNumber: caseData.caseNumber,
      clientName: req.user.name || req.user.fullName,
      lawyerName: lawyerName
    });
    
    try {
      const newRating = new Rating({
        case: caseId,
        lawyer: lawyerId,
        client: clientId,
        rating: rating,
        caseNumber: caseData.caseNumber,
        clientName: req.user.name || req.user.fullName,
        lawyerName: lawyerName || 'Assigned Lawyer',
        ratingTimestamp: new Date() // Add unique timestamp
      });
      await newRating.save();
      console.log(`✅ Created new rating: ${rating} stars for case ${caseData.caseNumber}`);
      console.log(`📊 Rating saved with ID: ${newRating._id}`);
    } catch (duplicateError) {
      if (duplicateError.code === 11000) {
        // Duplicate key error - update existing rating instead
        console.log(`⚠️ Duplicate rating detected, updating existing rating for case ${caseData.caseNumber}`);
        
        const existingRating = await Rating.findOneAndUpdate(
          { case: caseId, client: clientId },
          { 
            rating: rating,
            updatedAt: new Date(),
            ratingTimestamp: new Date()
          },
          { new: true }
        );
        
        if (existingRating) {
          console.log(`✅ Updated existing rating to ${rating} stars for case ${caseData.caseNumber}`);
          console.log(`📊 Updated rating with ID: ${existingRating._id}`);
        } else {
          console.log(`❌ Could not update rating for case ${caseData.caseNumber}`);
        }
      } else {
        // Re-throw other errors
        throw duplicateError;
      }
    }

    // Update lawyer's overall rating
    console.log(`📊 Updating lawyer's overall rating for lawyer ID: ${lawyerId}`);
    await updateLawyerRating(lawyerId);
    console.log(`✅ Lawyer overall rating updated`);

    // Emit real-time notification to lawyer
    try {
      console.log(`🔔 Attempting to send real-time notification to lawyer ${lawyerId}`);
      
      // Import the app module to get access to socketService
      const { socketService } = require('../app');
      if (socketService && socketService().io) {
        const notificationData = {
          lawyerId: lawyerId,
          caseNumber: caseData.caseNumber,
          rating: rating,
          clientName: req.user.name || req.user.fullName,
          message: `New ${rating}-star rating received from ${req.user.name || req.user.fullName}!`,
          timestamp: new Date()
        };
        
        socketService().io.emit('new-rating', notificationData);
        console.log(`🎉 Emitted new-rating event for lawyer ${lawyerId}:`, notificationData);
        
        // Also emit to specific lawyer room if they're connected
        socketService().io.to(`lawyer-${lawyerId}`).emit('rating-notification', notificationData);
        console.log(`📡 Sent targeted notification to lawyer room: lawyer-${lawyerId}`);
      } else {
        console.log('⚠️ Socket.IO not available, skipping real-time notification');
      }
    } catch (socketError) {
      console.log('⚠️ Socket service error, skipping real-time notification:', socketError.message);
    }
    
    // Create a database notification for the lawyer (as backup)
    try {
      const Notification = require('../Model/Notification');
      
      // Note: The Notification model might not be compatible, so we'll skip this for now
      console.log(`📝 Database notification skipped - using real-time notification only`);
    } catch (notificationError) {
      console.log('⚠️ Database notification error:', notificationError.message);
    }

    // Verify the rating was saved by fetching it back
    const savedRating = await Rating.findOne({ 
      case: caseId, 
      client: clientId, 
      lawyer: lawyerId 
    }).sort({ createdAt: -1 });
    
    console.log(`🔍 Verification - Rating saved in database:`, {
      found: !!savedRating,
      rating: savedRating?.rating,
      id: savedRating?._id,
      timestamp: savedRating?.createdAt
    });

    res.status(200).json({
      success: true,
      message: "Rating submitted successfully",
      data: {
        ratingId: savedRating?._id,
        lawyerId: lawyerId,
        lawyerName: lawyerName,
        rating: rating,
        caseNumber: caseData.caseNumber
      }
    });

  } catch (error) {
    console.error("Error submitting rating:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error while submitting rating",
      error: error.message 
    });
  }
});

// Get ratings for a specific lawyer (for performance page)
router.get("/lawyer/:lawyerId", protect, async (req, res) => {
  try {
    const { lawyerId } = req.params;

    // Get all ratings for this lawyer
    const ratings = await Rating.find({ lawyer: lawyerId })
      .sort({ createdAt: -1 })
      .limit(10); // Get last 10 ratings

    // Get lawyer info
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
    console.error("Error fetching lawyer ratings:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error while fetching ratings",
      error: error.message 
    });
  }
});

// Helper function to update lawyer's overall rating
async function updateLawyerRating(lawyerId) {
  try {
    console.log(`📊 Calculating overall rating for lawyer ${lawyerId}`);
    
    const ratings = await Rating.find({ lawyer: lawyerId });
    console.log(`Found ${ratings.length} total ratings for lawyer ${lawyerId}`);
    
    if (ratings.length === 0) {
      console.log(`⚠️ No ratings found for lawyer ${lawyerId}, skipping update`);
      return;
    }

    const totalRating = ratings.reduce((sum, rating) => sum + rating.rating, 0);
    const averageRating = totalRating / ratings.length;
    const roundedRating = Math.round(averageRating * 10) / 10;

    console.log(`📈 Rating calculation: ${totalRating} total points ÷ ${ratings.length} ratings = ${averageRating} (rounded: ${roundedRating})`);

    const updatedLawyer = await VerifiedLawyer.findByIdAndUpdate(lawyerId, {
      ratings: roundedRating, // Round to 1 decimal place
      totalReviews: ratings.length
    }, { new: true });

    if (updatedLawyer) {
      console.log(`✅ Updated lawyer ${updatedLawyer.fullName || updatedLawyer.name} rating to ${roundedRating} based on ${ratings.length} reviews`);
      console.log(`📊 Lawyer's new stats: ${roundedRating} stars from ${ratings.length} reviews`);
    } else {
      console.log(`❌ Failed to update lawyer ${lawyerId} - lawyer not found`);
    }
  } catch (error) {
    console.error("Error updating lawyer rating:", error);
  }
}

// Get lawyer name for a specific case
router.get('/lawyer-name/:caseId', protect, async (req, res) => {
  try {
    const { caseId } = req.params;
    
    // Get case data
    const caseData = await Case.findById(caseId);
    
    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    // Get all lawyers from VerifiedLawyer model
    const VerifiedLawyer = require('../Model/VerifiedLawyer');
    const allLawyers = await VerifiedLawyer.find({});
    
    console.log(`🔍 Found ${allLawyers.length} verified lawyers:`, allLawyers.map(l => ({ id: l._id, name: l.fullName || l.name })));
    
    // For now, assign lawyers in a round-robin fashion based on case number
    // This ensures consistent assignment for the same case
    let lawyerName = 'Assigned Lawyer';
    let lawyerId = null;
    
    if (allLawyers.length > 0) {
      // Use case number to consistently assign the same lawyer to the same case
      const caseNumberInt = parseInt(caseData.caseNumber.replace(/[^0-9]/g, '')) || 0;
      const assignedLawyer = allLawyers[caseNumberInt % allLawyers.length];
      
      lawyerName = assignedLawyer.fullName || assignedLawyer.name || 'Assigned Lawyer';
      lawyerId = assignedLawyer._id;
      
      console.log(`✅ Assigned ${lawyerName} to case ${caseData.caseNumber} (index: ${caseNumberInt % allLawyers.length})`);
    } else {
      console.log(`❌ No verified lawyers found in database`);
    }
    
    res.json({
      success: true,
      caseNumber: caseData.caseNumber,
      lawyerName: lawyerName,
      lawyerId: lawyerId
    });
    
  } catch (error) {
    console.error('Error getting lawyer name:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting lawyer name',
      error: error.message
    });
  }
});

// Debug endpoint to list all ratings (for testing)
router.get("/debug/all", protect, async (req, res) => {
  try {
    const ratings = await Rating.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('lawyer', 'fullName name')
      .populate('client', 'fullName name');
    
    console.log(`📊 Debug: Found ${ratings.length} ratings in database`);
    
    const formattedRatings = ratings.map(rating => ({
      id: rating._id,
      caseNumber: rating.caseNumber,
      rating: rating.rating,
      clientName: rating.clientName,
      lawyerName: rating.lawyerName,
      createdAt: rating.createdAt,
      lawyer: rating.lawyer ? {
        id: rating.lawyer._id,
        name: rating.lawyer.fullName || rating.lawyer.name
      } : null,
      client: rating.client ? {
        id: rating.client._id,
        name: rating.client.fullName || rating.client.name
      } : null
    }));
    
    res.json({
      success: true,
      totalRatings: ratings.length,
      ratings: formattedRatings
    });
    
  } catch (error) {
    console.error("Error fetching debug ratings:", error);
    res.status(500).json({ 
      success: false,
      message: "Error fetching ratings",
      error: error.message 
    });
  }
});

module.exports = router;
