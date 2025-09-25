const mongoose = require('mongoose');
const Case = require('./Model/CaseModel');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/legalcase');

async function updateMissingDistricts() {
  try {
    console.log('Finding cases without district information...\n');
    
    // Find cases where district is null, undefined, or empty string
    const casesWithoutDistrict = await Case.find({
      $or: [
        { district: null },
        { district: undefined },
        { district: "" },
        { district: { $exists: false } }
      ]
    }).select('caseNumber plaintiffName caseType createdAt');
    
    console.log(`Found ${casesWithoutDistrict.length} cases without district information:`);
    
    if (casesWithoutDistrict.length === 0) {
      console.log('All cases already have district information.');
      return;
    }
    
    casesWithoutDistrict.forEach((caseItem, index) => {
      console.log(`${index + 1}. ${caseItem.caseNumber} - ${caseItem.plaintiffName} (${caseItem.caseType})`);
    });
    
    console.log('\nYou can manually assign districts to these cases through the update functionality.');
    console.log('Or uncomment the code below to assign a default district (e.g., Colombo) to all cases:');
    console.log('');
    
    // Uncomment these lines if you want to assign a default district to all cases without one
    /*
    const defaultDistrict = 'Colombo';
    const updateResult = await Case.updateMany(
      {
        $or: [
          { district: null },
          { district: undefined },
          { district: "" },
          { district: { $exists: false } }
        ]
      },
      { $set: { district: defaultDistrict } }
    );
    
    console.log(`\nUpdated ${updateResult.modifiedCount} cases with default district: ${defaultDistrict}`);
    */
    
  } catch (error) {
    console.error('Error updating districts:', error);
  } finally {
    mongoose.connection.close();
  }
}

updateMissingDistricts();