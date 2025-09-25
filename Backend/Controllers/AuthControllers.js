const User = require("../Model/UserModel");
const jwt = require('jsonwebtoken');
const mongoose = require("mongoose");

const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'your-secret-key', {
        expiresIn: process.env.JWT_EXPIRES_IN || '90d'
    });
};

// Register new user
const register = async (req, res, next) => {
    try {
        const { 
            name, 
            email, 
            password, 
            nic, 
            phone, 
            address, 
            userType,
            specialization,
            yearsExperience,
            barNumber
        } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ email }, { nic }] 
        });
        
        if (existingUser) {
            return res.status(400).json({ 
                message: "User with this email or NIC already exists" 
            });
        }

        // For lawyers, check if bar number already exists
        if (userType === 'lawyer' && barNumber) {
            const existingLawyer = await User.findOne({ barNumber });
            if (existingLawyer) {
                return res.status(400).json({ 
                    message: "Lawyer with this bar number already exists" 
                });
            }
        }

        const userData = {
            name,
            email,
            password,
            nic,
            phone,
            address,
            userType: userType || 'client'
        };

        // Add lawyer-specific fields
        if (userType === 'lawyer') {
            userData.specialization = specialization;
            userData.yearsExperience = yearsExperience;
            userData.barNumber = barNumber;
            userData.availability = true;
            userData.rating = 0;
            userData.casesHandled = 0;
        }

        const newUser = await User.create(userData);

        // Remove password from output
        newUser.password = undefined;

        // Create token
        const token = signToken(newUser._id);

        res.status(201).json({
            message: "User registered successfully",
            token,
            user: {
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                userType: newUser.userType,
                specialization: newUser.specialization,
                yearsExperience: newUser.yearsExperience,
                barNumber: newUser.barNumber
            }
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Unable to register user", error: err.message });
    }
};

// Login user
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // 1) Check if email and password exist
        if (!email || !password) {
            return res.status(400).json({ 
                message: "Please provide email and password" 
            });
        }

        // 2) Check if user exists && password is correct
        const user = await User.findOne({ email }).select('+password');
        
        if (!user || !(await user.correctPassword(password, user.password))) {
            return res.status(401).json({ 
                message: "Incorrect email or password" 
            });
        }

        // 3) Remove password from output
        user.password = undefined;

        // 4) If everything ok, send token to client
        const token = signToken(user._id);

        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                userType: user.userType,
                specialization: user.specialization,
                yearsExperience: user.yearsExperience,
                barNumber: user.barNumber
            }
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Unable to login", error: err.message });
    }
};

// Protect middleware - to be used in routes that require authentication
const protect = async (req, res, next) => {
    try {
        // 1) Getting token and check if it's there
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ 
                message: "You are not logged in! Please log in to get access." 
            });
        }

        // 2) Verification token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

        // 3) Check if user still exists
        const currentUser = await User.findById(decoded.id);
        if (!currentUser) {
            return res.status(401).json({ 
                message: "The user belonging to this token does no longer exist." 
            });
        }

        // 4) Grant access to protected route
        req.user = currentUser;
        next();
    } catch (err) {
        console.log(err);
        res.status(401).json({ message: "Invalid token", error: err.message });
    }
};

// Get current user
const getMe = async (req, res, next) => {
    try {
        // Don't populate cases to avoid circular references
        const user = await User.findById(req.user.id);
        res.status(200).json({
            status: 'success',
            user
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Unable to get user data", error: err.message });
    }
};

exports.register = register;
exports.login = login;
exports.protect = protect;
exports.getMe = getMe;