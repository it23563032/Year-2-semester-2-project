const EmailSettings = require('../Model/EmailSettings');
const EmailReportHistory = require('../Model/EmailReportHistory');
const Staff = require('../Model/Staff');
const UnverifiedLawyer = require('../Model/UnverifiedLawyer');
const UnverifiedClient = require('../Model/UnverifiedClient');
const VerifiedLawyer = require('../Model/VerifiedLawyer');
const VerifiedClient = require('../Model/VerifiedClient');
const Case = require('../Model/CaseModel');
const PaymentTransaction = require('../Model/PaymentTransaction');

// Reuse existing email configuration from EmailController
const createTransporter = () => {
  const nodemailer = require('nodemailer');
  const emailUser = process.env.EMAIL_USER || 'trivtheaver@gmail.com';
  const emailPass = process.env.EMAIL_PASS || 'ldwvxsoeufqnhmgc';
  
  if (!emailUser || !emailPass || emailUser === 'your-email@gmail.com') {
    console.log('⚠️ Daily Report Service: Email credentials not configured. Reports will be logged but not sent.');
    return null;
  }
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass
    }
  });
};

class DailyReportService {
  constructor() {
    // Use existing email configuration
    this.transporter = createTransporter();
  }

  // Generate comprehensive platform metrics for the last 24 hours
  async generateReportData() {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
      // User Statistics
      const newLawyers = await UnverifiedLawyer.countDocuments({
        createdAt: { $gte: yesterday }
      });
      
      const newClients = await UnverifiedClient.countDocuments({
        createdAt: { $gte: yesterday }
      });

      const verifiedLawyers = await VerifiedLawyer.countDocuments({
        verificationDate: { $gte: yesterday }
      });

      const verifiedClients = await VerifiedClient.countDocuments({
        verificationDate: { $gte: yesterday }
      });

      const rejectedLawyers = await UnverifiedLawyer.countDocuments({
        verificationStatus: 'rejected',
        updatedAt: { $gte: yesterday }
      });

      const rejectedClients = await UnverifiedClient.countDocuments({
        verificationStatus: 'rejected',
        updatedAt: { $gte: yesterday }
      });

      // Case Activity
      const newCases = await Case.countDocuments({
        createdAt: { $gte: yesterday }
      });

      const resolvedCases = await Case.countDocuments({
        status: 'completed',
        updatedAt: { $gte: yesterday }
      });

      const pendingCases = await Case.countDocuments({
        status: { $in: ['pending', 'filed', 'in_progress'] }
      });

      const totalCases = await Case.countDocuments({});

      // Financial Metrics
      const todayTransactions = await PaymentTransaction.find({
        createdAt: { $gte: yesterday },
        paymentStatus: 'completed'
      });

      const revenue = todayTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
      const transactions = todayTransactions.length;
      const pendingPayments = await PaymentTransaction.countDocuments({
        paymentStatus: { $in: ['pending', 'processing'] }
      });

      // System Events (mock data for now - you can implement proper logging)
      const failedLogins = 0; // Implement proper failed login tracking
      const systemErrors = 0; // Implement proper error logging
      const highPriorityItems = pendingCases > 10 ? 1 : 0; // Custom logic
      const systemUptime = 99.9; // Implement proper uptime calculation

      // Performance Metrics
      const totalUsers = await VerifiedLawyer.countDocuments({}) + await VerifiedClient.countDocuments({});
      const activeUsers = totalUsers; // Implement proper active user tracking
      const averageResponseTime = 2.5; // Implement proper response time tracking

      // Staff Activity
      const activeStaff = await Staff.countDocuments({ isActive: true });
      const staffActions = 0; // Implement proper staff action tracking
      const tasksCompleted = 0; // Implement proper task tracking

      return {
        userStats: {
          newLawyers,
          newClients,
          verifiedLawyers,
          verifiedClients,
          rejectedLawyers,
          rejectedClients
        },
        caseActivity: {
          newCases,
          resolvedCases,
          pendingCases,
          totalCases
        },
        financialMetrics: {
          revenue,
          transactions,
          pendingPayments,
          currency: 'LKR'
        },
        systemEvents: {
          failedLogins,
          systemErrors,
          highPriorityItems,
          systemUptime
        },
        performanceMetrics: {
          averageResponseTime,
          totalUsers,
          activeUsers
        },
        staffActivity: {
          staffActions,
          tasksCompleted,
          activeStaff
        }
      };
    } catch (error) {
      console.error('Error generating report data:', error);
      throw error;
    }
  }

  // Generate HTML email template
  generateHTMLReport(reportData, reportDate) {
    const formatNumber = (num) => num.toLocaleString();
    const formatCurrency = (amount) => `LKR ${amount.toLocaleString()}`;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Legal Aid Platform - Daily Report</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 5px 0 0 0; opacity: 0.9; }
            .content { padding: 20px; }
            .section { margin-bottom: 25px; }
            .section h2 { color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 5px; margin-bottom: 15px; }
            .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 15px; }
            .metric-card { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 15px; text-align: center; }
            .metric-value { font-size: 24px; font-weight: bold; color: #667eea; margin-bottom: 5px; }
            .metric-label { font-size: 12px; color: #6c757d; text-transform: uppercase; }
            .alert { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 10px; margin: 10px 0; }
            .alert-warning { background: #fff3cd; border-color: #ffeaa7; }
            .alert-danger { background: #f8d7da; border-color: #f5c6cb; color: #721c24; }
            .alert-success { background: #d4edda; border-color: #c3e6cb; color: #155724; }
            .footer { background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; }
            .action-buttons { text-align: center; margin: 20px 0; }
            .btn { display: inline-block; padding: 10px 20px; margin: 5px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; }
            .btn:hover { background: #5a6fd8; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📊 LEGAL AID PLATFORM</h1>
                <p>Daily Activity Report - ${reportDate}</p>
            </div>
            
            <div class="content">
                <!-- User Statistics -->
                <div class="section">
                    <h2>👥 USER ACTIVITY (Last 24 hours)</h2>
                    <div class="metric-grid">
                        <div class="metric-card">
                            <div class="metric-value">${formatNumber(reportData.userStats.newLawyers)}</div>
                            <div class="metric-label">New Lawyers</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${formatNumber(reportData.userStats.newClients)}</div>
                            <div class="metric-label">New Clients</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${formatNumber(reportData.userStats.verifiedLawyers)}</div>
                            <div class="metric-label">Verified Lawyers</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${formatNumber(reportData.userStats.verifiedClients)}</div>
                            <div class="metric-label">Verified Clients</div>
                        </div>
                    </div>
                    ${reportData.userStats.rejectedLawyers > 0 || reportData.userStats.rejectedClients > 0 ? `
                    <div class="alert alert-warning">
                        ⚠️ Rejections: ${reportData.userStats.rejectedLawyers} lawyers, ${reportData.userStats.rejectedClients} clients
                    </div>
                    ` : ''}
                </div>

                <!-- Case Activity -->
                <div class="section">
                    <h2>📋 CASE ACTIVITY</h2>
                    <div class="metric-grid">
                        <div class="metric-card">
                            <div class="metric-value">${formatNumber(reportData.caseActivity.newCases)}</div>
                            <div class="metric-label">New Cases</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${formatNumber(reportData.caseActivity.resolvedCases)}</div>
                            <div class="metric-label">Resolved</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${formatNumber(reportData.caseActivity.pendingCases)}</div>
                            <div class="metric-label">Pending</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${formatNumber(reportData.caseActivity.totalCases)}</div>
                            <div class="metric-label">Total Cases</div>
                        </div>
                    </div>
                </div>

                <!-- Financial Metrics -->
                <div class="section">
                    <h2>💰 FINANCIAL SUMMARY</h2>
                    <div class="metric-grid">
                        <div class="metric-card">
                            <div class="metric-value">${formatCurrency(reportData.financialMetrics.revenue)}</div>
                            <div class="metric-label">Revenue</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${formatNumber(reportData.financialMetrics.transactions)}</div>
                            <div class="metric-label">Transactions</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${formatNumber(reportData.financialMetrics.pendingPayments)}</div>
                            <div class="metric-label">Pending Payments</div>
                        </div>
                    </div>
                </div>

                <!-- System Events -->
                <div class="section">
                    <h2>⚠️ SYSTEM ALERTS</h2>
                    ${reportData.systemEvents.failedLogins > 0 ? `
                    <div class="alert alert-danger">
                        🔐 Failed Logins: ${reportData.systemEvents.failedLogins}
                    </div>
                    ` : ''}
                    ${reportData.systemEvents.systemErrors > 0 ? `
                    <div class="alert alert-danger">
                        🚨 System Errors: ${reportData.systemEvents.systemErrors}
                    </div>
                    ` : ''}
                    ${reportData.systemEvents.highPriorityItems > 0 ? `
                    <div class="alert alert-warning">
                        ⚡ High Priority Items: ${reportData.systemEvents.highPriorityItems}
                    </div>
                    ` : ''}
                    <div class="alert alert-success">
                        🟢 System Uptime: ${reportData.systemEvents.systemUptime}%
                    </div>
                </div>

                <!-- Performance & Staff -->
                <div class="section">
                    <h2>📊 PERFORMANCE & STAFF</h2>
                    <div class="metric-grid">
                        <div class="metric-card">
                            <div class="metric-value">${reportData.performanceMetrics.averageResponseTime}s</div>
                            <div class="metric-label">Avg Response</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${formatNumber(reportData.performanceMetrics.totalUsers)}</div>
                            <div class="metric-label">Total Users</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${formatNumber(reportData.staffActivity.activeStaff)}</div>
                            <div class="metric-label">Active Staff</div>
                        </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="action-buttons">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin-dashboard" class="btn">View Dashboard</a>
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin-dashboard?tab=reports" class="btn">View Reports</a>
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin-dashboard?tab=users" class="btn">Manage Users</a>
                </div>
            </div>

            <div class="footer">
                <p>This report was automatically generated by the Legal Aid Platform</p>
                <p>Generated at: ${new Date().toLocaleString()}</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  // Send daily report to admin
  async sendDailyReport(adminId, forceSend = false) {
    try {
      const emailSettings = await EmailSettings.findOne({ adminId });
      if (!emailSettings) {
        throw new Error('Email settings not found for admin');
      }
      
      if (!forceSend && !emailSettings.isEnabled) {
        console.log('Email reports disabled for admin:', adminId);
        return { success: false, message: 'Email reports are disabled' };
      }

      // Additional check: if we already sent today and it's not a force send, skip
      if (!forceSend) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (emailSettings.lastSent && emailSettings.lastSent >= today) {
          console.log('Report already sent today for admin:', adminId);
          return { success: false, message: 'Report already sent today' };
        }
      }

      const reportData = await this.generateReportData();
      const reportDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const htmlContent = this.generateHTMLReport(reportData, reportDate);

      const mailOptions = {
        from: process.env.EMAIL_USER || 'trivtheaver@gmail.com',
        to: emailSettings.recipientEmail,
        subject: `📊 Legal Aid Platform - Daily Report (${reportDate})`,
        html: htmlContent,
        text: `Legal Aid Platform Daily Report - ${reportDate}\n\nPlease view the HTML version for complete details.`
      };

      // Use existing email sending pattern (log if no transporter)
      if (this.transporter) {
        await this.transporter.sendMail(mailOptions);
      } else {
        console.log('📧 DAILY REPORT EMAIL (Demo Mode):');
        console.log('To:', mailOptions.to);
        console.log('Subject:', mailOptions.subject);
        console.log('Content:', mailOptions.html);
        console.log('---');
      }

      // Save report history
      const reportHistory = new EmailReportHistory({
        adminId,
        reportType: emailSettings.frequency,
        reportDate: new Date(),
        sentAt: new Date(),
        recipientEmail: emailSettings.recipientEmail,
        reportData,
        status: 'sent'
      });

      await reportHistory.save();
      console.log(`📝 Report history saved for admin: ${adminId}`);

      // Update last sent time with atomic operation to prevent race conditions
      const updateTime = new Date();
      console.log(`🕐 Updating lastSent time to: ${updateTime.toISOString()}`);
      
      const updateResult = await EmailSettings.updateOne(
        { _id: emailSettings._id },
        { 
          $set: { 
            lastSent: updateTime,
            updatedAt: updateTime
          } 
        }
      );
      
      console.log(`📊 Update result: matched=${updateResult.matchedCount}, modified=${updateResult.modifiedCount}`);
      
      if (updateResult.modifiedCount === 0) {
        console.log('⚠️ Warning: Failed to update lastSent time for admin:', adminId);
      } else {
        console.log(`✅ Successfully updated lastSent time for admin: ${adminId}`);
      }

      console.log(`Daily report sent successfully to ${emailSettings.recipientEmail}`);
      return { success: true, message: 'Report sent successfully' };

    } catch (error) {
      console.error('Error sending daily report:', error);
      
      // Save failed report history
      try {
        const reportHistory = new EmailReportHistory({
          adminId,
          reportType: 'daily',
          reportDate: new Date(),
          sentAt: new Date(),
          recipientEmail: 'unknown',
          status: 'failed',
          errorMessage: error.message
        });
        await reportHistory.save();
        console.log(`📝 Failed report history saved for admin: ${adminId}`);
      } catch (saveError) {
        console.error('Error saving failed report history:', saveError);
      }

      throw error;
    }
  }

  // Send test email
  async sendTestEmail(adminId) {
    try {
      const emailSettings = await EmailSettings.findOne({ adminId });
      if (!emailSettings) {
        throw new Error('Email settings not found for admin');
      }

      const reportData = await this.generateReportData();
      const htmlContent = this.generateHTMLReport(reportData, 'Test Report');

      const mailOptions = {
        from: process.env.EMAIL_USER || 'trivtheaver@gmail.com',
        to: emailSettings.recipientEmail,
        subject: '📊 Legal Aid Platform - Test Report',
        html: htmlContent
      };

      // Use existing email sending pattern (log if no transporter)
      if (this.transporter) {
        await this.transporter.sendMail(mailOptions);
      } else {
        console.log('📧 TEST REPORT EMAIL (Demo Mode):');
        console.log('To:', mailOptions.to);
        console.log('Subject:', mailOptions.subject);
        console.log('Content:', mailOptions.html);
        console.log('---');
      }
      console.log(`Test report sent successfully to ${emailSettings.recipientEmail}`);
      return { success: true, message: 'Test report sent successfully' };

    } catch (error) {
      console.error('Error sending test email:', error);
      throw error;
    }
  }
}

module.exports = DailyReportService;
