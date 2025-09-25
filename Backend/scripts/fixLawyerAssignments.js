const mongoose = require('mongoose');
const Case = require('../Model/CaseModel');
const LawyerAssignment = require('../Model/LawyerAssignment');
const VerifiedLawyer = require('../Model/VerifiedLawyer');
const User = require('../Model/UserModel');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/legal_consultancy', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function fixLawyerAssignments() {
  try {
    console.log('🔧 Starting lawyer assignment fix...');
    
    // Find all cases that should have lawyers but don't
    const casesNeedingFix = await Case.find({
      $and: [
        {
          $or: [
            { currentLawyer: null },
            { currentLawyer: { $exists: false } }
          ]
        },
        {
          status: { 
            $in: ['lawyer_assigned', 'filing_requested', 'filed', 'scheduling_requested', 'hearing_scheduled'] 
          }
        }
      ]
    });

    console.log(`📊 Found ${casesNeedingFix.length} cases that need lawyer assignment fixes`);

    let fixedCount = 0;
    let notFoundCount = 0;

    for (const caseItem of casesNeedingFix) {
      console.log(`\n🔍 Processing case: ${caseItem.caseNumber} (Status: ${caseItem.status})`);
      
      // Find accepted assignment for this case
      const assignment = await LawyerAssignment.findOne({
        case: caseItem._id,
        status: 'accepted'
      }).populate('lawyer');

      if (assignment && assignment.lawyer) {
        console.log(`✅ Found accepted assignment for case ${caseItem.caseNumber}`);
        console.log(`👨‍💼 Lawyer: ${assignment.lawyer.fullName || assignment.lawyer.name}`);
        
        // Update the case with the lawyer
        await Case.findByIdAndUpdate(caseItem._id, {
          currentLawyer: assignment.lawyer._id
        });
        
        console.log(`✅ Updated case ${caseItem.caseNumber} with lawyer ${assignment.lawyer._id}`);
        fixedCount++;
      } else {
        console.log(`❌ No accepted assignment found for case ${caseItem.caseNumber}`);
        
        // For hearing_scheduled cases, try to find any assignment and auto-accept it
        if (caseItem.status === 'hearing_scheduled') {
          const pendingAssignment = await LawyerAssignment.findOne({
            case: caseItem._id,
            status: 'pending'
          }).populate('lawyer');
          
          if (pendingAssignment && pendingAssignment.lawyer) {
            console.log(`🔄 Found pending assignment for hearing_scheduled case, auto-accepting...`);
            
            // Accept the assignment
            pendingAssignment.status = 'accepted';
            pendingAssignment.responseDate = new Date();
            pendingAssignment.lawyerResponse = 'Auto-accepted for hearing scheduled case';
            await pendingAssignment.save();
            
            // Update the case
            await Case.findByIdAndUpdate(caseItem._id, {
              currentLawyer: pendingAssignment.lawyer._id
            });
            
            console.log(`✅ Auto-accepted and updated case ${caseItem.caseNumber}`);
            fixedCount++;
          } else {
            console.log(`⚠️ Case ${caseItem.caseNumber} is hearing_scheduled but has no lawyer assignment`);
            notFoundCount++;
          }
        } else {
          notFoundCount++;
        }
      }
    }

    console.log('\n📈 Summary:');
    console.log(`✅ Fixed: ${fixedCount} cases`);
    console.log(`❌ Not found: ${notFoundCount} cases`);
    console.log(`📊 Total processed: ${casesNeedingFix.length} cases`);

    // Verify the fixes
    console.log('\n🔍 Verifying fixes...');
    const verificationCases = await Case.find({
      status: { 
        $in: ['lawyer_assigned', 'filing_requested', 'filed', 'scheduling_requested', 'hearing_scheduled'] 
      }
    }).populate('currentLawyer', 'fullName name email');

    let withLawyer = 0;
    let withoutLawyer = 0;

    for (const caseItem of verificationCases) {
      if (caseItem.currentLawyer) {
        withLawyer++;
        console.log(`✅ ${caseItem.caseNumber}: ${caseItem.currentLawyer.fullName || caseItem.currentLawyer.name}`);
      } else {
        withoutLawyer++;
        console.log(`❌ ${caseItem.caseNumber}: No lawyer assigned`);
      }
    }

    console.log('\n📊 Final Status:');
    console.log(`✅ Cases with lawyers: ${withLawyer}`);
    console.log(`❌ Cases without lawyers: ${withoutLawyer}`);
    console.log('🎉 Migration completed!');

  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the migration
fixLawyerAssignments();
