const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const chatSchema = new Schema({
  case: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CaseModel",
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UserModel",
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UserModel",
    required: true
  },
  message: {
    type: String,
    required: true
  },
  messageType: {
    type: String,
    enum: ["text", "document", "system"],
    default: "text"
  },
  attachments: [{
    filename: String,
    originalName: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying
chatSchema.index({ case: 1, createdAt: -1 });

module.exports = mongoose.model("Chat", chatSchema);
