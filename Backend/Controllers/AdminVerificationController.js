const UnverifiedClient = require("../Model/UnverifiedClient");
const UnverifiedLawyer = require("../Model/UnverifiedLawyer");
const VerifiedClient = require("../Model/VerifiedClient");
const VerifiedLawyer = require("../Model/VerifiedLawyer");
const Staff = require("../Model/Staff");

// Get all unverified lawyers
const getUnverifiedLawyers = async (req, res) => {
    try {
        const unverifiedLawyers = await UnverifiedLawyer.find({ 
            verificationStatus: 'pending',
            isActive: true 
        }).sort({ submissionDate: -1 });

        res.status(200).json({
            status: 'success',
            results: unverifiedLawyers.length,
            data: unverifiedLawyers
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ 
            message: "Unable to fetch unverified lawyers", 
            error: err.message 
        });
    }
};

// Get all unverified clients
const getUnverifiedClients = async (req, res) => {
    try {
        const unverifiedClients = await UnverifiedClient.find({ 
            verificationStatus: 'pending',
            isActive: true 
        }).sort({ submissionDate: -1 });

        res.status(200).json({
            status: 'success',
            results: unverifiedClients.length,
            data: unverifiedClients
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ 
            message: "Unable to fetch unverified clients", 
            error: err.message 
        });
    }
};

// Get all verified lawyers
const getVerifiedLawyers = async (req, res) => {
    try {
        const verifiedLawyers = await VerifiedLawyer.find({ isActive: true })
            .populate('verifiedBy', 'fullName staffId')
            .sort({ verificationDate: -1 });

        res.status(200).json({
            status: 'success',
            results: verifiedLawyers.length,
            data: verifiedLawyers
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ 
            message: "Unable to fetch verified lawyers", 
            error: err.message 
        });
    }
};

// Get all verified clients
const getVerifiedClients = async (req, res) => {
    try {
        const verifiedClients = await VerifiedClient.find({ isActive: true })
            .populate('verifiedBy', 'fullName staffId')
            .sort({ verificationDate: -1 });

        res.status(200).json({
            status: 'success',
            results: verifiedClients.length,
            data: verifiedClients
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ 
            message: "Unable to fetch verified clients", 
            error: err.message 
        });
    }
};

// Approve lawyer verification
const approveLawyer = async (req, res) => {
    try {
        console.log('Approving lawyer with ID:', req.params.lawyerId);
        console.log('Staff ID:', req.user._id);
        
        const { lawyerId } = req.params;
        const staffId = req.user._id;

        // Find unverified lawyer
        const unverifiedLawyer = await UnverifiedLawyer.findById(lawyerId);
        if (!unverifiedLawyer) {
            console.log('Lawyer not found with ID:', lawyerId);
            return res.status(404).json({ 
                message: "Unverified lawyer not found" 
            });
        }

        console.log('Found unverified lawyer:', unverifiedLawyer.fullName);

        // Get the password with select to include it
        const unverifiedLawyerWithPassword = await UnverifiedLawyer.findById(lawyerId).select('+password');

        // Create verified lawyer with all data including password
        console.log('Creating verified lawyer...');
        const verifiedLawyer = await VerifiedLawyer.create({
            lawyerId: unverifiedLawyer.lawyerId,
            lawyerType: unverifiedLawyer.lawyerType,
            fullName: unverifiedLawyer.fullName,
            nic: unverifiedLawyer.nic,
            email: unverifiedLawyer.email,
            password: unverifiedLawyerWithPassword.password,
            phoneNumber: unverifiedLawyer.phoneNumber,
            address: unverifiedLawyer.address,
            passoutYear: unverifiedLawyer.passoutYear,
            lawIdImage: unverifiedLawyer.lawIdImage,
            ratings: unverifiedLawyer.ratings,
            verifiedBy: staffId,
            verificationDate: new Date()
        });

        console.log('Verified lawyer created:', verifiedLawyer._id);

        // Remove from unverified collection
        console.log('Removing from unverified collection...');
        await UnverifiedLawyer.findByIdAndDelete(lawyerId);
        console.log('Lawyer verification process completed successfully');

        res.status(200).json({
            message: "Lawyer verified successfully",
            data: verifiedLawyer
        });
    } catch (err) {
        console.error('Lawyer verification error:', err);
        console.error('Error stack:', err.stack);
        res.status(500).json({ 
            message: "Unable to verify lawyer", 
            error: err.message,
            details: err.stack
        });
    }
};

// Approve client verification
const approveClient = async (req, res) => {
    try {
        console.log('Approving client with ID:', req.params.clientId);
        console.log('Staff ID:', req.user._id);
        
        const { clientId } = req.params;
        const staffId = req.user._id;

        // Find unverified client
        const unverifiedClient = await UnverifiedClient.findById(clientId);
        if (!unverifiedClient) {
            console.log('Client not found with ID:', clientId);
            return res.status(404).json({ 
                message: "Unverified client not found" 
            });
        }

        console.log('Found unverified client:', unverifiedClient.fullName);

        // Get the password with select to include it
        const unverifiedClientWithPassword = await UnverifiedClient.findById(clientId).select('+password');
        
        // Create verified client with all data including password
        console.log('Creating verified client...');
        const verifiedClient = await VerifiedClient.create({
            fullName: unverifiedClient.fullName,
            nic: unverifiedClient.nic,
            email: unverifiedClient.email,
            password: unverifiedClientWithPassword.password,
            phoneNumber: unverifiedClient.phoneNumber,
            address: unverifiedClient.address,
            nicImage: unverifiedClient.nicImage,
            verifiedBy: staffId,
            verificationDate: new Date()
        });

        console.log('Verified client created:', verifiedClient._id);

        // Remove from unverified collection
        console.log('Removing from unverified collection...');
        await UnverifiedClient.findByIdAndDelete(clientId);
        console.log('Client verification process completed successfully');

        res.status(200).json({
            message: "Client verified successfully",
            data: verifiedClient
        });
    } catch (err) {
        console.error('Client verification error:', err);
        console.error('Error stack:', err.stack);
        res.status(500).json({ 
            message: "Unable to verify client", 
            error: err.message,
            details: err.stack
        });
    }
};

// Reject lawyer verification
const rejectLawyer = async (req, res) => {
    try {
        const { lawyerId } = req.params;
        const { reason } = req.body;
        const staffId = req.user._id;

        const updatedLawyer = await UnverifiedLawyer.findByIdAndUpdate(
            lawyerId,
            {
                verificationStatus: 'rejected',
                rejectionReason: reason,
                reviewedBy: staffId,
                reviewDate: new Date()
            },
            { new: true }
        );

        if (!updatedLawyer) {
            return res.status(404).json({ 
                message: "Unverified lawyer not found" 
            });
        }

        res.status(200).json({
            message: "Lawyer verification rejected",
            data: updatedLawyer
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ 
            message: "Unable to reject lawyer", 
            error: err.message 
        });
    }
};

// Reject client verification
const rejectClient = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { reason } = req.body;
        const staffId = req.user._id;

        const updatedClient = await UnverifiedClient.findByIdAndUpdate(
            clientId,
            {
                verificationStatus: 'rejected',
                rejectionReason: reason,
                reviewedBy: staffId,
                reviewDate: new Date()
            },
            { new: true }
        );

        if (!updatedClient) {
            return res.status(404).json({ 
                message: "Unverified client not found" 
            });
        }

        res.status(200).json({
            message: "Client verification rejected",
            data: updatedClient
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ 
            message: "Unable to reject client", 
            error: err.message 
        });
    }
};

// Get verification statistics
const getVerificationStats = async (req, res) => {
    try {
        const stats = await Promise.all([
            UnverifiedLawyer.countDocuments({ verificationStatus: 'pending' }),
            UnverifiedClient.countDocuments({ verificationStatus: 'pending' }),
            VerifiedLawyer.countDocuments({ isActive: true }),
            VerifiedClient.countDocuments({ isActive: true }),
            UnverifiedLawyer.countDocuments({ verificationStatus: 'rejected' }),
            UnverifiedClient.countDocuments({ verificationStatus: 'rejected' })
        ]);

        res.status(200).json({
            status: 'success',
            data: {
                pendingLawyers: stats[0],
                pendingClients: stats[1],
                verifiedLawyers: stats[2],
                verifiedClients: stats[3],
                rejectedLawyers: stats[4],
                rejectedClients: stats[5]
            }
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ 
            message: "Unable to fetch verification stats", 
            error: err.message 
        });
    }
};

// Get comprehensive dashboard statistics
const getDashboardStats = async (req, res) => {
    try {
        const Case = require("../Model/CaseModel");
        const User = require("../Model/UserModel");
        const Document = require("../Model/DocumentModel");
        
        // Get date ranges for time-based stats
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const stats = await Promise.all([
            // User verification stats
            UnverifiedLawyer.countDocuments({ verificationStatus: 'pending' }),
            UnverifiedClient.countDocuments({ verificationStatus: 'pending' }),
            VerifiedLawyer.countDocuments({ isActive: true }),
            VerifiedClient.countDocuments({ isActive: true }),
            UnverifiedLawyer.countDocuments({ verificationStatus: 'rejected' }),
            UnverifiedClient.countDocuments({ verificationStatus: 'rejected' }),
            
            // Staff stats
            Staff.countDocuments({ isActive: true }),
            Staff.countDocuments({ role: 'admin' }),
            Staff.countDocuments({ role: 'verifier' }),
            
            // Case stats
            Case.countDocuments(),
            Case.countDocuments({ status: 'pending' }),
            Case.countDocuments({ status: 'verified' }),
            Case.countDocuments({ status: 'lawyer_assigned' }),
            Case.countDocuments({ status: 'filed' }),
            Case.countDocuments({ createdAt: { $gte: thisWeek } }),
            Case.countDocuments({ createdAt: { $gte: thisMonth } }),
            
            // Document stats
            Document.countDocuments(),
            Document.countDocuments({ createdAt: { $gte: thisWeek } }),
            Document.countDocuments({ createdAt: { $gte: thisMonth } }),
            
            // Total users
            User.countDocuments(),
            User.countDocuments({ userType: 'lawyer' }),
            User.countDocuments({ userType: 'client' })
        ]);

        res.status(200).json({
            status: 'success',
            data: {
                // User verification stats
                pendingLawyers: stats[0],
                pendingClients: stats[1],
                verifiedLawyers: stats[2],
                verifiedClients: stats[3],
                rejectedLawyers: stats[4],
                rejectedClients: stats[5],
                totalPending: stats[0] + stats[1],
                totalVerified: stats[2] + stats[3],
                totalRejected: stats[4] + stats[5],
                
                // Staff stats
                totalStaff: stats[6],
                adminStaff: stats[7],
                verifierStaff: stats[8],
                
                // Case stats
                totalCases: stats[9],
                pendingCases: stats[10],
                verifiedCases: stats[11],
                assignedCases: stats[12],
                filedCases: stats[13],
                casesThisWeek: stats[14],
                casesThisMonth: stats[15],
                
                // Document stats
                totalDocuments: stats[16],
                documentsThisWeek: stats[17],
                documentsThisMonth: stats[18],
                
                // User stats
                totalUsers: stats[19],
                totalLawyers: stats[20],
                totalClients: stats[21]
            }
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ 
            message: "Unable to fetch dashboard stats", 
            error: err.message 
        });
    }
};

// Reset user password (admin only)
const resetUserPassword = async (req, res) => {
    try {
        const { userId, userType } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ 
                message: "New password must be at least 6 characters long" 
            });
        }

        let user = null;
        let Model = null;

        // Determine which model to use
        switch (userType) {
            case 'verified-client':
                Model = VerifiedClient;
                break;
            case 'verified-lawyer':
                Model = VerifiedLawyer;
                break;
            case 'unverified-client':
                Model = require("../Model/UnverifiedClient");
                break;
            case 'unverified-lawyer':
                Model = require("../Model/UnverifiedLawyer");
                break;
            default:
                return res.status(400).json({ 
                    message: "Invalid user type" 
                });
        }

        // Find and update user
        user = await Model.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                message: "User not found" 
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        console.log(`Password reset for ${userType} user: ${user.fullName || user.name}`);

        res.status(200).json({
            message: "Password reset successfully",
            user: {
                _id: user._id,
                name: user.fullName || user.name,
                email: user.email
            }
        });
    } catch (err) {
        console.error('Password reset error:', err);
        res.status(500).json({ 
            message: "Unable to reset password", 
            error: err.message 
        });
    }
};

// Get user details (without password)
const getUserDetails = async (req, res) => {
    try {
        const { userId, userType } = req.params;

        let user = null;
        let Model = null;

        // Determine which model to use
        switch (userType) {
            case 'verified-client':
                Model = VerifiedClient;
                break;
            case 'verified-lawyer':
                Model = VerifiedLawyer;
                break;
            case 'unverified-client':
                Model = require("../Model/UnverifiedClient");
                break;
            case 'unverified-lawyer':
                Model = require("../Model/UnverifiedLawyer");
                break;
            default:
                return res.status(400).json({ 
                    message: "Invalid user type" 
                });
        }

        // Find user (without password)
        user = await Model.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                message: "User not found" 
            });
        }

        res.status(200).json({
            status: 'success',
            data: user
        });
    } catch (err) {
        console.error('Get user details error:', err);
        res.status(500).json({ 
            message: "Unable to fetch user details", 
            error: err.message 
        });
    }
};

module.exports = {
    getUnverifiedLawyers,
    getUnverifiedClients,
    getVerifiedLawyers,
    getVerifiedClients,
    approveLawyer,
    approveClient,
    rejectLawyer,
    rejectClient,
    getVerificationStats,
    getDashboardStats,
    resetUserPassword,
    getUserDetails
};
