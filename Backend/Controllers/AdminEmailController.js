const EmailSettings = require('../Model/EmailSettings');
const EmailReportHistory = require('../Model/EmailReportHistory');
const DailyReportService = require('../services/dailyReportService');
const SchedulerService = require('../services/schedulerService');

// Get email settings for admin
const getEmailSettings = async (req, res) => {
  try {
    console.log('📧 getEmailSettings called');
    console.log('🔐 User:', req.user);
    const adminId = req.user._id;
    console.log('👤 Admin ID:', adminId);
    
    let emailSettings = await EmailSettings.findOne({ adminId });
    console.log('📋 Found email settings:', emailSettings);
    
    // Create default settings if none exist
    if (!emailSettings) {
      console.log('🆕 Creating default email settings');
      emailSettings = new EmailSettings({
        adminId,
        recipientEmail: 'admin@example.com', // Default email - admin should update this
        isEnabled: false, // Default to disabled for safety
        frequency: 'daily',
        sendTime: { hour: 8, minute: 0 },
        timezone: 'Asia/Colombo',
        includeUserStats: true,
        includeCaseActivity: true,
        includeFinancialMetrics: true,
        includeSystemEvents: true,
        includePerformanceMetrics: true,
        includeStaffActivity: true
      });
      await emailSettings.save();
      console.log('💾 Default email settings saved');
    }

    console.log('✅ Returning email settings:', emailSettings);
    res.status(200).json({
      status: 'success',
      data: emailSettings
    });
  } catch (err) {
    console.error('❌ Error in getEmailSettings:', err);
    console.error('❌ Error stack:', err.stack);
    res.status(500).json({ 
      message: "Unable to fetch email settings", 
      error: err.message 
    });
  }
};

// Update email settings
const updateEmailSettings = async (req, res) => {
  try {
    const adminId = req.user._id;
    const {
      isEnabled,
      recipientEmail,
      frequency,
      sendTime,
      dayOfWeek,
      dayOfMonth,
      timezone,
      includeUserStats,
      includeCaseActivity,
      includeFinancialMetrics,
      includeSystemEvents,
      includePerformanceMetrics,
      includeStaffActivity
    } = req.body;

    const updateData = {
      isEnabled,
      recipientEmail,
      frequency,
      sendTime,
      dayOfWeek,
      dayOfMonth,
      timezone,
      includeUserStats,
      includeCaseActivity,
      includeFinancialMetrics,
      includeSystemEvents,
      includePerformanceMetrics,
      includeStaffActivity,
      updatedAt: new Date()
    };

    const emailSettings = await EmailSettings.findOneAndUpdate(
      { adminId },
      updateData,
      { new: true, upsert: true }
    );

    // Restart scheduler for this admin with new settings
    const schedulerService = new SchedulerService();
    schedulerService.restartSchedulerForAdmin(adminId);

    res.status(200).json({
      status: 'success',
      message: 'Email settings updated successfully',
      data: emailSettings
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ 
      message: "Unable to update email settings", 
      error: err.message 
    });
  }
};

// Send test email
const sendTestEmail = async (req, res) => {
  try {
    console.log('📧 sendTestEmail called');
    const adminId = req.user._id;
    console.log('👤 Admin ID:', adminId);
    
    const reportService = new DailyReportService();
    
    const result = await reportService.sendTestEmail(adminId);
    
    console.log('✅ Test email sent successfully:', result);
    res.status(200).json({
      status: 'success',
      message: 'Test email sent successfully',
      data: result
    });
  } catch (err) {
    console.error('❌ Error sending test email:', err);
    res.status(500).json({ 
      message: "Unable to send test email", 
      error: err.message 
    });
  }
};

// Send immediate report
const sendImmediateReport = async (req, res) => {
  try {
    console.log('📧 sendImmediateReport called');
    const adminId = req.user._id;
    console.log('👤 Admin ID:', adminId);
    
    const reportService = new DailyReportService();
    
    // Force send the report even if email reports are disabled
    const result = await reportService.sendDailyReport(adminId, true);
    
    console.log('✅ Report sent successfully:', result);
    res.status(200).json({
      status: 'success',
      message: 'Report sent successfully',
      data: result
    });
  } catch (err) {
    console.error('❌ Error sending immediate report:', err);
    res.status(500).json({ 
      message: "Unable to send report", 
      error: err.message 
    });
  }
};

// Get email report history
const getEmailReportHistory = async (req, res) => {
  try {
    console.log('📊 getEmailReportHistory called');
    const adminId = req.user._id;
    console.log('👤 Admin ID:', adminId);
    const { page = 1, limit = 10 } = req.query;
    
    const reports = await EmailReportHistory.find({ adminId })
      .sort({ sentAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await EmailReportHistory.countDocuments({ adminId });
    
    console.log(`📋 Found ${reports.length} reports out of ${total} total for admin ${adminId}`);
    
    res.status(200).json({
      status: 'success',
      data: {
        reports,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalReports: total
        }
      }
    });
  } catch (err) {
    console.error('❌ Error fetching email report history:', err);
    res.status(500).json({ 
      message: "Unable to fetch report history", 
      error: err.message 
    });
  }
};

// Get email statistics
const getEmailStats = async (req, res) => {
  try {
    console.log('📊 getEmailStats called');
    const adminId = req.user._id;
    console.log('👤 Admin ID:', adminId);
    
    const stats = await Promise.all([
      EmailReportHistory.countDocuments({ adminId, status: 'sent' }),
      EmailReportHistory.countDocuments({ adminId, status: 'failed' }),
      EmailReportHistory.countDocuments({ adminId, reportType: 'daily' }),
      EmailReportHistory.countDocuments({ adminId, reportType: 'weekly' }),
      EmailReportHistory.countDocuments({ adminId, reportType: 'monthly' })
    ]);
    
    console.log('📈 Statistics calculated:', {
      totalSent: stats[0],
      totalFailed: stats[1],
      dailyReports: stats[2],
      weeklyReports: stats[3],
      monthlyReports: stats[4]
    });
    
    const lastReport = await EmailReportHistory.findOne({ adminId })
      .sort({ sentAt: -1 });
    
    console.log('📋 Last report:', lastReport);
    
    const result = {
      status: 'success',
      data: {
        totalSent: stats[0],
        totalFailed: stats[1],
        dailyReports: stats[2],
        weeklyReports: stats[3],
        monthlyReports: stats[4],
        lastReport: lastReport ? {
          sentAt: lastReport.sentAt,
          status: lastReport.status,
          reportType: lastReport.reportType
        } : null
      }
    };
    
    console.log('✅ Returning stats:', result);
    res.status(200).json(result);
  } catch (err) {
    console.error('❌ Error fetching email stats:', err);
    res.status(500).json({ 
      message: "Unable to fetch email statistics", 
      error: err.message 
    });
  }
};

module.exports = {
  getEmailSettings,
  updateEmailSettings,
  sendTestEmail,
  sendImmediateReport,
  getEmailReportHistory,
  getEmailStats
};
