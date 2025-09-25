const Feedback = require('../Model/Feedback');
const VerifiedClient = require('../Model/VerifiedClient');
const VerifiedLawyer = require('../Model/VerifiedLawyer');
const Staff = require('../Model/Staff');

// Submit feedback (for clients and lawyers)
const submitFeedback = async (req, res) => {
  try {
    console.log('📝 Submitting new feedback...');
    console.log('User ID:', req.user.id);
    console.log('User Type:', req.user.userType);
    console.log('Collection:', req.collection);
    console.log('Request body:', req.body);

    const {
      feedbackType,
      category,
      priority,
      subject,
      message,
      rating
    } = req.body;

    // Validate required fields
    if (!feedbackType || !category || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: feedbackType, category, subject, message'
      });
    }

    // Determine user type and get user details
    let user;
    let userType;
    let userName;
    let userEmail;

    if (req.collection === 'verified_clients' || req.user.userType === 'verified_client') {
      console.log('🔍 Looking up VerifiedClient...');
      user = await VerifiedClient.findById(req.user.id);
      userType = 'VerifiedClient';
      userName = user?.fullName;
      userEmail = user?.email;
      console.log('✅ Found client:', { userName, userEmail });
    } else if (req.collection === 'verified_lawyers' || req.user.userType === 'verified_lawyer') {
      console.log('🔍 Looking up VerifiedLawyer...');
      user = await VerifiedLawyer.findById(req.user.id);
      userType = 'VerifiedLawyer';
      userName = user?.fullName || user?.name;
      userEmail = user?.email;
      console.log('✅ Found lawyer:', { userName, userEmail });
    } else {
      console.log('❌ Invalid user type for feedback submission');
      return res.status(403).json({
        success: false,
        message: 'Only verified clients and lawyers can submit feedback'
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create feedback
    // Generate feedbackId
    const timestamp = Date.now().toString();
    const randomStr = Math.random().toString(36).substr(2, 6).toUpperCase();
    const feedbackId = `FB-${timestamp}-${randomStr}`;

    console.log('🔧 Creating feedback with data:', {
      feedbackId,
      submittedBy: req.user.id,
      userType: userType,
      userName: userName,
      userEmail: userEmail,
      feedbackType,
      category,
      priority: priority || 'medium',
      subject,
      message,
      rating: rating || null
    });

    const feedback = new Feedback({
      feedbackId,
      submittedBy: req.user.id,
      userType: userType,
      userName: userName,
      userEmail: userEmail,
      feedbackType,
      category,
      priority: priority || 'medium',
      subject,
      message,
      rating: rating || null
    });

    console.log('💾 Saving feedback...');
    await feedback.save();
    console.log('✅ Feedback saved successfully!');

    console.log('✅ Feedback submitted successfully:', feedback.feedbackId);

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback: {
        feedbackId: feedback.feedbackId,
        feedbackType: feedback.feedbackType,
        category: feedback.category,
        subject: feedback.subject,
        status: feedback.status,
        createdAt: feedback.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Error submitting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
      error: error.message
    });
  }
};

// Get user's feedback (for clients and lawyers)
const getUserFeedback = async (req, res) => {
  try {
    console.log('📋 Fetching user feedback...');
    console.log('User ID:', req.user.id);

    const { page = 1, limit = 10, status, feedbackType } = req.query;

    // Build query
    let query = { submittedBy: req.user.id };
    
    if (status) {
      query.status = status;
    }
    
    if (feedbackType) {
      query.feedbackType = feedbackType;
    }

    const totalFeedback = await Feedback.countDocuments(query);
    
    const feedback = await Feedback.find(query)
      .populate('handledBy', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    console.log(`Found ${feedback.length} feedback items for user`);

    res.json({
      success: true,
      data: {
        feedback,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalFeedback / limit),
          totalItems: totalFeedback,
          hasNext: page < Math.ceil(totalFeedback / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching user feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback',
      error: error.message
    });
  }
};

// Mark response as read (for clients and lawyers)
const markResponseAsRead = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    
    console.log('👁️ Marking response as read:', feedbackId);

    const feedback = await Feedback.findOne({
      feedbackId: feedbackId,
      submittedBy: req.user.id
    });

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    await feedback.markAsRead();

    console.log('✅ Response marked as read');

    res.json({
      success: true,
      message: 'Response marked as read'
    });

  } catch (error) {
    console.error('❌ Error marking response as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark response as read',
      error: error.message
    });
  }
};

// Get all feedback (for Analytics Manager)
const getAllFeedback = async (req, res) => {
  try {
    console.log('📊 Fetching all feedback for analytics manager...');

    const { 
      page = 1, 
      limit = 10, 
      status, 
      feedbackType, 
      category, 
      priority,
      userType 
    } = req.query;

    // Build query
    let query = {};
    
    if (status) query.status = status;
    if (feedbackType) query.feedbackType = feedbackType;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (userType) query.userType = userType;

    const totalFeedback = await Feedback.countDocuments(query);
    
    const feedback = await Feedback.find(query)
      .populate('submittedBy', 'fullName email')
      .populate('handledBy', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    console.log(`Found ${feedback.length} feedback items`);

    res.json({
      success: true,
      data: {
        feedback,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalFeedback / limit),
          totalItems: totalFeedback,
          hasNext: page < Math.ceil(totalFeedback / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching all feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback',
      error: error.message
    });
  }
};

// Respond to feedback (for Analytics Manager)
const respondToFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { responseMessage } = req.body;

    console.log('💬 Responding to feedback:', feedbackId);

    if (!responseMessage) {
      return res.status(400).json({
        success: false,
        message: 'Response message is required'
      });
    }

    const feedback = await Feedback.findOne({ feedbackId });

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    await feedback.addResponse(responseMessage, req.user.id);

    console.log('✅ Response added successfully');

    // Populate the response for return
    const updatedFeedback = await Feedback.findOne({ feedbackId })
      .populate('submittedBy', 'fullName email')
      .populate('handledBy', 'fullName email')
      .populate('response.respondedBy', 'fullName email');

    res.json({
      success: true,
      message: 'Response sent successfully',
      feedback: updatedFeedback
    });

  } catch (error) {
    console.error('❌ Error responding to feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to respond to feedback',
      error: error.message
    });
  }
};

// Mark feedback as resolved (for Analytics Manager)
const markAsResolved = async (req, res) => {
  try {
    const { feedbackId } = req.params;

    console.log('✅ Marking feedback as resolved:', feedbackId);

    const feedback = await Feedback.findOne({ feedbackId });

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    await feedback.markAsResolved(req.user.id);

    console.log('✅ Feedback marked as resolved');

    res.json({
      success: true,
      message: 'Feedback marked as resolved'
    });

  } catch (error) {
    console.error('❌ Error marking feedback as resolved:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark feedback as resolved',
      error: error.message
    });
  }
};

// Get feedback statistics (for Analytics Manager)
const getFeedbackStats = async (req, res) => {
  try {
    console.log('📈 Fetching feedback statistics...');

    const [statusStats, typeStats, categoryStats, priorityStats] = await Promise.all([
      Feedback.getFeedbackStats(),
      Feedback.getFeedbackByType(),
      Feedback.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      Feedback.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ])
    ]);

    // Get user type breakdown
    const userTypeStats = await Feedback.aggregate([
      { $group: { _id: '$userType', count: { $sum: 1 } } }
    ]);

    // Get recent feedback
    const recentFeedback = await Feedback.getRecentFeedback(5);

    // Calculate average rating
    const ratingStats = await Feedback.aggregate([
      { $match: { rating: { $ne: null } } },
      { 
        $group: { 
          _id: null, 
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 }
        } 
      }
    ]);

    const stats = {
      statusBreakdown: statusStats,
      typeBreakdown: typeStats,
      categoryBreakdown: categoryStats,
      priorityBreakdown: priorityStats,
      userTypeBreakdown: userTypeStats,
      recentFeedback,
      averageRating: ratingStats.length > 0 ? ratingStats[0].averageRating : 0,
      totalRatings: ratingStats.length > 0 ? ratingStats[0].totalRatings : 0,
      totalFeedback: await Feedback.countDocuments()
    };

    console.log('✅ Feedback statistics compiled');

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ Error fetching feedback statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback statistics',
      error: error.message
    });
  }
};

module.exports = {
  submitFeedback,
  getUserFeedback,
  markResponseAsRead,
  getAllFeedback,
  respondToFeedback,
  markAsResolved,
  getFeedbackStats
};
