const UnverifiedClient = require("../Model/UnverifiedClient");
const UnverifiedLawyer = require("../Model/UnverifiedLawyer");
const VerifiedClient = require("../Model/VerifiedClient");
const VerifiedLawyer = require("../Model/VerifiedLawyer");
const Staff = require("../Model/Staff");
const jwt = require('jsonwebtoken');

const signToken = (id, userType, collection) => {
    return jwt.sign({ 
        id, 
        userType, 
        collection // Track which collection the user belongs to
    }, process.env.JWT_SECRET || 'your-secret-key', {
        expiresIn: process.env.JWT_EXPIRES_IN || '90d'
    });
};

// Register unverified client
const registerUnverifiedClient = async (req, res) => {
    try {
        console.log('Registration request received:', req.body);
        console.log('File uploaded:', req.file ? req.file.filename : 'No file');
        
        const { fullName, nic, email, password, phoneNumber, address } = req.body;

        // Validate required fields
        if (!fullName || !nic || !email || !password || !phoneNumber || !address) {
            return res.status(400).json({ 
                message: "All fields are required" 
            });
        }

        // Check if image was uploaded (temporarily optional for testing)
        if (!req.file) {
            console.log('Warning: No image uploaded, but allowing registration for testing');
        }

        // Check if client already exists in any collection
        const existingUnverifiedClient = await UnverifiedClient.findOne({ 
            $or: [{ email }, { nic }] 
        });
        const existingVerifiedClient = await VerifiedClient.findOne({ 
            $or: [{ email }, { nic }] 
        });

        if (existingUnverifiedClient || existingVerifiedClient) {
            return res.status(400).json({ 
                message: "Client with this email or NIC already exists" 
            });
        }

        console.log('Creating client with data:', {
            fullName,
            nic,
            email,
            phoneNumber,
            address,
            nicImage: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                filePath: req.file.path
            }
        });

        const clientData = {
            fullName,
            nic,
            email,
            password,
            phoneNumber,
            address
        };

        // Add image data if file was uploaded
        if (req.file) {
            clientData.nicImage = {
                filename: req.file.filename,
                originalName: req.file.originalname,
                filePath: req.file.path,
                uploadDate: new Date()
            };
        }

        const newClient = await UnverifiedClient.create(clientData);

        console.log('Client created successfully:', newClient._id);

        // Remove password from output
        newClient.password = undefined;

        res.status(201).json({
            message: "Client registration successful. Your account is pending verification.",
            client: {
                _id: newClient._id,
                fullName: newClient.fullName,
                email: newClient.email,
                verificationStatus: newClient.verificationStatus
            }
        });
    } catch (err) {
        console.error('Client registration error:', err);
        console.error('Error stack:', err.stack);
        res.status(500).json({ 
            message: "Unable to register client", 
            error: err.message,
            details: err.stack
        });
    }
};

// Register unverified lawyer
const registerUnverifiedLawyer = async (req, res) => {
    try {
        const { 
            fullName, 
            nic, 
            email, 
            password, 
            phoneNumber, 
            address, 
            lawyerType, 
            passoutYear 
        } = req.body;

        // Check if image was uploaded (temporarily optional for testing)
        if (!req.file) {
            console.log('Warning: No image uploaded for lawyer, but allowing registration for testing');
        }

        // Check if lawyer already exists in any collection
        const existingUnverifiedLawyer = await UnverifiedLawyer.findOne({ 
            $or: [{ email }, { nic }] 
        });
        const existingVerifiedLawyer = await VerifiedLawyer.findOne({ 
            $or: [{ email }, { nic }] 
        });

        if (existingUnverifiedLawyer || existingVerifiedLawyer) {
            return res.status(400).json({ 
                message: "Lawyer with this email or NIC already exists" 
            });
        }

        // Generate lawyer ID
        const lawyerId = await UnverifiedLawyer.generateLawyerId();

        const lawyerData = {
            lawyerId,
            fullName,
            nic,
            email,
            password,
            phoneNumber,
            address,
            lawyerType,
            passoutYear
        };

        // Add image data if file was uploaded
        if (req.file) {
            lawyerData.lawIdImage = {
                filename: req.file.filename,
                originalName: req.file.originalname,
                filePath: req.file.path,
                uploadDate: new Date()
            };
        }

        const newLawyer = await UnverifiedLawyer.create(lawyerData);

        // Remove password from output
        newLawyer.password = undefined;

        res.status(201).json({
            message: "Lawyer registration successful. Your account is pending verification.",
            lawyer: {
                _id: newLawyer._id,
                lawyerId: newLawyer.lawyerId,
                fullName: newLawyer.fullName,
                email: newLawyer.email,
                lawyerType: newLawyer.lawyerType,
                verificationStatus: newLawyer.verificationStatus
            }
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ 
            message: "Unable to register lawyer", 
            error: err.message 
        });
    }
};

// Universal login function
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                message: "Please provide email and password" 
            });
        }

        let user = null;
        let userType = null;
        let collection = null;

        // Check Staff first (Admin/Verifier)
        user = await Staff.findOne({ email }).select('+password');
        if (user && await user.correctPassword(password, user.password)) {
            userType = user.role; // 'admin' or 'verifier'
            collection = 'staff';
            
            // Update last login
            user.lastLogin = new Date();
            await user.save();
        }

        // Check Verified Lawyer
        if (!user) {
            user = await VerifiedLawyer.findOne({ email }).select('+password');
            if (user && await user.correctPassword(password, user.password)) {
                userType = 'verified_lawyer';
                collection = 'verified_lawyers';
            }
        }

        // Check Verified Client
        if (!user) {
            user = await VerifiedClient.findOne({ email }).select('+password');
            if (user && await user.correctPassword(password, user.password)) {
                userType = 'verified_client';
                collection = 'verified_clients';
            }
        }

        if (!user) {
            return res.status(401).json({ 
                message: "Invalid email or password, or account not verified" 
            });
        }

        // Remove password from output
        user.password = undefined;

        // Create token
        const token = signToken(user._id, userType, collection);

        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                _id: user._id,
                name: user.fullName,
                fullName: user.fullName,
                email: user.email,
                userType: userType,
                collection: collection,
                ...(user.lawyerId && { lawyerId: user.lawyerId }),
                ...(user.lawyerType && { lawyerType: user.lawyerType }),
                ...(user.ratings && { ratings: user.ratings }),
                ...(user.totalReviews && { totalReviews: user.totalReviews }),
                ...(user.casesHandled && { casesHandled: user.casesHandled }),
                ...(user.staffId && { staffId: user.staffId }),
                ...(user.role && { role: user.role }),
                ...(user.permissions && { permissions: user.permissions })
            }
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ 
            message: "Unable to login", 
            error: err.message 
        });
    }
};

// Enhanced protect middleware
const protect = async (req, res, next) => {
    try {
        console.log('🔍 PROTECT MIDDLEWARE - Checking authentication...');
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        console.log('🔑 Token exists:', !!token);
        console.log('🔑 Token preview:', token ? token.substring(0, 20) + '...' : 'No token');

        if (!token) {
            console.log('❌ No token provided');
            return res.status(401).json({ 
                message: "You are not logged in! Please log in to get access." 
            });
        }

        // Verify token
        console.log('🔍 Verifying token...');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        console.log('✅ Token decoded:', { id: decoded.id, userType: decoded.userType, collection: decoded.collection });

        let currentUser = null;

        // Find user based on collection
        switch (decoded.collection) {
            case 'staff':
                currentUser = await Staff.findById(decoded.id);
                break;
            case 'verified_lawyers':
                currentUser = await VerifiedLawyer.findById(decoded.id);
                break;
            case 'verified_clients':
                currentUser = await VerifiedClient.findById(decoded.id);
                break;
            default:
                return res.status(401).json({ 
                    message: "Invalid token format" 
                });
        }

        if (!currentUser || !currentUser.isActive) {
            return res.status(401).json({ 
                message: "The user belonging to this token does not exist or is inactive." 
            });
        }

        // Add user info to request
        req.user = currentUser;
        req.user.userType = decoded.userType;  // Add userType to user object
        req.userType = decoded.userType;
        req.collection = decoded.collection;
        next();
    } catch (err) {
        console.log(err);
        res.status(401).json({ 
            message: "Invalid token", 
            error: err.message 
        });
    }
};

// Middleware to restrict access to specific roles
const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.userType)) {
            return res.status(403).json({
                message: "You do not have permission to perform this action"
            });
        }
        next();
    };
};

// Get current user
const getMe = async (req, res) => {
    try {
        res.status(200).json({
            status: 'success',
            user: {
                _id: req.user._id,
                name: req.user.fullName,
                fullName: req.user.fullName,
                email: req.user.email,
                userType: req.userType,
                collection: req.collection,
                ...(req.user.lawyerId && { lawyerId: req.user.lawyerId }),
                ...(req.user.lawyerType && { lawyerType: req.user.lawyerType }),
                ...(req.user.ratings && { ratings: req.user.ratings }),
                ...(req.user.totalReviews && { totalReviews: req.user.totalReviews }),
                ...(req.user.casesHandled && { casesHandled: req.user.casesHandled }),
                ...(req.user.staffId && { staffId: req.user.staffId }),
                ...(req.user.role && { role: req.user.role }),
                ...(req.user.permissions && { permissions: req.user.permissions })
            }
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ 
            message: "Unable to get user data", 
            error: err.message 
        });
    }
};

// Middleware to check if user is an analytics manager
const checkAnalyticsManagerAccess = (req, res, next) => {
  if (req.user.userType !== 'analytics_notification_manager') {
    return res.status(403).json({ 
      message: "Access denied. This endpoint is for analytics managers only.",
      userType: req.user.userType
    });
  }
  
  next();
};

// Middleware to check if user is a client or lawyer (for feedback)
const checkUserAccess = (req, res, next) => {
  const allowedTypes = ['verified_client', 'verified_lawyer'];
  
  if (!allowedTypes.includes(req.user.userType)) {
    return res.status(403).json({ 
      message: "Access denied. This endpoint is for verified clients and lawyers only.",
      userType: req.user.userType
    });
  }
  
  next();
};

module.exports = {
    registerUnverifiedClient,
    registerUnverifiedLawyer,
    login,
    protect,
    restrictTo,
    getMe,
    checkAnalyticsManagerAccess,
    checkUserAccess
};
