const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const paymentTransactionSchema = new Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VerifiedClient',
    required: true
  },
  servicePackage: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'serviceType',
    required: true
  },
  serviceType: {
    type: String,
    enum: ['ServicePackage', 'IndividualService'],
    required: true,
    default: 'ServicePackage'
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'LKR'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'bank_transfer', 'mobile_payment'],
    default: 'card'
  },
  cardDetails: {
    last4Digits: String,
    cardType: String, // visa, mastercard, etc.
    expiryMonth: String,
    expiryYear: String
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentGatewayResponse: {
    type: mongoose.Schema.Types.Mixed // Store gateway response
  },
  receiptNumber: {
    type: String,
    unique: true
  },
  receiptGenerated: {
    type: Boolean,
    default: false
  },
  receiptData: {
    issueDate: Date,
    dueDate: Date,
    items: [{
      description: String,
      amount: Number
    }],
    tax: Number,
    totalAmount: Number
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

// Generate unique transaction ID
paymentTransactionSchema.pre('save', function(next) {
  if (!this.transactionId) {
    this.transactionId = 'TXN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }
  if (!this.receiptNumber && this.paymentStatus === 'completed') {
    this.receiptNumber = 'RCP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("PaymentTransaction", paymentTransactionSchema);
