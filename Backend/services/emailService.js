const nodemailer = require('nodemailer');

// Create transporter (using Gmail for demo - in production use proper SMTP)
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com', // Replace with actual email
    pass: 'your-app-password' // Replace with actual app password
  }
});

// Function to get district court name based on district
const getDistrictCourtName = (district) => {
  const districtCourtMap = {
    'Colombo': 'Colombo District Court',
    'Gampaha': 'Gampaha District Court',
    'Kalutara': 'Kalutara District Court',
    'Kandy': 'Kandy District Court',
    'Matale': 'Matale District Court',
    'Nuwara Eliya': 'Nuwara Eliya District Court',
    'Galle': 'Galle District Court',
    'Matara': 'Matara District Court',
    'Hambantota': 'Hambantota District Court',
    'Jaffna': 'Jaffna District Court',
    'Kilinochchi': 'Kilinochchi District Court',
    'Mannar': 'Mannar District Court',
    'Vavuniya': 'Vavuniya District Court',
    'Mullaitivu': 'Mullaitivu District Court',
    'Batticaloa': 'Batticaloa District Court',
    'Ampara': 'Ampara District Court',
    'Trincomalee': 'Trincomalee District Court',
    'Kurunegala': 'Kurunegala District Court',
    'Puttalam': 'Puttalam District Court',
    'Anuradhapura': 'Anuradhapura District Court',
    'Polonnaruwa': 'Polonnaruwa District Court',
    'Badulla': 'Badulla District Court',
    'Moneragala': 'Moneragala District Court',
    'Ratnapura': 'Ratnapura District Court',
    'Kegalle': 'Kegalle District Court'
  };
  
  return districtCourtMap[district] || `${district} District Court`;
};

// Email templates
const emailTemplates = {
  caseFiled: (caseData, defendantEmail) => {
    const courtName = getDistrictCourtName(caseData.district);
    return {
      to: defendantEmail,
      subject: `Legal Notice: Case Filed Against You - ${caseData.caseNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #d32f2f;">Legal Notice</h2>
          <p>Dear Sir/Madam,</p>
          <p>This is to inform you that a legal case has been filed against you in the ${courtName}.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-left: 4px solid #d32f2f;">
            <h3>Case Details:</h3>
            <p><strong>Case Number:</strong> ${caseData.caseNumber}</p>
            <p><strong>Case Type:</strong> ${caseData.caseType}</p>
            <p><strong>Plaintiff:</strong> ${caseData.plaintiffName}</p>
            <p><strong>Defendant:</strong> ${caseData.defendantName}</p>
            <p><strong>Court Reference:</strong> ${caseData.courtDetails?.reference || 'Pending'}</p>
            <p><strong>Filing Date:</strong> ${new Date(caseData.courtDetails?.filingDate || Date.now()).toLocaleDateString()}</p>
          </div>
          
          <p><strong>Important:</strong> You are advised to seek legal counsel immediately. Failure to respond to this case may result in a default judgment against you.</p>
          
          <p>This is an automated notification from the Court Filing System.</p>
          
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            ${courtName}<br>
            Court Filing System<br>
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `
    };
  },

  caseFiledToPlaintiff: (caseData, plaintiffEmail) => {
    const courtName = getDistrictCourtName(caseData.district);
    return {
      to: plaintiffEmail,
      subject: `Case Filed Successfully - ${caseData.caseNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2e7d32;">Case Filed Successfully</h2>
          <p>Dear ${caseData.plaintiffName},</p>
          <p>We are pleased to inform you that your case has been successfully filed with the ${courtName}.</p>
          
          <div style="background-color: #e8f5e8; padding: 20px; margin: 20px 0; border-left: 4px solid #2e7d32;">
            <h3>Case Details:</h3>
            <p><strong>Case Number:</strong> ${caseData.caseNumber}</p>
            <p><strong>Case Type:</strong> ${caseData.caseType}</p>
            <p><strong>Defendant:</strong> ${caseData.defendantName}</p>
            <p><strong>Court Reference:</strong> ${caseData.courtDetails?.reference || 'Pending'}</p>
            <p><strong>Filing Date:</strong> ${new Date(caseData.courtDetails?.filingDate || Date.now()).toLocaleDateString()}</p>
            <p><strong>Assigned Lawyer:</strong> ${caseData.currentLawyer?.name || 'To be assigned'}</p>
          </div>
          
          <p><strong>Next Steps:</strong> Your assigned lawyer will contact you regarding the next steps in the legal process. Please ensure you have all necessary documents ready.</p>
          
          <p>You can track your case progress through our online portal.</p>
          
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            ${courtName}<br>
            Court Filing System<br>
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `
    };
  },

  documentRequest: (caseData, clientEmail, requestMessage) => {
    const courtName = getDistrictCourtName(caseData.district);
    return {
      to: clientEmail,
      subject: `Document Request - Case ${caseData.caseNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1976d2;">Document Request</h2>
          <p>Dear ${caseData.plaintiffName},</p>
          <p>Your assigned lawyer has requested additional documents for your case.</p>
          
          <div style="background-color: #e3f2fd; padding: 20px; margin: 20px 0; border-left: 4px solid #1976d2;">
            <h3>Case Details:</h3>
            <p><strong>Case Number:</strong> ${caseData.caseNumber}</p>
            <p><strong>Case Type:</strong> ${caseData.caseType}</p>
            <p><strong>Defendant:</strong> ${caseData.defendantName}</p>
          </div>
          
          <div style="background-color: #fff3e0; padding: 20px; margin: 20px 0; border-left: 4px solid #f57c00;">
            <h3>Requested Documents:</h3>
            <p>${requestMessage}</p>
          </div>
          
          <p><strong>Action Required:</strong> Please upload the requested documents through our online portal or contact your lawyer directly.</p>
          
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            ${courtName}<br>
            Court Filing System<br>
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `
    };
  }
};

// Send email function
const sendEmail = async (emailData) => {
  try {
    // For demo purposes, we'll just log the email
    // In production, uncomment the actual sending code
    console.log('📧 EMAIL NOTIFICATION:');
    console.log('To:', emailData.to);
    console.log('Subject:', emailData.subject);
    console.log('Content:', emailData.html);
    console.log('---');
    
    // Uncomment this for actual email sending:
    // const result = await transporter.sendMail(emailData);
    // console.log('Email sent successfully:', result.messageId);
    
    return { success: true, message: 'Email notification logged (demo mode)' };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Send case filed notifications
const sendCaseFiledNotifications = async (caseData) => {
  try {
    const notifications = [];
    
    // Send to defendant if email is available
    if (caseData.defendantEmail) {
      const defendantEmail = emailTemplates.caseFiled(caseData, caseData.defendantEmail);
      const result = await sendEmail(defendantEmail);
      notifications.push({ recipient: 'defendant', result });
    }
    
    // Send to plaintiff
    if (caseData.user && caseData.user.email) {
      const plaintiffEmail = emailTemplates.caseFiledToPlaintiff(caseData, caseData.user.email);
      const result = await sendEmail(plaintiffEmail);
      notifications.push({ recipient: 'plaintiff', result });
    }
    
    return notifications;
  } catch (error) {
    console.error('Error sending case filed notifications:', error);
    return [];
  }
};

// Send document request notification
const sendDocumentRequestNotification = async (caseData, requestMessage) => {
  try {
    if (caseData.user && caseData.user.email) {
      const email = emailTemplates.documentRequest(caseData, caseData.user.email, requestMessage);
      return await sendEmail(email);
    }
    return { success: false, message: 'No client email found' };
  } catch (error) {
    console.error('Error sending document request notification:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmail,
  sendCaseFiledNotifications,
  sendDocumentRequestNotification
};
