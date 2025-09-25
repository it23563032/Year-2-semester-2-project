const jwt = require('jsonwebtoken');
const VerifiedClient = require('../Model/VerifiedClient');
const VerifiedLawyer = require('../Model/VerifiedLawyer');
const Staff = require('../Model/Staff');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Find user by ID from token in the appropriate collection
    let user = null;
    
    // Check VerifiedClient first
    user = await VerifiedClient.findById(decoded.id);
    if (user) {
      req.user = user;
      req.user.userType = 'verified_client';
      return next();
    }
    
    // Check VerifiedLawyer
    user = await VerifiedLawyer.findById(decoded.id);
    if (user) {
      req.user = user;
      req.user.userType = 'verified_lawyer';
      return next();
    }
    
    // Check Staff (court_scheduler, admin, etc.)
    user = await Staff.findById(decoded.id);
    if (user) {
      req.user = user;
      req.user.userType = user.role; // role is the userType for staff
      return next();
    }
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid - user not found'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      message: 'Token is not valid'
    });
  }
};

module.exports = auth;
