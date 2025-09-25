const express = require("express");
const Chat = require("../Model/ChatModel");
const Case = require("../Model/CaseModel");
const VerifiedClient = require("../Model/VerifiedClient");
const VerifiedLawyer = require("../Model/VerifiedLawyer");
const AuthController = require("../Controllers/AuthControllers");
const { protect } = require("../Controllers/UnverifiedAuthController");
const router = express.Router();

// Helper function to get user info from multiple collections
const getUserInfo = async (userId) => {
  if (!userId) return null;
  
  // Try VerifiedClient first
  let user = await VerifiedClient.findById(userId).select('fullName email');
  if (user) {
    return { _id: user._id, name: user.fullName, email: user.email, userType: 'verified_client' };
  }
  
  // Try VerifiedLawyer
  user = await VerifiedLawyer.findById(userId).select('fullName email');
  if (user) {
    return { _id: user._id, name: user.fullName, email: user.email, userType: 'verified_lawyer' };
  }
  
  // Try original User model
  user = await User.findById(userId).select('name email userType');
  if (user) {
    return { _id: user._id, name: user.name, email: user.email, userType: user.userType };
  }
  
  return null;
};

// Get chat messages for a case
router.get("/case/:caseId", protect, async (req, res) => {
  try {
    const { caseId } = req.params;
    
    // Verify user has access to this case
    const caseData = await Case.findOne({
      _id: caseId,
      $or: [
        { user: req.user.id },
        { currentLawyer: req.user.id }
      ]
    });

    if (!caseData) {
      return res.status(404).json({ message: "Case not found or access denied" });
    }

    // Get user and lawyer info manually
    const userInfo = await getUserInfo(caseData.user);
    const lawyerInfo = await getUserInfo(caseData.currentLawyer);
    
    // Attach user info to case data
    caseData.user = userInfo;
    caseData.currentLawyer = lawyerInfo;

    // Get chat messages
    const messages = await Chat.find({ case: caseId }).sort({ createdAt: 1 });
    
    // Manually populate sender and receiver info for each message
    const populatedMessages = await Promise.all(messages.map(async (message) => {
      const senderInfo = await getUserInfo(message.sender);
      const receiverInfo = await getUserInfo(message.receiver);
      
      return {
        ...message.toObject(),
        sender: senderInfo,
        receiver: receiverInfo
      };
    }));

    res.json({ messages: populatedMessages });
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    res.status(500).json({ message: error.message });
  }
});

// Send a message
router.post("/send", protect, async (req, res) => {
  try {
    const { caseId, message, receiverId } = req.body;
    
    console.log('Chat send request:', { caseId, receiverId, senderId: req.user.id });
    
    // Verify user has access to this case
    const caseData = await Case.findOne({
      _id: caseId,
      $or: [
        { user: req.user.id },
        { currentLawyer: req.user.id }
      ]
    });

    console.log('Case data for chat:', {
      caseId,
      userId: req.user.id,
      caseUser: caseData?.user,
      currentLawyer: caseData?.currentLawyer,
      caseFound: !!caseData
    });

    if (!caseData) {
      return res.status(404).json({ message: "Case not found or access denied" });
    }

    // Get user and lawyer info manually (similar to getCaseById)
    const userInfo = await getUserInfo(caseData.user);
    const lawyerInfo = await getUserInfo(caseData.currentLawyer);
    
    // Update case data with resolved user info
    caseData.user = userInfo;
    caseData.currentLawyer = lawyerInfo;

    // Verify receiver is either the client or the assigned lawyer
    const receiver = await getUserInfo(receiverId);
    if (!receiver) {
      return res.status(400).json({ message: "Receiver not found" });
    }

    // Check if receiver is either the client or the assigned lawyer for this case
    const isClient = caseData.user && receiverId === caseData.user._id.toString();
    const isAssignedLawyer = caseData.currentLawyer && receiverId === caseData.currentLawyer._id.toString();
    
    console.log('Receiver validation:', {
      receiverId,
      caseUser: caseData.user,
      currentLawyer: caseData.currentLawyer,
      caseUserId: caseData.user?._id?.toString(),
      currentLawyerId: caseData.currentLawyer?._id?.toString(),
      isClient,
      isAssignedLawyer
    });
    
    if (!isClient && !isAssignedLawyer) {
      return res.status(400).json({ 
        message: "Invalid receiver. You can only chat with the client or assigned lawyer for this case." 
      });
    }

    // Create chat message
    const chatMessage = new Chat({
      case: caseId,
      sender: req.user.id,
      receiver: receiverId,
      message: message,
      messageType: "text"
    });

    await chatMessage.save();

    // Get sender info for response
    const senderInfo = await getUserInfo(chatMessage.sender);
    chatMessage.sender = senderInfo;

    res.json({ 
      message: "Message sent successfully",
      chatMessage 
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: error.message });
  }
});

// Mark messages as read
router.put("/mark-read/:caseId", protect, async (req, res) => {
  try {
    const { caseId } = req.params;
    
    // Mark all messages in this case as read for the current user
    await Chat.updateMany(
      { 
        case: caseId, 
        receiver: req.user.id,
        isRead: false 
      },
      { isRead: true }
    );

    res.json({ message: "Messages marked as read" });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get unread message count
router.get("/unread-count", protect, async (req, res) => {
  try {
    const unreadCount = await Chat.countDocuments({
      receiver: req.user.id,
      isRead: false
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error("Error getting unread count:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
