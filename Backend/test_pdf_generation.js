const { generateCasePDF } = require('./services/pdfService');
const fs = require('fs');

// Test data that mimics a real case
const testCaseData = {
  caseNumber: 'CL2025-0001',
  caseType: 'smallClaims',
  district: 'Colombo',
  status: 'verified',
  caseValue: 50000,
  createdAt: new Date(),
  incidentDate: new Date('2024-12-01'),
  plaintiffName: 'John Doe',
  plaintiffNIC: '123456789V',
  plaintiffPhone: '0771234567',
  plaintiffAddress: '123 Main Street, Colombo 01',
  defendantName: 'ABC Company',
  defendantNIC: '987654321V',
  defendantPhone: '0119876543',
  defendantAddress: '456 Business District, Colombo 03',
  caseDescription: 'This is a test case to verify PDF generation functionality. The defendant failed to deliver goods as per the agreed contract.',
  reliefSought: 'Refund of the full payment amount plus compensation for damages.',
  currentLawyer: {
    name: 'Test Lawyer',
    email: 'lawyer@test.com'
  },
  courtDetails: {
    name: 'Colombo District Court',
    reference: 'CDC/2025/001',
    filingDate: new Date(),
    hearingDate: new Date('2025-03-15')
  }
};

async function testPDFGeneration() {
  try {
    console.log('Testing PDF generation...');
    console.log('Test case data:', {
      caseNumber: testCaseData.caseNumber,
      district: testCaseData.district,
      caseType: testCaseData.caseType
    });
    
    const pdfBuffer = await generateCasePDF(testCaseData);
    
    console.log('PDF generation successful!');
    console.log('PDF buffer size:', pdfBuffer.length, 'bytes');
    
    // Save the test PDF to verify it works
    fs.writeFileSync('./test_case_output.pdf', pdfBuffer);
    console.log('Test PDF saved as: test_case_output.pdf');
    
    console.log('✅ PDF generation is working correctly!');
    
  } catch (error) {
    console.error('❌ PDF generation failed:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testPDFGeneration();