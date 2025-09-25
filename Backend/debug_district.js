const mongoose = require('mongoose');
const Case = require('./Model/CaseModel');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/legalcase', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function checkDistricts() {
  try {
    console.log('Checking district data in all cases...\n');
    
    const cases = await Case.find({}).select('caseNumber district caseType plaintiffName createdAt').sort({ createdAt: -1 });
    
    if (cases.length === 0) {
      console.log('No cases found in database');
      return;
    }
    
    console.log(`Found ${cases.length} cases:\n`);
    
    cases.forEach((caseItem, index) => {
      console.log(`Case ${index + 1}:`);
      console.log(`  Case Number: ${caseItem.caseNumber}`);
      console.log(`  Case Type: ${caseItem.caseType}`);
      console.log(`  Plaintiff: ${caseItem.plaintiffName}`);
      console.log(`  District: ${caseItem.district || 'NOT SET'}`);
      console.log(`  Created: ${caseItem.createdAt}`);
      console.log('  ---');
    });
    
    const casesWithoutDistrict = cases.filter(c => !c.district);
    console.log(`\nSummary:`);
    console.log(`  Total cases: ${cases.length}`);
    console.log(`  Cases with district: ${cases.length - casesWithoutDistrict.length}`);
    console.log(`  Cases without district: ${casesWithoutDistrict.length}`);
    
    if (casesWithoutDistrict.length > 0) {
      console.log('\nCases without district:');
      casesWithoutDistrict.forEach(c => {
        console.log(`  - ${c.caseNumber} (${c.caseType})`);
      });
    }
    
  } catch (error) {
    console.error('Error checking districts:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkDistricts();