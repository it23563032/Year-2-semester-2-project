const PDFDocument = require('pdfkit');

const generateCasePDF = (caseData) => {
  return new Promise((resolve, reject) => {
    try {
      console.log('Starting PDF generation for case:', caseData.caseNumber);
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on('data', buffer => buffers.push(buffer));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        console.log('PDF generation completed. Buffer size:', pdfData.length);
        resolve(pdfData);
      });

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('CASE FILING DOCUMENT', 50, 50, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica').text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
      
      // Draw line
      doc.moveTo(50, doc.y + 20).lineTo(550, doc.y + 20).stroke();
      doc.moveDown(2);

      // Case Information Section
      doc.fontSize(16).font('Helvetica-Bold').text('CASE INFORMATION', 50, doc.y);
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica');
      
      const caseInfo = [
        ['Case Number:', caseData.caseNumber || 'N/A'],
        ['Case Type:', getCaseTypeText(caseData.caseType) || 'N/A'],
        ['District:', caseData.district || 'Not specified'],
        ['Status:', caseData.status?.toUpperCase() || 'N/A'],
        ['Case Value:', `LKR ${caseData.caseValue || '0'}`],
        ['Filing Date:', caseData.createdAt ? new Date(caseData.createdAt).toLocaleDateString() : 'N/A'],
        ['Incident Date:', caseData.incidentDate ? new Date(caseData.incidentDate).toLocaleDateString() : 'Not specified']
      ];

      caseInfo.forEach(([label, value]) => {
        doc.font('Helvetica-Bold').text(label, 50, doc.y, { continued: true, width: 150 });
        doc.font('Helvetica').text(' ' + value, { width: 350 });
        doc.moveDown(0.3);
      });

      doc.moveDown(1);

      // Parties Section
      doc.fontSize(16).font('Helvetica-Bold').text('PARTIES INVOLVED', 50, doc.y);
      doc.moveDown(0.5);

      // Plaintiff
      doc.fontSize(14).font('Helvetica-Bold').text('Plaintiff:', 50, doc.y);
      doc.moveDown(0.3);
      doc.fontSize(12).font('Helvetica');
      const plaintiffInfo = [
        ['Name:', caseData.plaintiffName || 'N/A'],
        ['NIC:', caseData.plaintiffNIC || 'N/A'],
        ['Phone:', caseData.plaintiffPhone || 'N/A'],
        ['Address:', caseData.plaintiffAddress || 'N/A']
      ];

      plaintiffInfo.forEach(([label, value]) => {
        doc.font('Helvetica-Bold').text(label, 70, doc.y, { continued: true, width: 130 });
        doc.font('Helvetica').text(' ' + value, { width: 330 });
        doc.moveDown(0.3);
      });

      doc.moveDown(0.5);

      // Defendant
      doc.fontSize(14).font('Helvetica-Bold').text('Defendant:', 50, doc.y);
      doc.moveDown(0.3);
      doc.fontSize(12).font('Helvetica');
      const defendantInfo = [
        ['Name:', caseData.defendantName || 'N/A'],
        ['NIC/Registration:', caseData.defendantNIC || 'N/A'],
        ['Phone:', caseData.defendantPhone || 'Not provided'],
        ['Address:', caseData.defendantAddress || 'N/A']
      ];

      defendantInfo.forEach(([label, value]) => {
        doc.font('Helvetica-Bold').text(label, 70, doc.y, { continued: true, width: 130 });
        doc.font('Helvetica').text(' ' + value, { width: 330 });
        doc.moveDown(0.3);
      });

      doc.moveDown(1);

      // Case Description
      doc.fontSize(16).font('Helvetica-Bold').text('CASE DESCRIPTION', 50, doc.y);
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica').text(caseData.caseDescription || 'No description provided', 50, doc.y, { width: 500, align: 'justify' });
      doc.moveDown(1);

      // Relief Sought
      doc.fontSize(16).font('Helvetica-Bold').text('RELIEF SOUGHT', 50, doc.y);
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica').text(caseData.reliefSought || 'No relief specified', 50, doc.y, { width: 500, align: 'justify' });
      doc.moveDown(1);

      // Lawyer Details (if assigned)
      if (caseData.currentLawyer) {
        doc.fontSize(16).font('Helvetica-Bold').text('ASSIGNED LAWYER', 50, doc.y);
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica');
        
        const lawyerInfo = [
          ['Lawyer Name:', caseData.currentLawyer.name || 'N/A'],
          ['Email:', caseData.currentLawyer.email || 'N/A'],
          ['Assignment Status:', 'Assigned & Active']
        ];

        lawyerInfo.forEach(([label, value]) => {
          doc.font('Helvetica-Bold').text(label, 50, doc.y, { continued: true, width: 150 });
          doc.font('Helvetica').text(' ' + value, { width: 350 });
          doc.moveDown(0.3);
        });
        
        doc.moveDown(1);
      }

      // Court Details (if filed)
      if (caseData.status === 'filed' && caseData.courtDetails) {
        doc.fontSize(16).font('Helvetica-Bold').text('COURT FILING DETAILS', 50, doc.y);
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica');
        
        const courtInfo = [
          ['Court Name:', caseData.courtDetails.name || 'N/A'],
          ['Court Reference:', caseData.courtDetails.reference || 'N/A'],
          ['Filing Date:', caseData.courtDetails.filingDate ? new Date(caseData.courtDetails.filingDate).toLocaleDateString() : 'N/A'],
          ['Hearing Date:', caseData.courtDetails.hearingDate ? new Date(caseData.courtDetails.hearingDate).toLocaleDateString() : 'Not scheduled'],
          ['Filed by Lawyer:', caseData.currentLawyer?.name || 'N/A']
        ];

        courtInfo.forEach(([label, value]) => {
          doc.font('Helvetica-Bold').text(label, 50, doc.y, { continued: true, width: 150 });
          doc.font('Helvetica').text(' ' + value, { width: 350 });
          doc.moveDown(0.3);
        });
      }

      // Footer
      doc.fontSize(10).font('Helvetica').text(
        'This document was generated automatically by the Legal Case Management System.',
        50,
        750,
        { align: 'center', width: 500 }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

const getCaseTypeText = (type) => {
  const caseTypes = {
    smallClaims: "Small Claims Dispute",
    landDispute: "Land/Property Dispute",
    tenancy: "Tenancy/Rent Dispute",
    family: "Family Matter",
    consumer: "Consumer Rights",
    other: "Other Civil Matter"
  };
  return caseTypes[type] || type;
};

module.exports = {
  generateCasePDF
};