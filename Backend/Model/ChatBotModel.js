const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const chatBotSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserModel',
    required: false // Allow unauthenticated users
  },
  sessionId: {
    type: String,
    required: true
  },
  messages: [{
    type: {
      type: String,
      enum: ['user', 'bot'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    intent: {
      type: String,
      default: null // Store the matched intent/category
    },
    confidence: {
      type: Number,
      default: 0 // Store confidence score for AI matching
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying
chatBotSchema.index({ user: 1, sessionId: 1 });
chatBotSchema.index({ user: 1, lastActivity: -1 });

module.exports = mongoose.model('ChatBot', chatBotSchema);
