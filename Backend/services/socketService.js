const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const VerifiedClient = require('../Model/VerifiedClient');
const VerifiedLawyer = require('../Model/VerifiedLawyer');
const Case = require('../Model/CaseModel');

class SocketService {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.connectedUsers = new Map(); // userId -> socket info
    
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication failed: No token provided'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find user in appropriate collection
        let user = await VerifiedClient.findById(decoded.id);
        if (user) {
          socket.userId = user._id.toString();
          socket.userType = 'verified_client';
          socket.userName = user.name;
        } else {
          user = await VerifiedLawyer.findById(decoded.id);
          if (user) {
            socket.userId = user._id.toString();
            socket.userType = 'verified_lawyer';
            socket.userName = user.name;
          } else {
            return next(new Error('Authentication failed: User not found'));
          }
        }
        
        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.userName} (${socket.userType}) - ${socket.id}`);
      
      // Store user connection
      this.connectedUsers.set(socket.userId, {
        socketId: socket.id,
        userType: socket.userType,
        userName: socket.userName,
        joinedAt: new Date()
      });

      // Chat and other real-time features can be added here

      // Handle disconnection
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }


  handleDisconnect(socket) {
    console.log(`User disconnected: ${socket.userName} - ${socket.id}`);
    
    // Remove user from connected users
    this.connectedUsers.delete(socket.userId);
  }

  // Utility method to get connected users (for debugging)
  getConnectedUsers() {
    return Array.from(this.connectedUsers.entries()).map(([userId, info]) => ({
      userId,
      ...info
    }));
  }

  // Utility method to get active calls (for debugging)
  getActiveCalls() {
    return Array.from(this.activeCalls.entries()).map(([callId, info]) => ({
      callId,
      ...info
    }));
  }
}

module.exports = SocketService;