const mongoose = require('mongoose');
require('dotenv').config();

// Simple fix script - no timeout issues
async function fixCurrentLawyerField() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/legal_consultancy');
    console.log('📡 Connected to database');

    const Case = require('../Model/CaseModel');
    const LawyerAssignment = require('../Model/LawyerAssignment');

    // Find cases with lawyer_assigned status but no currentLawyer
    const brokenCases = await Case.find({
      status: 'lawyer_assigned',
      $or: [
        { currentLawyer: null },
        { currentLawyer: { $exists: false } }
      ]
    });

    console.log(`🔍 Found ${brokenCases.length} cases with lawyer_assigned status but no currentLawyer`);

    for (const caseItem of brokenCases) {
      console.log(`\n🔧 Fixing case: ${caseItem.caseNumber}`);
      
      // Find the accepted assignment
      const assignment = await LawyerAssignment.findOne({
        case: caseItem._id,
        status: 'accepted'
      });

      if (assignment) {
        console.log(`✅ Found accepted assignment, updating currentLawyer to: ${assignment.lawyer}`);
        
        await Case.findByIdAndUpdate(caseItem._id, {
          currentLawyer: assignment.lawyer
        });
        
        console.log(`✅ Fixed case ${caseItem.caseNumber}`);
      } else {
        console.log(`❌ No accepted assignment found for case ${caseItem.caseNumber}`);
        
        // Check if there are any assignments at all
        const anyAssignment = await LawyerAssignment.findOne({
          case: caseItem._id
        }).sort({ createdAt: -1 });

        if (anyAssignment) {
          console.log(`🔧 Found assignment with status: ${anyAssignment.status}, auto-accepting...`);
          
          // Auto-accept the assignment
          anyAssignment.status = 'accepted';
          anyAssignment.responseDate = new Date();
          anyAssignment.lawyerResponse = 'Auto-accepted to fix lawyer_assigned status';
          await anyAssignment.save();
          
          // Update the case
          await Case.findByIdAndUpdate(caseItem._id, {
            currentLawyer: anyAssignment.lawyer
          });
          
          console.log(`✅ Auto-accepted and fixed case ${caseItem.caseNumber}`);
        } else {
          console.log(`❌ No assignments found at all for case ${caseItem.caseNumber}`);
        }
      }
    }

    console.log('\n🎉 Fix completed!');
    
    // Verify the fixes
    const verifyFixed = await Case.find({
      status: 'lawyer_assigned'
    }).populate('currentLawyer', 'fullName name');

    console.log('\n📊 Verification Results:');
    for (const caseItem of verifyFixed) {
      const hasLawyer = !!caseItem.currentLawyer;
      console.log(`${hasLawyer ? '✅' : '❌'} ${caseItem.caseNumber}: ${hasLawyer ? (caseItem.currentLawyer.fullName || caseItem.currentLawyer.name) : 'NO LAWYER'}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📡 Database connection closed');
  }
}

fixCurrentLawyerField();
