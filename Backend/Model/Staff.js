const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcryptjs");

const staffSchema = new Schema({
  staffId: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(v) {
        return /^STAFF\d+$/.test(v);
      },
      message: "Staff ID must start with 'STAFF' followed by numbers"
    }
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  phoneNumber: {
    type: String,
    required: true
  },
  nic: {
    type: String,
    required: false, // Made optional for existing records
    unique: true,
    sparse: true // Allow multiple null values
  },
  address: {
    type: String,
    required: false // Made optional for existing records
  },
  role: {
    type: String,
    enum: ['admin', 'court_scheduler', 'finance_manager', 'analytics_notification_manager'],
    required: true
  },
  department: {
    type: String,
    enum: ['System Administration', 'Court Operations', 'Finance', 'Analytics & Communications'],
    required: false  // Will be set automatically by pre-save hook
  },
  permissions: {
    canVerifyLawyers: {
      type: Boolean,
      default: false
    },
    canVerifyClients: {
      type: Boolean,
      default: false
    },
    canManageStaff: {
      type: Boolean,
      default: false
    },
    canViewReports: {
      type: Boolean,
      default: false
    },
    canManageSystem: {
      type: Boolean,
      default: false
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware for hashing password and setting department
staffSchema.pre("save", async function (next) {
  try {
    console.log('Staff pre-save hook triggered for role:', this.role);
    
    // Set department and permissions based on role FIRST (before validation)
    if (this.isModified('role') || this.isNew) {
      switch(this.role) {
        case 'admin':
          this.permissions = {
            canVerifyLawyers: true,
            canVerifyClients: true,
            canManageStaff: true,
            canViewReports: true,
            canManageSystem: true
          };
          this.department = 'System Administration';
          break;
        case 'court_scheduler':
          this.permissions = {
            canVerifyLawyers: false,
            canVerifyClients: false,
            canManageStaff: false,
            canViewReports: true,
            canManageSystem: false
          };
          this.department = 'Court Operations';
          break;
        case 'finance_manager':
          this.permissions = {
            canVerifyLawyers: false,
            canVerifyClients: false,
            canManageStaff: false,
            canViewReports: true,
            canManageSystem: false
          };
          this.department = 'Finance';
          break;
        case 'analytics_notification_manager':
          this.permissions = {
            canVerifyLawyers: false,
            canVerifyClients: false,
            canManageStaff: false,
            canViewReports: true,
            canManageSystem: false
          };
          this.department = 'Analytics & Communications';
          break;
        default:
          console.error('Unknown role:', this.role);
          return next(new Error(`Unknown role: ${this.role}`));
      }
    }
    
    // Hash password if modified
    if (this.isModified("password")) {
      this.password = await bcrypt.hash(this.password, 12);
    }
    
    this.updatedAt = Date.now();
    console.log('Staff pre-save completed. Department set to:', this.department);
    next();
  } catch (error) {
    console.error('Error in staff pre-save hook:', error);
    next(error);
  }
});

// Method to check password
staffSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Static method to generate next staff ID
staffSchema.statics.generateStaffId = async function() {
  const lastStaff = await this.findOne({}, {}, { sort: { 'staffId': -1 } });
  let nextId = 1;
  if (lastStaff && lastStaff.staffId) {
    const lastIdNumber = parseInt(lastStaff.staffId.replace('STAFF', ''));
    nextId = lastIdNumber + 1;
  }
  return `STAFF${nextId.toString().padStart(4, '0')}`;
};

module.exports = mongoose.model("Staff", staffSchema);
