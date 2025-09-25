const nodemailer = require('nodemailer');
const Email = require('../Model/Email');
const VerifiedClient = require('../Model/VerifiedClient');
const VerifiedLawyer = require('../Model/VerifiedLawyer');
const Staff = require('../Model/Staff');

// Email configuration (hardcoded for testing)
const createTransporter = () => {
  // Hardcoded email credentials for testing
  const emailUser = process.env.EMAIL_USER || 'trivtheaver@gmail.com';
  const emailPass = process.env.EMAIL_PASS || 'ldwvxsoeufqnhmgc';
  
  console.log('📧 Email credentials loaded:', emailUser ? 'USER SET' : 'USER NOT SET', emailPass ? 'PASS SET' : 'PASS NOT SET');
  
  if (!emailUser || !emailPass || emailUser === 'your-email@gmail.com') {
    console.log('⚠️ Email credentials not configured. Emails will be logged but not sent.');
    console.log('📧 To enable email sending, set EMAIL_USER and EMAIL_PASS in .env file');
    return null;
  }
  
  return nodemailer.createTransport({
    service: 'gmail', // You can change this to your email service
    auth: {
      user: emailUser,
      pass: emailPass
    }
  });
};

// Send email function
const sendEmail = async (req, res) => {
  try {
    console.log('📧 Starting email send process...');
    console.log('Request body:', req.body);
    console.log('User ID:', req.user.id);

    const { 
      subject, 
      message, 
      recipientType, 
      specificEmails = [], 
      reason, 
      customReason,
      priority = 'medium',
      template = 'default'
    } = req.body;

    // Validation
    if (!subject || !message || !recipientType || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Subject, message, recipient type, and reason are required'
      });
    }

    if (reason === 'other' && !customReason) {
      return res.status(400).json({
        success: false,
        message: 'Custom reason is required when reason is "other"'
      });
    }

    if (recipientType === 'specific' && (!specificEmails || specificEmails.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Specific email addresses are required for specific targeting'
      });
    }

    // Generate email ID
    const timestamp = Date.now().toString();
    const randomStr = Math.random().toString(36).substr(2, 6).toUpperCase();
    const emailId = `EMAIL-${timestamp}-${randomStr}`;

    // Create email record
    const emailRecord = new Email({
      emailId,
      sentBy: req.user.id,
      subject,
      message,
      recipientType,
      specificEmails: recipientType === 'specific' ? specificEmails : [],
      reason,
      customReason: reason === 'other' ? customReason : undefined,
      priority,
      template,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    await emailRecord.save();
    console.log('✅ Email record created:', emailRecord.emailId);

    // Get recipients based on type
    let recipients = [];
    
    try {
      switch (recipientType) {
        case 'specific':
          console.log('📧 Processing specific emails:', JSON.stringify(specificEmails, null, 2));
          recipients = specificEmails.map(item => ({
            email: item.email,
            name: item.name || 'User',
            userType: item.userType || 'other'
          }));
          console.log('📧 Processed recipients:', JSON.stringify(recipients, null, 2));
          break;

        case 'all_clients':
          const clients = await VerifiedClient.find({}, 'email fullName');
          recipients = clients.map(client => ({
            email: client.email,
            name: client.fullName || 'Client',
            userType: 'client'
          }));
          break;

        case 'all_lawyers':
          const lawyers = await VerifiedLawyer.find({}, 'email fullName name');
          recipients = lawyers.map(lawyer => ({
            email: lawyer.email,
            name: lawyer.fullName || lawyer.name || 'Lawyer',
            userType: 'lawyer'
          }));
          break;

        case 'all_staff':
          const staff = await Staff.find({}, 'email fullName');
          recipients = staff.map(staffMember => ({
            email: staffMember.email,
            name: staffMember.fullName || 'Staff Member',
            userType: 'staff'
          }));
          break;

        case 'all_users':
          const [allClients, allLawyers, allStaff] = await Promise.all([
            VerifiedClient.find({}, 'email fullName'),
            VerifiedLawyer.find({}, 'email fullName name'),
            Staff.find({}, 'email fullName')
          ]);
          
          recipients = [
            ...allClients.map(client => ({
              email: client.email,
              name: client.fullName || 'Client',
              userType: 'client'
            })),
            ...allLawyers.map(lawyer => ({
              email: lawyer.email,
              name: lawyer.fullName || lawyer.name || 'Lawyer',
              userType: 'lawyer'
            })),
            ...allStaff.map(staffMember => ({
              email: staffMember.email,
              name: staffMember.fullName || 'Staff Member',
              userType: 'staff'
            }))
          ];
          break;

        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid recipient type'
          });
      }

      console.log(`📧 Found ${recipients.length} recipients for ${recipientType}`);

      if (recipients.length === 0) {
        await emailRecord.updateDeliveryStats([], []);
        return res.status(400).json({
          success: false,
          message: 'No recipients found for the specified criteria'
        });
      }

      // Create email transporter
      const transporter = createTransporter();

      // Prepare email template
      const emailTemplate = getEmailTemplate(template, {
        subject,
        message,
        reason: reason === 'other' ? customReason : reason,
        priority,
        senderName: 'Legal Aid Platform Team'
      });

      // Send emails
      const successful = [];
      const failed = [];

      console.log('📧 Starting email delivery...');

      // If no transporter (email not configured), simulate sending for testing
      if (!transporter) {
        console.log('📧 Email credentials not configured - simulating email delivery for testing');
        
        // Simulate successful delivery for all recipients
        recipients.forEach(recipient => {
          console.log(`📧 [SIMULATED] Email would be sent to: ${recipient.email} (${recipient.name})`);
          successful.push(recipient.email);
        });

        // Update email record with simulated delivery stats
        await emailRecord.updateDeliveryStats(successful, failed);

        console.log(`📧 [SIMULATED] Email delivery complete. Success: ${successful.length}, Failed: ${failed.length}`);

        return res.status(200).json({
          success: true,
          message: `✅ Email campaign created successfully! [SIMULATED - Configure EMAIL_USER and EMAIL_PASS to send real emails]. Would deliver to ${successful.length} recipients.`,
          data: {
            emailId: emailRecord.emailId,
            totalRecipients: recipients.length,
            successfulDeliveries: successful.length,
            failedDeliveries: failed.length,
            status: emailRecord.status,
            note: 'Email credentials not configured - this was a simulation'
          }
        });
      }

      // Send emails in batches to avoid overwhelming the email service
      const batchSize = 10;
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (recipient) => {
          try {
            const personalizedContent = emailTemplate.html.replace(
              '{{RECIPIENT_NAME}}',
              recipient.name
            );

            const mailOptions = {
              from: `"Legal Aid Platform" <${process.env.EMAIL_USER || 'trivtheaver@gmail.com'}>`,
              to: recipient.email,
              subject: emailTemplate.subject,
              html: personalizedContent,
              priority: priority === 'urgent' ? 'high' : 'normal'
            };

            await transporter.sendMail(mailOptions);
            successful.push(recipient.email);
            console.log(`✅ Email sent to: ${recipient.email}`);
          } catch (error) {
            console.error(`❌ Failed to send email to ${recipient.email}:`, error.message);
            failed.push(recipient.email);
          }
        });

        await Promise.all(batchPromises);
        
        // Small delay between batches
        if (i + batchSize < recipients.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Update email record with delivery stats
      await emailRecord.updateDeliveryStats(successful, failed);

      console.log(`📧 Email delivery complete. Success: ${successful.length}, Failed: ${failed.length}`);

      res.status(200).json({
        success: true,
        message: `Email sent successfully! Delivered to ${successful.length} recipients.`,
        data: {
          emailId: emailRecord.emailId,
          totalRecipients: recipients.length,
          successfulDeliveries: successful.length,
          failedDeliveries: failed.length,
          status: emailRecord.status
        }
      });

    } catch (deliveryError) {
      console.error('❌ Error during email delivery:', deliveryError);
      
      // Update email record as failed
      emailRecord.status = 'failed';
      await emailRecord.save();

      res.status(500).json({
        success: false,
        message: 'Error sending emails',
        error: deliveryError.message
      });
    }

  } catch (error) {
    console.error('❌ Error in sendEmail controller:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing email request',
      error: error.message
    });
  }
};

// Get email history
const getEmailHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const reason = req.query.reason;

    let query = { sentBy: req.user.id };
    
    if (status) query.status = status;
    if (reason) query.reason = reason;

    const emails = await Email.find(query)
      .populate('sentBy', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Email.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        emails,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalEmails: total
      }
    });

  } catch (error) {
    console.error('❌ Error fetching email history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching email history',
      error: error.message
    });
  }
};

// Get email statistics
const getEmailStats = async (req, res) => {
  try {
    const stats = await Email.aggregate([
      { $match: { sentBy: req.user._id } },
      {
        $group: {
          _id: null,
          totalEmails: { $sum: 1 },
          totalRecipients: { $sum: '$deliveryStats.totalRecipients' },
          successfulDeliveries: { $sum: '$deliveryStats.successfulDeliveries' },
          failedDeliveries: { $sum: '$deliveryStats.failedDeliveries' }
        }
      }
    ]);

    const statusBreakdown = await Email.aggregate([
      { $match: { sentBy: req.user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const reasonBreakdown = await Email.aggregate([
      { $match: { sentBy: req.user._id } },
      {
        $group: {
          _id: '$reason',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: stats[0] || {
          totalEmails: 0,
          totalRecipients: 0,
          successfulDeliveries: 0,
          failedDeliveries: 0
        },
        statusBreakdown,
        reasonBreakdown
      }
    });

  } catch (error) {
    console.error('❌ Error fetching email stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching email statistics',
      error: error.message
    });
  }
};

// Get available recipient counts
const getRecipientCounts = async (req, res) => {
  try {
    const [clientCount, lawyerCount, staffCount] = await Promise.all([
      VerifiedClient.countDocuments(),
      VerifiedLawyer.countDocuments(),
      Staff.countDocuments()
    ]);

    const totalUsers = clientCount + lawyerCount + staffCount;

    res.status(200).json({
      success: true,
      data: {
        clients: clientCount,
        lawyers: lawyerCount,
        staff: staffCount,
        totalUsers
      }
    });

  } catch (error) {
    console.error('❌ Error fetching recipient counts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recipient counts',
      error: error.message
    });
  }
};

// Email templates
const getEmailTemplate = (templateType, data) => {
  const templates = {
    default: {
      subject: data.subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f8f9fa; }
            .footer { padding: 15px; text-align: center; font-size: 12px; color: #666; }
            .priority-urgent { border-left: 4px solid #dc3545; }
            .priority-high { border-left: 4px solid #fd7e14; }
            .priority-medium { border-left: 4px solid #28a745; }
            .priority-low { border-left: 4px solid #6c757d; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Legal Aid Platform</h2>
            </div>
            <div class="content priority-${data.priority}">
              <h3>Dear {{RECIPIENT_NAME}},</h3>
              <p><strong>Reason:</strong> ${data.reason.replace(/_/g, ' ').toUpperCase()}</p>
              ${data.priority === 'urgent' ? '<p style="color: #dc3545;"><strong>⚠️ URGENT NOTICE</strong></p>' : ''}
              <div style="margin: 20px 0;">
                ${data.message.replace(/\n/g, '<br>')}
              </div>
              <p>Best regards,<br>${data.senderName}</p>
            </div>
            <div class="footer">
              <p>This is an automated message from Legal Aid Platform. Please do not reply to this email.</p>
              <p>If you have any questions, please contact our support team.</p>
            </div>
          </div>
        </body>
        </html>
      `
    },
    announcement: {
      subject: `📢 Important Announcement: ${data.subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #17a2b8; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f8f9fa; border-left: 4px solid #17a2b8; }
            .footer { padding: 15px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>📢 Important Announcement</h2>
            </div>
            <div class="content">
              <h3>Hello {{RECIPIENT_NAME}},</h3>
              <div style="margin: 20px 0;">
                ${data.message.replace(/\n/g, '<br>')}
              </div>
              <p>Thank you for your attention.</p>
              <p>Best regards,<br>${data.senderName}</p>
            </div>
            <div class="footer">
              <p>Legal Aid Platform - Serving Justice Together</p>
            </div>
          </div>
        </body>
        </html>
      `
    }
  };

  return templates[templateType] || templates.default;
};

module.exports = {
  sendEmail,
  getEmailHistory,
  getEmailStats,
  getRecipientCounts
};
