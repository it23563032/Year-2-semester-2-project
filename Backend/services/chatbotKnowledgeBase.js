// Chatbot Knowledge Base - Fixed Q&A pairs organized by categories

const knowledgeBase = {
  // Basic Conversation (10)
  basicConversation: [
    {
      question: "Hello, hi, hey, good morning, good afternoon, good evening",
      answer: "Hello! I'm your legal assistant. I'm here to help you with legal questions, system navigation, case filing guidance, and legal processes. How can I assist you today?",
      keywords: ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "greetings"]
    },
    {
      question: "Thank you, thanks, thank you so much, I appreciate it",
      answer: "You're very welcome! I'm glad I could help. If you have any other legal questions or need assistance with case filing, system navigation, or legal processes, feel free to ask anytime.",
      keywords: ["thank you", "thanks", "appreciate", "grateful", "welcome"]
    },
    {
      question: "Goodbye, bye, see you later, have a good day",
      answer: "Goodbye! Thank you for using our legal assistant. If you need any help with legal matters, case filing, or system navigation in the future, don't hesitate to come back. Have a great day!",
      keywords: ["goodbye", "bye", "see you", "farewell", "have a good day", "take care"]
    },
    {
      question: "How are you, how are you doing, what's up",
      answer: "I'm doing well, thank you for asking! I'm here and ready to help you with any legal questions, case filing guidance, or system navigation you might need. What can I assist you with today?",
      keywords: ["how are you", "how are you doing", "what's up", "how's it going"]
    },
    {
      question: "What can you do, what are your capabilities, what do you help with",
      answer: "I can help you with: 1) System navigation and how to use our legal platform 2) Case filing questions and requirements 3) Legal process explanations 4) General legal information 5) Your specific case details (if you're logged in). What would you like to know about?",
      keywords: ["what can you do", "capabilities", "help with", "what do you do", "functions"]
    },
    {
      question: "I need help, can you help me, help please",
      answer: "Of course I can help you! I'm your legal assistant and I'm here to assist with legal questions, case filing, system navigation, and legal processes. What specific help do you need? Please describe your question or situation.",
      keywords: ["need help", "can you help", "help please", "assist", "support"]
    },
    {
      question: "I don't understand, can you explain, what does that mean",
      answer: "I'd be happy to explain! Could you please tell me what specific part you don't understand? I can provide clearer explanations about legal processes, system features, case filing requirements, or any other topic you're confused about.",
      keywords: ["don't understand", "explain", "what does that mean", "confused", "clarify"]
    },
    {
      question: "Yes, no, maybe, I think so, I'm not sure",
      answer: "I understand your response. If you'd like me to elaborate on anything or if you have follow-up questions, please let me know. I'm here to provide clear explanations about legal matters, case filing, or system navigation.",
      keywords: ["yes", "no", "maybe", "think so", "not sure", "possibly"]
    },
    {
      question: "Sorry, excuse me, pardon me, my apologies",
      answer: "No need to apologize at all! I'm here to help and answer any questions you have. Whether it's about legal processes, case filing, system navigation, or anything else, feel free to ask without hesitation.",
      keywords: ["sorry", "excuse me", "pardon", "apologies", "forgive"]
    },
    {
      question: "Great, awesome, excellent, perfect, that's helpful",
      answer: "I'm so glad I could help! It makes me happy to know that my explanations are useful. If you have any other questions about legal matters, case filing, or system navigation, I'm here to assist you further.",
      keywords: ["great", "awesome", "excellent", "perfect", "helpful", "useful", "good"]
    }
  ],
  
  // System Navigation Questions (10)
  systemNavigation: [
    {
      question: "How do I upload documents?",
      answer: "To upload documents: 1) Go to your case details page 2) Click 'Upload Documents' 3) Select files from your device 4) Add descriptions 5) Click 'Upload'. Supported formats: PDF, DOC, DOCX, JPG, PNG.",
      keywords: ["upload", "document", "file", "attach", "add files"]
    },
    {
      question: "How do I check my case status?",
      answer: "You can check your case status by: 1) Going to your Dashboard 2) Looking at the 'Case Status' column 3) Clicking on a case to see detailed status updates. Statuses include: Pending, Verified, Lawyer Requested, Filed, etc.",
      keywords: ["status", "check", "progress", "case status", "update"]
    },
    {
      question: "How do I find a lawyer for my case?",
      answer: "To find a lawyer: 1) Go to your case details 2) Click 'Request Lawyer' 3) Choose between 'Auto-Assign' or 'Select Specific Lawyer' 4) Wait for lawyer acceptance. You'll be notified once a lawyer accepts your case.",
      keywords: ["lawyer", "find", "assign", "request", "legal help"]
    },
    {
      question: "How do I schedule a video call with my lawyer?",
      answer: "To schedule a video call: 1) Go to your Dashboard 2) Find your case in 'Meet Your Lawyer' section 3) Click 'Start Video Call' for instant call or 'Schedule Call' for later 4) Follow the prompts to join the call.",
      keywords: ["video call", "schedule", "meeting", "call", "lawyer call"]
    },
    {
      question: "How do I view my chat history with my lawyer?",
      answer: "To view chat history: 1) Go to your case details page 2) Click on the 'Chat' tab 3) All your messages with your lawyer will be displayed chronologically. Chat history persists throughout your case.",
      keywords: ["chat", "messages", "history", "conversation", "lawyer chat"]
    },
    {
      question: "How do I update my profile information?",
      answer: "To update your profile: 1) Click on your profile picture/name in the top right 2) Select 'Profile Settings' 3) Edit your information 4) Click 'Save Changes'. Keep your contact details updated for better communication.",
      keywords: ["profile", "update", "edit", "information", "settings"]
    },
    {
      question: "How do I download my case documents?",
      answer: "To download documents: 1) Go to your case details 2) Click on 'Documents' tab 3) Find the document you want 4) Click the download icon next to the document. All case-related documents are stored securely.",
      keywords: ["download", "documents", "files", "get documents", "save"]
    },
    {
      question: "How do I track my case progress?",
      answer: "Track your case progress by: 1) Visiting your Dashboard regularly 2) Checking case status updates 3) Reading notifications 4) Reviewing case timeline 5) Communicating with your lawyer through the chat system.",
      keywords: ["track", "progress", "timeline", "follow", "monitor"]
    },
    {
      question: "How do I change my password?",
      answer: "To change your password: 1) Go to Profile Settings 2) Click 'Security' tab 3) Enter your current password 4) Enter new password twice 5) Click 'Update Password'. Use a strong password for security.",
      keywords: ["password", "change", "security", "login", "account"]
    },
    {
      question: "How do I get help if I'm stuck?",
      answer: "If you need help: 1) Use this chatbot for common questions 2) Contact your assigned lawyer through the chat system 3) Check the Learning Hub for detailed guides 4) Contact our support team if technical issues persist.",
      keywords: ["help", "stuck", "support", "assistance", "problem"]
    }
  ],

  // Case Filing Related Questions (10)
  caseFiling: [
    {
      question: "What documents do I need to file a case?",
      answer: "For case filing, you typically need: 1) Completed case form 2) Supporting evidence documents 3) Government-issued ID 4) Any relevant contracts or agreements 5) Witness statements (if applicable) 6) Medical records (for injury cases).",
      keywords: ["documents", "file", "case", "required", "paperwork"]
    },
    {
      question: "How long does it take to file a case?",
      answer: "Case filing timeline: 1) Initial submission: Immediate 2) Verification: 1-2 business days 3) Lawyer assignment: 1-3 business days 4) Court filing: 5-10 business days after lawyer acceptance. Total: 1-2 weeks typically.",
      keywords: ["time", "duration", "how long", "timeline", "process"]
    },
    {
      question: "What types of cases can I file?",
      answer: "You can file various case types including: 1) Small Claims (debts, damages under Rs. 1,000,000) 2) Land Disputes 3) Contract Disputes 4) Employment Issues 5) Consumer Complaints 6) Family Matters 7) Property Disputes 8) Business Disputes.",
      keywords: ["types", "kinds", "categories", "what cases", "legal matters"]
    },
    {
      question: "How much does it cost to file a case?",
      answer: "Case filing costs vary by case type: 1) Small Claims: Rs. 500-2,000 2) Land Disputes: Rs. 1,000-5,000 3) Contract Disputes: Rs. 800-3,000 4) Family Matters: Rs. 1,500-4,000. Court fees are separate and vary by district.",
      keywords: ["cost", "fee", "price", "charge", "money"]
    },
    {
      question: "Can I file a case without a lawyer?",
      answer: "Yes, you can file cases without a lawyer for: 1) Small Claims Court matters 2) Simple disputes under Rs. 500,000 3) Consumer complaints. However, having a lawyer increases your chances of success and ensures proper legal procedures.",
      keywords: ["without lawyer", "self-represent", "pro se", "alone", "no lawyer"]
    },
    {
      question: "What happens after I file my case?",
      answer: "After filing: 1) Your case gets verified by our team 2) A qualified lawyer is assigned 3) Your lawyer reviews and prepares the case 4) Case is filed with the district court 5) You receive court reference number 6) Hearing is scheduled.",
      keywords: ["after filing", "next steps", "what happens", "process", "after submission"]
    },
    {
      question: "How do I know if my case is strong?",
      answer: "A strong case typically has: 1) Clear evidence and documentation 2) Valid legal basis 3) Witnesses (if applicable) 4) Proper documentation 5) Timely filing within statute of limitations. Your assigned lawyer will assess your case strength.",
      keywords: ["strong case", "win", "chances", "good case", "success"]
    },
    {
      question: "Can I withdraw my case after filing?",
      answer: "Yes, you can withdraw your case: 1) Before court filing: Simple withdrawal 2) After court filing: Requires court permission 3) May involve some costs 4) Your lawyer can guide you through the process. Consider carefully before withdrawing.",
      keywords: ["withdraw", "cancel", "stop", "drop", "end case"]
    },
    {
      question: "What if I can't afford the filing fees?",
      answer: "If you can't afford fees: 1) Check if you qualify for fee waiver programs 2) Look into legal aid societies 3) Consider payment plans 4) Discuss with your assigned lawyer 5) Some organizations provide pro bono services for qualifying cases.",
      keywords: ["can't afford", "no money", "poor", "financial help", "free"]
    },
    {
      question: "How do I prepare for court filing?",
      answer: "Prepare for court filing by: 1) Gathering all required documents 2) Organizing evidence chronologically 3) Preparing witness statements 4) Understanding your case facts 5) Working with your assigned lawyer 6) Completing the Pre-Court Checklist.",
      keywords: ["prepare", "ready", "court filing", "before court", "preparation"]
    }
  ],

  // Legal Process Questions (10)
  legalProcess: [
    {
      question: "What does 'case under review' mean?",
      answer: "'Under review' means your case is being examined by our legal team to ensure all documents are complete and the case meets filing requirements. This usually takes 1-2 business days.",
      keywords: ["under review", "reviewing", "examining", "checking", "assessment"]
    },
    {
      question: "How long does the legal process take?",
      answer: "Legal process timeline: 1) Filing: 1-2 weeks 2) Court processing: 2-4 weeks 3) Hearing scheduling: 4-8 weeks 4) First hearing: 2-6 months 5) Resolution: 6-18 months depending on case complexity.",
      keywords: ["how long", "duration", "timeline", "process time", "court time"]
    },
    {
      question: "What is a court summons?",
      answer: "A court summons is an official document that: 1) Notifies you of your court hearing date and time 2) Specifies the court location 3) Lists what you need to bring 4) Explains your legal rights and obligations. It's delivered by court officers.",
      keywords: ["summons", "court notice", "hearing notice", "court date", "notification"]
    },
    {
      question: "What happens at the first court hearing?",
      answer: "At first hearing: 1) Judge confirms case details 2) Both parties present their positions 3) Evidence is reviewed 4) Settlement may be discussed 5) Next steps are planned 6) Future hearing dates may be set. Your lawyer will guide you.",
      keywords: ["first hearing", "court appearance", "initial hearing", "what happens", "court day"]
    },
    {
      question: "What is mediation in legal cases?",
      answer: "Mediation is: 1) A voluntary process to resolve disputes 2) Led by a neutral mediator 3) Both parties discuss solutions 4) Faster and less expensive than trial 5) Results in binding agreement if successful 6) Can happen before or during court proceedings.",
      keywords: ["mediation", "settlement", "negotiation", "resolve", "agreement"]
    },
    {
      question: "What does 'judgment' mean in court?",
      answer: "Judgment is the court's final decision that: 1) Determines who wins the case 2) Specifies what relief is granted 3) Orders any payments or actions 4) Becomes legally binding 5) Can be appealed within specified time limits.",
      keywords: ["judgment", "decision", "ruling", "court decision", "verdict"]
    },
    {
      question: "What is the difference between civil and criminal cases?",
      answer: "Civil cases: Disputes between parties seeking money or specific actions. Criminal cases: Violations of laws that can result in fines or imprisonment. Your cases through this system are civil matters.",
      keywords: ["civil", "criminal", "difference", "types", "categories"]
    },
    {
      question: "What happens if I miss a court date?",
      answer: "Missing court dates can: 1) Result in case dismissal 2) Lead to default judgment against you 3) Require additional fees to reopen 4) Delay your case significantly 5) Harm your legal position. Always attend scheduled hearings.",
      keywords: ["miss", "absent", "skip", "don't go", "court date"]
    },
    {
      question: "How do I appeal a court decision?",
      answer: "To appeal: 1) File notice of appeal within 30 days 2) Pay required fees 3) Prepare appeal brief with legal arguments 4) Present case to higher court 5) Wait for appellate decision. Appeals are complex and require legal representation.",
      keywords: ["appeal", "challenge", "disagree", "higher court", "review"]
    },
    {
      question: "What is enforcement of judgment?",
      answer: "Enforcement means: 1) Collecting money awarded by court 2) Forcing compliance with court orders 3) Methods include wage garnishment, property seizure 4) Can take additional time and costs 5) Your lawyer can help with enforcement procedures.",
      keywords: ["enforcement", "collect", "get money", "court order", "compliance"]
    }
  ],

  // Case Details Based on System Cases (10)
  caseDetails: [
    {
      question: "What is a case number and how do I find mine?",
      answer: "Case numbers identify your case uniquely. Format: CL2025-XXXXXX (year + 6 digits). Find yours in: 1) Dashboard case list 2) Case details page 3) Email notifications 4) Court documents. Keep this number for all communications.",
      keywords: ["case number", "reference", "ID", "identifier", "find number"]
    },
    {
      question: "What does 'lawyer requested' status mean?",
      answer: "'Lawyer requested' means: 1) You've requested a lawyer for your case 2) The system is finding suitable lawyers 3) Lawyers are reviewing your case 4) Waiting for a lawyer to accept 5) You'll be notified once assigned.",
      keywords: ["lawyer requested", "waiting", "pending", "assignment", "finding lawyer"]
    },
    {
      question: "What does 'hearing scheduled' mean?",
      answer: "'Hearing scheduled' means: 1) Your case has been filed in court 2) A hearing date has been set 3) You'll receive official summons 4) Prepare using the Pre-Court Checklist 5) Your lawyer will guide you for the hearing.",
      keywords: ["hearing scheduled", "court date", "scheduled", "hearing set", "court hearing"]
    },
    {
      question: "How do I know if my case is filed in court?",
      answer: "Your case is filed when: 1) Status changes to 'Filed' 2) You receive court reference number 3) Your lawyer confirms filing 4) Court documents are available 5) You get notification email with court details.",
      keywords: ["filed", "court filing", "submitted", "filed in court", "court reference"]
    },
    {
      question: "What is a court reference number?",
      answer: "Court reference number: 1) Official court identifier for your case 2) Format: CL2025-XXXXXX 3) Used in all court communications 4) Different from your internal case number 5) Provided by the court after filing.",
      keywords: ["court reference", "court number", "official number", "court ID", "reference"]
    },
    {
      question: "Why was my case rejected?",
      answer: "Cases may be rejected due to: 1) Incomplete documentation 2) Missing required information 3) Case outside legal scope 4) Statute of limitations expired 5) Insufficient evidence. Check rejection reasons and resubmit with corrections.",
      keywords: ["rejected", "denied", "not accepted", "refused", "why rejected"]
    },
    {
      question: "How do I track my case timeline?",
      answer: "Track your timeline by: 1) Dashboard case status updates 2) Case details page timeline 3) Email notifications 4) Chat with your lawyer 5) Document uploads and updates. Timeline shows all major case milestones.",
      keywords: ["timeline", "track", "progress", "milestones", "case history"]
    },
    {
      question: "What documents are stored in my case file?",
      answer: "Your case file contains: 1) Original case submission 2) Supporting evidence 3) Court filing documents 4) Lawyer communications 5) Court orders and notices 6) Hearing transcripts (if available). All documents are securely stored.",
      keywords: ["documents", "file", "stored", "case file", "paperwork"]
    },
    {
      question: "How do I update my case information?",
      answer: "To update case info: 1) Contact your assigned lawyer through chat 2) Upload additional documents 3) Provide new evidence 4) Request case status updates 5) Your lawyer will handle court filings. Keep information current.",
      keywords: ["update", "change", "modify", "add info", "revise"]
    },
    {
      question: "What happens when my case is closed?",
      answer: "When case closes: 1) Final judgment is recorded 2) All documents are archived 3) Case status becomes 'Closed' 4) You receive final summary 5) Case file remains accessible for reference 6) Enforcement procedures may continue if applicable.",
      keywords: ["closed", "finished", "completed", "ended", "final"]
    }
  ]
};

// AI matching function for user questions
const findBestMatch = (userQuestion, userCases = []) => {
  const question = userQuestion.toLowerCase().trim();
  let bestMatch = null;
  let bestScore = 0;
  let matchedCategory = null;

  // Special handling for basic greetings and common words
  const greetingWords = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'];
  const thanksWords = ['thank', 'thanks', 'appreciate'];
  const goodbyeWords = ['bye', 'goodbye', 'see you', 'farewell'];
  
  // Check for exact greeting matches first
  if (greetingWords.some(word => question === word || question.includes(word))) {
    const greetingMatch = knowledgeBase.basicConversation.find(item => 
      item.keywords.some(keyword => greetingWords.includes(keyword))
    );
    if (greetingMatch) {
      return {
        answer: greetingMatch.answer,
        intent: 'basicConversation',
        confidence: 1.0,
        suggestions: generateSuggestions('basicConversation')
      };
    }
  }

  // Check for thanks
  if (thanksWords.some(word => question.includes(word))) {
    const thanksMatch = knowledgeBase.basicConversation.find(item => 
      item.keywords.some(keyword => thanksWords.includes(keyword))
    );
    if (thanksMatch) {
      return {
        answer: thanksMatch.answer,
        intent: 'basicConversation',
        confidence: 1.0,
        suggestions: generateSuggestions('basicConversation')
      };
    }
  }

  // Check for goodbye
  if (goodbyeWords.some(word => question.includes(word))) {
    const goodbyeMatch = knowledgeBase.basicConversation.find(item => 
      item.keywords.some(keyword => goodbyeWords.includes(keyword))
    );
    if (goodbyeMatch) {
      return {
        answer: goodbyeMatch.answer,
        intent: 'basicConversation',
        confidence: 1.0,
        suggestions: generateSuggestions('basicConversation')
      };
    }
  }

  // Search through all categories
  Object.keys(knowledgeBase).forEach(category => {
    knowledgeBase[category].forEach(item => {
      let score = 0;
      
      // Check keyword matches
      item.keywords.forEach(keyword => {
        if (question.includes(keyword.toLowerCase())) {
          score += 2; // Higher weight for keyword matches
        }
      });
      
      // Check partial question matches
      if (question.includes(item.question.toLowerCase().substring(0, 20))) {
        score += 3;
      }
      
      // Check for specific case-related queries
      if (category === 'caseDetails' && userCases.length > 0) {
        const caseNumbers = userCases.map(c => c.caseNumber?.toLowerCase() || '');
        caseNumbers.forEach(caseNum => {
          if (question.includes(caseNum)) {
            score += 4; // Highest weight for specific case queries
          }
        });
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = item;
        matchedCategory = category;
      }
    });
  });

  // If no good match found, provide a general response
  if (bestScore < 2) {
    const isLoggedIn = userCases.length > 0; // If userCases exist, user is logged in
    const loginPrompt = !isLoggedIn ? " For personalized assistance with your specific cases, please log in to your account." : "";
    
    return {
      answer: "I understand you have a question. Could you please be more specific about what you need help with? I can assist with system navigation, case filing, legal processes, and general legal information." + loginPrompt,
      intent: "general_inquiry",
      confidence: 0.5,
      suggestions: [
        "How do I upload documents?",
        "What documents do I need to file a case?",
        "How long does the legal process take?",
        "What does my case status mean?"
      ]
    };
  }

  const isLoggedIn = userCases.length > 0; // If userCases exist, user is logged in
  const loginPrompt = !isLoggedIn ? " For personalized case assistance, please log in to your account." : "";
  
  return {
    answer: bestMatch.answer + loginPrompt,
    intent: matchedCategory,
    confidence: Math.min(bestScore / 5, 1), // Normalize confidence score
    suggestions: generateSuggestions(matchedCategory)
  };
};

// Generate contextual suggestions based on category
const generateSuggestions = (category) => {
  const suggestions = {
    basicConversation: [
      "Hello",
      "Thank you",
      "What can you help me with?",
      "I need help"
    ],
    systemNavigation: [
      "How do I check my case status?",
      "How do I schedule a video call?",
      "How do I update my profile?"
    ],
    caseFiling: [
      "What documents do I need to file a case?",
      "How much does it cost to file a case?",
      "What types of cases can I file?"
    ],
    legalProcess: [
      "What does 'case under review' mean?",
      "How long does the legal process take?",
      "What happens at the first court hearing?"
    ],
    caseDetails: [
      "What is my case number?",
      "How do I track my case timeline?",
      "What documents are in my case file?"
    ]
  };
  
  return suggestions[category] || [];
};

module.exports = {
  knowledgeBase,
  findBestMatch,
  generateSuggestions
};
