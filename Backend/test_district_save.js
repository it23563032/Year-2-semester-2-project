const mongoose = require('mongoose');
const Case = require('./Model/CaseModel');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/legalcase');

async function testDistrictSave() {
  try {
    console.log('Testing direct case creation with district...\n');
    
    const testCaseData = {
      caseType: 'smallClaims',
      plaintiffName: 'Test Plaintiff',
      plaintiffNIC: '123456789V',
      plaintiffAddress: 'Test Address',
      plaintiffPhone: '0771234567',
      defendantName: 'Test Defendant',
      defendantNIC: '987654321V',
      defendantAddress: 'Test Defendant Address',
      caseDescription: 'This is a test case to check district saving',
      reliefSought: 'Test relief',
      district: 'Colombo',
      user: new mongoose.Types.ObjectId() // Generate a fake user ID for testing
    };
    
    console.log('Creating test case with data:', testCaseData);
    console.log('District field specifically:', testCaseData.district);
    
    const testCase = new Case(testCaseData);
    
    console.log('\nCase object before save:');
    console.log('District in object:', testCase.district);
    console.log('Full object:', testCase.toObject());
    
    await testCase.save();
    
    console.log('\n=== SAVED SUCCESSFULLY ===');
    console.log('Case ID:', testCase._id);
    console.log('Case Number:', testCase.caseNumber);
    console.log('District after save:', testCase.district);
    
    // Now fetch it back from database to confirm
    const fetchedCase = await Case.findById(testCase._id);
    console.log('\n=== FETCHED FROM DATABASE ===');
    console.log('District in fetched case:', fetchedCase.district);
    console.log('Full fetched case:', fetchedCase.toObject());
    
    // Clean up test case
    await Case.findByIdAndDelete(testCase._id);
    console.log('\n=== TEST CASE DELETED ===');
    
  } catch (error) {
    console.error('Error in test:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
  } finally {
    mongoose.connection.close();
  }
}

testDistrictSave();