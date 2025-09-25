const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const caseSchema = new Schema({
  caseType: {
    type: String,
    required: true,
  },
  plaintiffName: {
    type: String,
    required: true,
  },
  plaintiffNIC: {
    type: String,
    required: true,
  },
  plaintiffAddress: {
    type: String,
    required: true,
  },
  plaintiffPhone: {
    type: String,
    required: true,
  },
  defendantName: {
    type: String,
    required: true,
  },
  defendantNIC: {
    type: String,
    required: true,
  },
  defendantAddress: {
    type: String,
    required: true,
  },
  defendantPhone: {
    type: String,
  },
  defendantEmail: {
    type: String,
  },
  caseDescription: {
    type: String,
    required: true,
  },
  reliefSought: {
    type: String,
    required: true,
  },
  caseValue: {
    type: Number,
    default: 0,
  },
  incidentDate: {
    type: Date,
  },
  district: {
    type: String,
    required: true,
    enum: [
      "Colombo", "Gampaha", "Kalutara", "Kandy", "Matale", "Nuwara Eliya",
      "Galle", "Matara", "Hambantota", "Jaffna", "Kilinochchi", "Mannar",
      "Vavuniya", "Mullaitivu", "Batticaloa", "Ampara", "Trincomalee",
      "Kurunegala", "Puttalam", "Anuradhapura", "Polonnaruwa", "Badulla",
      "Moneragala", "Ratnapura", "Kegalle"
    ],
  },
  documents: [
    {
      filename: String,
      originalName: String,
      uploadDate: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  status: {
    type: String,
    enum: ["pending", "verified", "lawyer_requested", "lawyer_assigned", "filing_requested", "under_review", "approved", "rejected", "filed", "scheduling_requested", "hearing_scheduled", "rescheduled"],
    default: "pending",
  },
  caseNumber: {
    type: String,
    unique: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UserModel",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  verificationStatus: {
    type: String,
    enum: ["pending", "verified", "rejected"],
    default: "pending",
  },
  currentLawyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UserModel",
  },
  filingStatus: {
    type: String,
    enum: ["not_started", "preparing", "submitted", "confirmed", "filed"],
    default: "not_started",
  },
  courtDetails: {
    name: String,
    reference: String,
    filingDate: Date,
    hearingDate: Date,
    filedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel"
    }
  },
  // Direct scheduling fields (used by court scheduler)
  hearingDate: {
    type: Date
  },
  hearingTime: {
    startTime: String,
    endTime: String
  },
  courtroom: {
    type: String
  },
  lawyerNotes: {
    type: String
  },
  documentRequest: {
    type: String
  },
  documentRequestDate: {
    type: Date
  },
  readyToFileDate: {
    type: Date
  },
  filingRequested: {
    type: Boolean,
    default: false
  },
  filingRequestDate: {
    type: Date
  },
  filingRequestMessage: {
    type: String
  },
});

// Middleware to ensure ScheduledCase record exists when status is set to "hearing_scheduled"
caseSchema.pre('save', async function(next) {
  // Only check if status is being changed to "hearing_scheduled"
  if (this.isModified('status') && this.status === 'hearing_scheduled') {
    console.log(`🔍 Checking ScheduledCase record for case ${this.caseNumber}...`);
    
    try {
      const ScheduledCase = require('./ScheduledCase');
      const existingScheduled = await ScheduledCase.findOne({ case: this._id });
      
      if (!existingScheduled) {
        console.log(`⚠️ WARNING: Case ${this.caseNumber} marked as "hearing_scheduled" but no ScheduledCase record exists!`);
        console.log(`🔧 Auto-correcting status to "lawyer_assigned" - case needs proper court scheduling`);
        
        // Auto-correct the status - case should go through proper court scheduler workflow
        this.status = 'lawyer_assigned';
      } else {
        console.log(`✅ ScheduledCase record exists for case ${this.caseNumber}`);
      }
    } catch (error) {
      console.error(`❌ Error checking ScheduledCase record:`, error);
      // If check fails, don't allow hearing_scheduled status
      this.status = 'lawyer_assigned';
    }
  }
  
  next();
});

// Generate case number before saving
caseSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      const year = new Date().getFullYear();
      
      // Find the highest existing case number for this year
      const latestCase = await this.constructor.findOne({
        caseNumber: { $regex: `^CL${year}-` }
      }).sort({ caseNumber: -1 });
      
      let nextNumber = 1;
      if (latestCase && latestCase.caseNumber) {
        // Extract number from the latest case number (e.g., "CL2025-0009" -> 9)
        const match = latestCase.caseNumber.match(/CL\d{4}-(\d+)$/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      
      // Keep trying until we find a unique case number
      let attempts = 0;
      while (attempts < 100) { // Prevent infinite loop
        const caseNumber = `CL${year}-${String(nextNumber).padStart(4, '0')}`;
        
        // Check if this case number already exists
        const existingCase = await this.constructor.findOne({ caseNumber });
        if (!existingCase) {
          this.caseNumber = caseNumber;
          console.log("Generated unique case number:", this.caseNumber);
          break;
        }
        
        nextNumber++;
        attempts++;
      }
      
      if (!this.caseNumber) {
        // Fallback to timestamp-based number
        const timestamp = Date.now().toString().slice(-6);
        this.caseNumber = `CL${year}-${timestamp}`;
        console.log("Using fallback case number:", this.caseNumber);
      }
    } catch (error) {
      console.error("Error generating case number:", error);
      // Fallback case number using timestamp
      const timestamp = Date.now().toString().slice(-6);
      const year = new Date().getFullYear();
      this.caseNumber = `CL${year}-${timestamp}`;
    }
  }
  this.updatedAt = Date.now();
  next();
});
module.exports = mongoose.model("CaseModel", caseSchema);
