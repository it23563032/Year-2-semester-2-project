const VerifiedClient = require('../Model/VerifiedClient');
const VerifiedLawyer = require('../Model/VerifiedLawyer');
const Staff = require('../Model/Staff');
const User = require('../Model/User_model'); // Legacy model
const bcrypt = require('bcryptjs');

// Get current user's profile based on their user type
const getCurrentUserProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const userType = req.user.userType;
        const collection = req.collection;

        console.log(`Fetching profile for user: ${userId}, type: ${userType}, collection: ${collection}`);

        let user = null;

        // Fetch user from appropriate collection
        switch (userType) {
            case 'verified_client':
            case 'client':
                user = await VerifiedClient.findById(userId);
                if (!user && userType === 'client') {
                    // Fallback to User model for legacy clients
                    user = await User.findById(userId);
                }
                break;

            case 'verified_lawyer':
            case 'lawyer':
                user = await VerifiedLawyer.findById(userId);
                if (!user && userType === 'lawyer') {
                    // Fallback to User model for legacy lawyers
                    user = await User.findById(userId);
                }
                break;

            case 'admin':
            case 'court_scheduler':
            case 'finance_manager':
            case 'analytics_notification_manager':
                user = await Staff.findById(userId);
                break;

            default:
                // Try User model as fallback
                user = await User.findById(userId);
                break;
        }

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User profile not found'
            });
        }

        // Remove sensitive fields
        const userObj = user.toObject();
        delete userObj.password;
        delete userObj.__v;

        res.status(200).json({
            status: 'success',
            user: userObj
        });

    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch user profile',
            error: error.message
        });
    }
};

// Update current user's profile
const updateUserProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const userType = req.user.userType;
        const updateData = req.body;

        console.log(`Updating profile for user: ${userId}, type: ${userType}`);
        console.log('Update data:', updateData);

        // Remove fields that shouldn't be updated
        const restrictedFields = [
            '_id', 'password', '__v', 'createdAt', 'updatedAt',
            'nic', 'lawyerId', 'clientId', 'staffId', 'role'
        ];
        
        restrictedFields.forEach(field => delete updateData[field]);

        let user = null;
        let Model = null;

        // Determine the correct model and fetch user
        switch (userType) {
            case 'verified_client':
            case 'client':
                Model = VerifiedClient;
                user = await VerifiedClient.findById(userId);
                if (!user && userType === 'client') {
                    Model = User;
                    user = await User.findById(userId);
                }
                break;

            case 'verified_lawyer':
            case 'lawyer':
                Model = VerifiedLawyer;
                user = await VerifiedLawyer.findById(userId);
                if (!user && userType === 'lawyer') {
                    Model = User;
                    user = await User.findById(userId);
                }
                break;

            case 'admin':
            case 'court_scheduler':
            case 'finance_manager':
            case 'analytics_notification_manager':
                Model = Staff;
                user = await Staff.findById(userId);
                break;

            default:
                Model = User;
                user = await User.findById(userId);
                break;
        }

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        // Update user with new data
        Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined && updateData[key] !== null) {
                user[key] = updateData[key];
            }
        });

        // Set updated timestamp
        user.updatedAt = new Date();

        // Save the updated user
        await user.save();

        // Remove sensitive fields from response
        const userObj = user.toObject();
        delete userObj.password;
        delete userObj.__v;

        // Update localStorage data format for frontend
        const updatedUserData = {
            id: user._id,
            _id: user._id,
            userId: user._id,
            name: user.fullName || user.name,
            fullName: user.fullName || user.name,
            email: user.email,
            userType: userType,
            ...userObj
        };

        res.status(200).json({
            status: 'success',
            message: 'Profile updated successfully',
            user: updatedUserData
        });

    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update user profile',
            error: error.message
        });
    }
};

// Change user password
const changePassword = async (req, res) => {
    try {
        const userId = req.user._id;
        const userType = req.user.userType;
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                status: 'error',
                message: 'All password fields are required'
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                status: 'error',
                message: 'New password and confirmation do not match'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                status: 'error',
                message: 'New password must be at least 6 characters long'
            });
        }

        let user = null;

        // Fetch user with password from appropriate collection
        switch (userType) {
            case 'verified_client':
            case 'client':
                user = await VerifiedClient.findById(userId).select('+password');
                if (!user && userType === 'client') {
                    user = await User.findById(userId).select('+password');
                }
                break;

            case 'verified_lawyer':
            case 'lawyer':
                user = await VerifiedLawyer.findById(userId).select('+password');
                if (!user && userType === 'lawyer') {
                    user = await User.findById(userId).select('+password');
                }
                break;

            case 'admin':
            case 'court_scheduler':
            case 'finance_manager':
            case 'analytics_notification_manager':
                user = await Staff.findById(userId).select('+password');
                break;

            default:
                user = await User.findById(userId).select('+password');
                break;
        }

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                status: 'error',
                message: 'Current password is incorrect'
            });
        }

        // Hash new password and save
        user.password = newPassword; // Let the pre-save hook handle hashing
        user.updatedAt = new Date();
        await user.save();

        res.status(200).json({
            status: 'success',
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to change password',
            error: error.message
        });
    }
};

module.exports = {
    getCurrentUserProfile,
    updateUserProfile,
    changePassword
};
