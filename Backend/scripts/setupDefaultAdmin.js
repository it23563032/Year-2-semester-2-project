require('dotenv').config();
const mongoose = require("mongoose");
const Staff = require("../Model/Staff");

const setupDefaultAdmin = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://triveni:M9fLy2oWyu8ewljr@cluster0.it4e3sl.mongodb.net/legal-management-system?retryWrites=true&w=majority", {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });

        console.log("Connected to MongoDB");

        // Check if admin already exists
        const existingAdmin = await Staff.findOne({ role: 'admin' });
        if (existingAdmin) {
            console.log("Default admin already exists:", existingAdmin.email);
            process.exit(0);
        }

        // Create default admin
        const adminData = {
            staffId: "STAFF0001",
            fullName: "System Administrator",
            email: "admin@legalaid.com",
            password: "Admin123!",
            phoneNumber: "+94777777777",
            role: "admin",
            department: "System Administration",
            permissions: {
                canVerifyLawyers: true,
                canVerifyClients: true,
                canManageStaff: true,
                canViewReports: true,
                canManageSystem: true
            }
        };

        const admin = await Staff.create(adminData);
        console.log("Default admin created successfully!");
        console.log("Email:", admin.email);
        console.log("Password: Admin123!");
        console.log("Staff ID:", admin.staffId);
        console.log("\nIMPORTANT: Please change the default password after first login!");

    } catch (err) {
        console.error("Error setting up default admin:", err);
    } finally {
        mongoose.connection.close();
        process.exit(0);
    }
};

// Run the setup
setupDefaultAdmin();
