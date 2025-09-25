const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const emailReportHistorySchema = new Schema({
  reportId: {
    type: String,
    required: true,
    unique: true
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  reportType: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true
  },
  reportDate: {
    type: Date,
    required: true
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['sent', 'failed', 'pending'],
    default: 'sent'
  },
  errorMessage: {
    type: String,
    default: null
  },
  recipientEmail: {
    type: String,
    required: true
  },
  reportData: {
    userStats: {
      newLawyers: Number,
      newClients: Number,
      verifiedLawyers: Number,
      verifiedClients: Number,
      rejectedLawyers: Number,
      rejectedClients: Number
    },
    caseActivity: {
      newCases: Number,
      resolvedCases: Number,
      pendingCases: Number,
      totalCases: Number
    },
    financialMetrics: {
      revenue: Number,
      transactions: Number,
      pendingPayments: Number,
      currency: String
    },
    systemEvents: {
      failedLogins: Number,
      systemErrors: Number,
      highPriorityItems: Number,
      systemUptime: Number
    },
    performanceMetrics: {
      averageResponseTime: Number,
      totalUsers: Number,
      activeUsers: Number
    },
    staffActivity: {
      staffActions: Number,
      tasksCompleted: Number,
      activeStaff: Number
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Generate report ID before saving
emailReportHistorySchema.pre('save', function(next) {
  if (!this.reportId) {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '');
    this.reportId = `REPORT_${dateStr}_${timeStr}_${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

module.exports = mongoose.model("EmailReportHistory", emailReportHistorySchema);
