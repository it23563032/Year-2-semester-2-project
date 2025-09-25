const Notification = require('../Model/Notification');
const VerifiedClient = require('../Model/VerifiedClient');
const VerifiedLawyer = require('../Model/VerifiedLawyer');
const Staff = require('../Model/Staff');

// Create and send a new notification
const createNotification = async (req, res) => {
  try {
    console.log('📢 Creating new notification...');
    console.log('User ID:', req.user.id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const { title, message, type, priority, recipientType, specificUsers, expiresAt, requiresAcknowledgment } = req.body;

    // Validation
    if (!title || !message || !type || !recipientType) {
      return res.status(400).json({
        success: false,
        message: 'Title, message, type, and recipient type are required'
      });
    }

    // Get sender info
    const sender = await Staff.findById(req.user.id);
    if (!sender) {
      return res.status(404).json({
        success: false,
        message: 'Sender not found'
      });
    }

    // Generate notification ID explicitly
    const timestamp = Date.now().toString();
    const randomStr = Math.random().toString(36).substr(2, 6).toUpperCase();
    const notificationId = `NOTIF-${timestamp}-${randomStr}`;

    // Create notification object
    const notificationData = {
      notificationId,
      title,
      message,
      type,
      priority: priority || 'medium',
      createdBy: req.user.id,
      createdByName: sender.fullName || sender.name || 'System Admin',
      recipientType,
      specificUsers: recipientType === 'specific_users' ? specificUsers : [],
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      requiresAcknowledgment: requiresAcknowledgment !== false, // Default to true
      sentAt: new Date(),
      status: 'sent'
    };

    console.log('📢 Creating notification with data:', JSON.stringify(notificationData, null, 2));

    const notification = new Notification(notificationData);

    // Calculate recipients and update totalRecipients
    let recipients = [];
    
    try {
      switch (recipientType) {
        case 'all_users':
          const [allClients, allLawyers, allStaff] = await Promise.all([
            VerifiedClient.find({}, '_id fullName email'),
            VerifiedLawyer.find({}, '_id fullName name email'),
            Staff.find({}, '_id fullName name email')
          ]);
          
          recipients = [
            ...allClients.map(client => ({
              userId: client._id,
              userType: 'VerifiedClient',
              userName: client.fullName || 'Client',
              userEmail: client.email
            })),
            ...allLawyers.map(lawyer => ({
              userId: lawyer._id,
              userType: 'VerifiedLawyer',
              userName: lawyer.fullName || lawyer.name || 'Lawyer',
              userEmail: lawyer.email
            })),
            ...allStaff.map(staff => ({
              userId: staff._id,
              userType: 'Staff',
              userName: staff.fullName || staff.name || 'Staff Member',
              userEmail: staff.email
            }))
          ];
          break;

        case 'all_clients':
          const clients = await VerifiedClient.find({}, '_id fullName email');
          recipients = clients.map(client => ({
            userId: client._id,
            userType: 'VerifiedClient',
            userName: client.fullName || 'Client',
            userEmail: client.email
          }));
          break;

        case 'all_lawyers':
          const lawyers = await VerifiedLawyer.find({}, '_id fullName name email');
          recipients = lawyers.map(lawyer => ({
            userId: lawyer._id,
            userType: 'VerifiedLawyer',
            userName: lawyer.fullName || lawyer.name || 'Lawyer',
            userEmail: lawyer.email
          }));
          break;

        case 'all_staff':
          const staff = await Staff.find({}, '_id fullName name email');
          recipients = staff.map(staffMember => ({
            userId: staffMember._id,
            userType: 'Staff',
            userName: staffMember.fullName || staffMember.name || 'Staff Member',
            userEmail: staffMember.email
          }));
          break;

        case 'specific_users':
          recipients = specificUsers || [];
          break;

        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid recipient type'
          });
      }

      console.log(`📢 Found ${recipients.length} recipients for ${recipientType}`);

      // Update notification with recipient count and delivery tracking
      notification.totalRecipients = recipients.length;
      notification.deliveredTo = recipients.map(recipient => ({
        userId: recipient.userId,
        userType: recipient.userType,
        deliveredAt: new Date()
      }));

      // Save notification
      await notification.save();

      console.log('✅ Notification created successfully:', notification.notificationId);

      res.status(201).json({
        success: true,
        message: `✅ Notification sent successfully! Delivered to ${recipients.length} recipients.`,
        data: {
          notificationId: notification.notificationId,
          title: notification.title,
          type: notification.type,
          priority: notification.priority,
          totalRecipients: notification.totalRecipients,
          requiresAcknowledgment: notification.requiresAcknowledgment,
          createdAt: notification.createdAt
        }
      });

    } catch (recipientError) {
      console.error('❌ Error finding recipients:', recipientError);
      return res.status(500).json({
        success: false,
        message: 'Error finding recipients for notification'
      });
    }

  } catch (error) {
    console.error('❌ Error in createNotification controller:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification',
      error: error.message
    });
  }
};

// Get user's notifications (unread and read)
const getUserNotifications = async (req, res) => {
  try {
    console.log('📢 Fetching user notifications...');
    console.log('User ID:', req.user.id);
    console.log('User Type:', req.user.userType);

    const userId = req.user.id;
    const userType = req.user.userType === 'verified_client' ? 'VerifiedClient' : 
                    req.user.userType === 'verified_lawyer' ? 'VerifiedLawyer' : 'Staff';

    // Get all notifications for this user
    const notifications = await Notification.find({
      $and: [
        { status: 'sent' },
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] },
        {
          $or: [
            { recipientType: 'all_users' },
            { 
              recipientType: userType === 'VerifiedClient' ? 'all_clients' : 
                           userType === 'VerifiedLawyer' ? 'all_lawyers' : 'all_staff' 
            },
            { 'specificUsers.userId': userId }
          ]
        }
      ]
    })
    .populate('createdBy', 'fullName name')
    .sort({ priority: -1, createdAt: -1 })
    .lean();

    // Mark which ones are acknowledged by this user
    const notificationsWithStatus = notifications.map(notification => {
      const isAcknowledged = notification.acknowledgedBy.some(ack => ack.userId.toString() === userId);
      
      return {
        ...notification,
        isAcknowledged,
        isExpired: notification.expiresAt ? new Date() > new Date(notification.expiresAt) : false,
        acknowledgmentRate: notification.requiresAcknowledgment ? 
          Math.round((notification.acknowledgedBy.length / notification.totalRecipients) * 100) : 100
      };
    });

    const unreadCount = notificationsWithStatus.filter(n => !n.isAcknowledged && n.requiresAcknowledgment).length;

    console.log(`📢 Found ${notificationsWithStatus.length} notifications for user (${unreadCount} unread)`);

    res.status(200).json({
      success: true,
      data: {
        notifications: notificationsWithStatus,
        unreadCount,
        totalCount: notificationsWithStatus.length
      }
    });

  } catch (error) {
    console.error('❌ Error in getUserNotifications controller:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
};

// Acknowledge a notification
const acknowledgeNotification = async (req, res) => {
  try {
    console.log('📢 Acknowledging notification...');
    console.log('Notification ID:', req.params.notificationId);
    console.log('User ID:', req.user.id);

    const { notificationId } = req.params;
    const userId = req.user.id;
    const userType = req.user.userType === 'verified_client' ? 'VerifiedClient' : 
                    req.user.userType === 'verified_lawyer' ? 'VerifiedLawyer' : 'Staff';

    // Find the notification
    const notification = await Notification.findOne({ notificationId });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user is a recipient
    const isRecipient = notification.recipientType === 'all_users' ||
                       (notification.recipientType === 'all_clients' && userType === 'VerifiedClient') ||
                       (notification.recipientType === 'all_lawyers' && userType === 'VerifiedLawyer') ||
                       (notification.recipientType === 'all_staff' && userType === 'Staff') ||
                       (notification.recipientType === 'specific_users' && 
                        notification.specificUsers.some(user => user.userId.toString() === userId));

    if (!isRecipient) {
      return res.status(403).json({
        success: false,
        message: 'You are not a recipient of this notification'
      });
    }

    // Check if already acknowledged
    const alreadyAcknowledged = notification.acknowledgedBy.some(ack => ack.userId.toString() === userId);
    
    if (alreadyAcknowledged) {
      return res.status(400).json({
        success: false,
        message: 'Notification already acknowledged'
      });
    }

    // Get user name
    let userName = 'User';
    if (userType === 'VerifiedClient') {
      const client = await VerifiedClient.findById(userId, 'fullName');
      userName = client?.fullName || 'Client';
    } else if (userType === 'VerifiedLawyer') {
      const lawyer = await VerifiedLawyer.findById(userId, 'fullName name');
      userName = lawyer?.fullName || lawyer?.name || 'Lawyer';
    } else if (userType === 'Staff') {
      const staff = await Staff.findById(userId, 'fullName name');
      userName = staff?.fullName || staff?.name || 'Staff Member';
    }

    // Add acknowledgment
    notification.acknowledgedBy.push({
      userId,
      userType,
      acknowledgedAt: new Date(),
      userName
    });

    await notification.save();

    console.log('✅ Notification acknowledged successfully');

    res.status(200).json({
      success: true,
      message: 'Notification acknowledged successfully',
      data: {
        notificationId: notification.notificationId,
        acknowledgedAt: new Date(),
        acknowledgmentRate: Math.round((notification.acknowledgedBy.length / notification.totalRecipients) * 100)
      }
    });

  } catch (error) {
    console.error('❌ Error in acknowledgeNotification controller:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to acknowledge notification',
      error: error.message
    });
  }
};

// Get notification history for Analytics Manager
const getNotificationHistory = async (req, res) => {
  try {
    console.log('📢 Fetching notification history...');
    console.log('User ID:', req.user.id);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ createdBy: req.user.id })
      .populate('createdBy', 'fullName name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Notification.countDocuments({ createdBy: req.user.id });

    // Add computed fields
    const notificationsWithStats = notifications.map(notification => ({
      ...notification,
      acknowledgmentRate: notification.requiresAcknowledgment ? 
        Math.round((notification.acknowledgedBy.length / notification.totalRecipients) * 100) : 100,
      isExpired: notification.expiresAt ? new Date() > new Date(notification.expiresAt) : false
    }));

    console.log(`📢 Found ${notifications.length} notifications in history`);

    res.status(200).json({
      success: true,
      data: {
        notifications: notificationsWithStats,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalNotifications: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('❌ Error in getNotificationHistory controller:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification history',
      error: error.message
    });
  }
};

// Get notification statistics for Analytics Manager
const getNotificationStats = async (req, res) => {
  try {
    console.log('📢 Fetching notification statistics...');
    console.log('User ID:', req.user.id);

    // Get stats for notifications created by this user
    const stats = await Notification.aggregate([
      { $match: { createdBy: req.user.id } },
      {
        $group: {
          _id: null,
          totalNotifications: { $sum: 1 },
          totalRecipients: { $sum: '$totalRecipients' },
          totalAcknowledgments: { $sum: { $size: '$acknowledgedBy' } },
          avgAcknowledgmentRate: {
            $avg: {
              $cond: [
                { $eq: ['$requiresAcknowledgment', true] },
                {
                  $multiply: [
                    { $divide: [{ $size: '$acknowledgedBy' }, '$totalRecipients'] },
                    100
                  ]
                },
                100
              ]
            }
          }
        }
      }
    ]);

    // Get stats by type
    const typeStats = await Notification.aggregate([
      { $match: { createdBy: req.user.id } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalRecipients: { $sum: '$totalRecipients' },
          totalAcknowledgments: { $sum: { $size: '$acknowledgedBy' } }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentStats = await Notification.aggregate([
      { 
        $match: { 
          createdBy: req.user.id,
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: null,
          recentNotifications: { $sum: 1 },
          recentRecipients: { $sum: '$totalRecipients' },
          recentAcknowledgments: { $sum: { $size: '$acknowledgedBy' } }
        }
      }
    ]);

    const overview = stats[0] || {
      totalNotifications: 0,
      totalRecipients: 0,
      totalAcknowledgments: 0,
      avgAcknowledgmentRate: 0
    };

    const recent = recentStats[0] || {
      recentNotifications: 0,
      recentRecipients: 0,
      recentAcknowledgments: 0
    };

    console.log('📢 Notification stats calculated successfully');

    res.status(200).json({
      success: true,
      data: {
        overview: {
          ...overview,
          avgAcknowledgmentRate: Math.round(overview.avgAcknowledgmentRate || 0)
        },
        recent,
        byType: typeStats
      }
    });

  } catch (error) {
    console.error('❌ Error in getNotificationStats controller:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification statistics',
      error: error.message
    });
  }
};

// Delete a notification (for Analytics Manager)
const deleteNotification = async (req, res) => {
  try {
    console.log('📢 Deleting notification...');
    console.log('Notification ID:', req.params.notificationId);
    console.log('User ID:', req.user.id);

    const { notificationId } = req.params;

    // Find and delete the notification (only if created by this user)
    const notification = await Notification.findOneAndDelete({ 
      notificationId,
      createdBy: req.user.id 
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or you do not have permission to delete it'
      });
    }

    console.log('✅ Notification deleted successfully');

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error in deleteNotification controller:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
};

// Get available users for notification targeting
const getAvailableUsers = async (req, res) => {
  try {
    console.log('📢 Fetching available users for notification targeting...');
    console.log('📢 Requested user type:', req.params.userType);
    console.log('📢 Request user:', req.user.id, req.user.userType);
    
    const { userType } = req.params; // 'clients', 'lawyers', or 'staff'

    let users = [];
    
    switch (userType) {
      case 'clients':
        console.log('📢 Fetching clients...');
        const clients = await VerifiedClient.find({}, '_id fullName email').lean();
        console.log(`📢 Raw clients found: ${clients.length}`);
        console.log('📢 Sample client:', clients[0]);
        
        users = clients.map(client => ({
          id: client._id.toString(),
          name: client.fullName || 'Client',
          email: client.email,
          type: 'VerifiedClient'
        }));
        break;

      case 'lawyers':
        console.log('📢 Fetching lawyers...');
        const lawyers = await VerifiedLawyer.find({}, '_id fullName name email').lean();
        console.log(`📢 Raw lawyers found: ${lawyers.length}`);
        console.log('📢 Sample lawyer:', lawyers[0]);
        
        users = lawyers.map(lawyer => ({
          id: lawyer._id.toString(),
          name: lawyer.fullName || lawyer.name || 'Lawyer',
          email: lawyer.email,
          type: 'VerifiedLawyer'
        }));
        break;

      case 'staff':
        console.log('📢 Fetching staff...');
        const staff = await Staff.find({}, '_id fullName name email').lean();
        console.log(`📢 Raw staff found: ${staff.length}`);
        console.log('📢 Sample staff:', staff[0]);
        
        users = staff.map(staffMember => ({
          id: staffMember._id.toString(),
          name: staffMember.fullName || staffMember.name || 'Staff Member',
          email: staffMember.email,
          type: 'Staff'
        }));
        break;

      default:
        console.log('❌ Invalid user type:', userType);
        return res.status(400).json({
          success: false,
          message: 'Invalid user type. Must be clients, lawyers, or staff'
        });
    }

    console.log(`📢 Processed ${users.length} ${userType} for response`);
    console.log('📢 Sample processed user:', users[0]);

    res.status(200).json({
      success: true,
      users,
      count: users.length
    });

  } catch (error) {
    console.error('❌ Error in getAvailableUsers controller:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available users',
      error: error.message
    });
  }
};

module.exports = {
  createNotification,
  getUserNotifications,
  acknowledgeNotification,
  getNotificationHistory,
  getNotificationStats,
  deleteNotification,
  getAvailableUsers
};
