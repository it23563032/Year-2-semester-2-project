const mongoose = require('mongoose');

// Direct connection and fix
async function fixLawyerIssue() {
  try {
    // Connect directly
    await mongoose.connect('mongodb://localhost:27017/legal_consultancy');
    console.log('✅ Connected to database');

    // Define models directly
    const CaseSchema = new mongoose.Schema({}, { strict: false });
    const AssignmentSchema = new mongoose.Schema({}, { strict: false });
    
    const Case = mongoose.model('CaseModel', CaseSchema);
    const LawyerAssignment = mongoose.model('LawyerAssignment', AssignmentSchema);

    console.log('🔍 Looking for cases with lawyer_assigned status but no currentLawyer...');

    // Find the problematic cases
    const brokenCases = await Case.find({
      status: 'lawyer_assigned',
      $or: [
        { currentLawyer: null },
        { currentLawyer: { $exists: false } }
      ]
    });

    console.log(`📊 Found ${brokenCases.length} cases to fix:`);
    brokenCases.forEach(c => console.log(`  - ${c.caseNumber}: ${c.status}`));

    let fixedCount = 0;

    for (const caseItem of brokenCases) {
      console.log(`\n🔧 Fixing case: ${caseItem.caseNumber} (${caseItem._id})`);
      
      // Find ANY assignment for this case (accepted or pending)
      const assignments = await LawyerAssignment.find({ case: caseItem._id }).sort({ createdAt: -1 });
      
      console.log(`  Found ${assignments.length} assignments for this case`);
      
      if (assignments.length > 0) {
        // Use the most recent assignment
        const assignment = assignments[0];
        console.log(`  Using assignment: ${assignment._id}, status: ${assignment.status}, lawyer: ${assignment.lawyer}`);
        
        // If assignment is not accepted, accept it
        if (assignment.status !== 'accepted') {
          console.log(`  Auto-accepting assignment...`);
          assignment.status = 'accepted';
          assignment.responseDate = new Date();
          assignment.lawyerResponse = 'Auto-accepted to fix data mismatch';
          await assignment.save();
        }
        
        // Update the case with the lawyer
        await Case.findByIdAndUpdate(caseItem._id, {
          currentLawyer: assignment.lawyer
        });
        
        console.log(`  ✅ Fixed case ${caseItem.caseNumber} with lawyer ${assignment.lawyer}`);
        fixedCount++;
      } else {
        console.log(`  ❌ No assignments found for case ${caseItem.caseNumber}`);
      }
    }

    console.log(`\n🎉 Fix completed! Fixed ${fixedCount} out of ${brokenCases.length} cases`);

    // Verify the fixes
    console.log('\n🔍 Verifying fixes...');
    const verifyFixed = await Case.find({ status: 'lawyer_assigned' });
    
    for (const caseItem of verifyFixed) {
      const hasLawyer = !!caseItem.currentLawyer;
      console.log(`${hasLawyer ? '✅' : '❌'} ${caseItem.caseNumber}: currentLawyer = ${caseItem.currentLawyer || 'null'}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📡 Database connection closed');
  }
}

// Run the fix
fixLawyerIssue();
