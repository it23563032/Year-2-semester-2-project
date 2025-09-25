const express = require("express");
const ChatBot = require("../Model/ChatBotModel");
const Case = require("../Model/CaseModel");
const { findBestMatch, generateSuggestions } = require("../services/chatbotKnowledgeBase");
const { protect } = require("../Controllers/UnverifiedAuthController");
const router = express.Router();

// Generate unique session ID
const generateSessionId = () => {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// Send message to chatbot
router.post("/send", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const userId = req.user?.id || null; // Allow unauthenticated users

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    // Generate new session ID if not provided
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      currentSessionId = generateSessionId();
    }

    // Get user's cases for contextual responses (only if user is authenticated)
    let userCases = [];
    if (userId) {
      userCases = await Case.find({ user: userId })
        .select('caseNumber caseType status district')
        .lean();
    }

    // Find or create chat session
    let chatSession = await ChatBot.findOne({ 
      user: userId || null, 
      sessionId: currentSessionId 
    });

    if (!chatSession) {
      chatSession = new ChatBot({
        user: userId || null,
        sessionId: currentSessionId,
        messages: []
      });
    }

    // Add user message to session
    chatSession.messages.push({
      type: 'user',
      content: message.trim(),
      timestamp: new Date()
    });

    // Get AI response using knowledge base
    const aiResponse = findBestMatch(message, userCases);

    // Add bot response to session
    chatSession.messages.push({
      type: 'bot',
      content: aiResponse.answer,
      timestamp: new Date(),
      intent: aiResponse.intent,
      confidence: aiResponse.confidence
    });

    // Update session
    chatSession.lastActivity = new Date();
    chatSession.isActive = true;
    await chatSession.save();

    res.json({
      success: true,
      response: {
        message: aiResponse.answer,
        intent: aiResponse.intent,
        confidence: aiResponse.confidence
      },
      sessionId: currentSessionId,
      messageId: chatSession.messages[chatSession.messages.length - 1]._id
    });

  } catch (error) {
    console.error("Error processing chatbot message:", error);
    res.status(500).json({
      message: "Failed to process message",
      error: error.message
    });
  }
});

// Get chat history for a session
router.get("/session/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id || null; // Allow unauthenticated users

    console.log('Looking for session:', sessionId, 'for user:', userId);

    // Try to find session by sessionId first, regardless of user
    let chatSession = await ChatBot.findOne({ sessionId: sessionId });

    // If found and user is authenticated, verify ownership
    if (chatSession && userId && chatSession.user && chatSession.user.toString() !== userId) {
      console.log('Session found but user mismatch');
      return res.status(404).json({ message: "Chat session not found" });
    }

    if (!chatSession) {
      console.log('Session not found in database');
      return res.status(404).json({ message: "Chat session not found" });
    }

    console.log('Session found:', chatSession.sessionId, 'with', chatSession.messages.length, 'messages');

    res.json({
      success: true,
      session: {
        sessionId: chatSession.sessionId,
        messages: chatSession.messages,
        lastActivity: chatSession.lastActivity,
        isActive: chatSession.isActive
      }
    });

  } catch (error) {
    console.error("Error fetching chat session:", error);
    res.status(500).json({
      message: "Failed to fetch chat session",
      error: error.message
    });
  }
});

// Get all chat sessions for user
router.get("/sessions", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const sessions = await ChatBot.find({ user: userId })
      .select('sessionId lastActivity isActive messages')
      .sort({ lastActivity: -1 })
      .limit(20); // Limit to last 20 sessions

    // Process sessions to include message count and last message
    const processedSessions = sessions.map(session => ({
      sessionId: session.sessionId,
      lastActivity: session.lastActivity,
      isActive: session.isActive,
      messageCount: session.messages.length,
      lastMessage: session.messages.length > 0 ? 
        session.messages[session.messages.length - 1].content.substring(0, 100) + '...' : 
        'No messages'
    }));

    res.json({
      success: true,
      sessions: processedSessions
    });

  } catch (error) {
    console.error("Error fetching chat sessions:", error);
    res.status(500).json({
      message: "Failed to fetch chat sessions",
      error: error.message
    });
  }
});

// Start new chat session
router.post("/session/new", async (req, res) => {
  try {
    const userId = req.user?.id || null; // Allow unauthenticated users
    const newSessionId = generateSessionId();

    // Create new session
    const newSession = new ChatBot({
      user: userId || null,
      sessionId: newSessionId,
      messages: []
    });

    // Add welcome message
    const welcomeMessage = userId 
      ? "Hello! I'm your legal assistant. I can help you with system navigation, case filing questions, legal processes, and your specific case details. How can I assist you today?"
      : "Hello! I'm your legal assistant. I can help you with general legal questions, system information, and case filing guidance. For personalized assistance with your specific cases, please log in to your account. How can I assist you today?";
    
    newSession.messages.push({
      type: 'bot',
      content: welcomeMessage,
      timestamp: new Date(),
      intent: 'welcome',
      confidence: 1.0
    });

    await newSession.save();

    res.json({
      success: true,
      sessionId: newSessionId,
      welcomeMessage: newSession.messages[0].content
    });

  } catch (error) {
    console.error("Error creating new chat session:", error);
    res.status(500).json({
      message: "Failed to create new chat session",
      error: error.message
    });
  }
});

// Get quick suggestions based on user's cases
router.get("/suggestions", async (req, res) => {
  try {
    const userId = req.user?.id || null; // Allow unauthenticated users

    // Get user's cases to provide contextual suggestions (only if user is authenticated)
    let userCases = [];
    if (userId) {
      userCases = await Case.find({ user: userId })
        .select('caseNumber caseType status district')
        .lean();
    }

    let suggestions = [];

    // Add case-specific suggestions if user has cases
    if (userCases.length > 0) {
      const activeCases = userCases.filter(c => 
        ['lawyer_requested', 'lawyer_assigned', 'filed', 'hearing_scheduled'].includes(c.status)
      );

      if (activeCases.length > 0) {
        suggestions.push(
          `What's the status of my case ${activeCases[0].caseNumber}?`,
          "How do I schedule a video call with my lawyer?",
          "What should I prepare for my upcoming hearing?"
        );
      }
    }

    // Add general suggestions
    suggestions.push(
      "How do I upload documents?",
      "What documents do I need to file a case?",
      "How long does the legal process take?",
      "What does 'case under review' mean?",
      "How do I find a lawyer for my case?"
    );

    res.json({
      success: true,
      suggestions: suggestions.slice(0, 6) // Limit to 6 suggestions
    });

  } catch (error) {
    console.error("Error fetching suggestions:", error);
    res.status(500).json({
      message: "Failed to fetch suggestions",
      error: error.message
    });
  }
});

// Delete chat session
router.delete("/session/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id || null; // Allow unauthenticated users

    console.log('Deleting session:', sessionId, 'for user:', userId);

    // Find session by sessionId
    let chatSession = await ChatBot.findOne({ sessionId: sessionId });

    // If found and user is authenticated, verify ownership
    if (chatSession && userId && chatSession.user && chatSession.user.toString() !== userId) {
      console.log('Session found but user mismatch');
      return res.status(404).json({ message: "Chat session not found" });
    }

    if (!chatSession) {
      console.log('Session not found in database');
      return res.status(404).json({ message: "Chat session not found" });
    }

    // Delete the session
    await ChatBot.deleteOne({ sessionId: sessionId });

    console.log('Session deleted successfully:', sessionId);

    res.json({
      success: true,
      message: "Chat session deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting chat session:", error);
    res.status(500).json({
      message: "Failed to delete chat session",
      error: error.message
    });
  }
});

// End/Archive chat session
router.put("/session/:sessionId/end", protect, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const chatSession = await ChatBot.findOne({ 
      user: userId, 
      sessionId: sessionId 
    });

    if (!chatSession) {
      return res.status(404).json({ message: "Chat session not found" });
    }

    chatSession.isActive = false;
    chatSession.lastActivity = new Date();
    await chatSession.save();

    res.json({
      success: true,
      message: "Chat session ended successfully"
    });

  } catch (error) {
    console.error("Error ending chat session:", error);
    res.status(500).json({
      message: "Failed to end chat session",
      error: error.message
    });
  }
});

module.exports = router;
