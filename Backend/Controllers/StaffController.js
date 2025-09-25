const Staff = require("../Model/Staff");
const bcrypt = require("bcryptjs");
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

// Get all staff members
const getAllStaff = async (req, res) => {
    try {
        const staff = await Staff.find({ isActive: true })
            .populate('createdBy', 'fullName staffId')
            .sort({ createdAt: -1 });

        res.status(200).json({
            status: 'success',
            results: staff.length,
            data: staff
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ 
            message: "Unable to fetch staff", 
            error: err.message 
        });
    }
};

// Get staff member by ID
const getStaffById = async (req, res) => {
    try {
        const { staffId } = req.params;
        
        const staff = await Staff.findById(staffId)
            .populate('createdBy', 'fullName staffId');

        if (!staff) {
            return res.status(404).json({ 
                message: "Staff member not found" 
            });
        }

        res.status(200).json({
            status: 'success',
            staff: staff
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ 
            message: "Unable to fetch staff details", 
            error: err.message 
        });
    }
};

// Create new staff member
const createStaff = async (req, res) => {
    try {
        console.log('Creating staff with request body:', req.body);
        
        const { 
            fullName, 
            email, 
            password, 
            phoneNumber, 
            nic,
            address,
            role
        } = req.body;

        // Validate required fields
        if (!fullName || !email || !password || !phoneNumber || !nic || !address || !role) {
            return res.status(400).json({ 
                message: "All fields are required: fullName, email, password, phoneNumber, nic, address, role" 
            });
        }

        // Check if staff already exists
        const existingStaff = await Staff.findOne({ 
            $or: [{ email }, { nic }]
        });
        if (existingStaff) {
            return res.status(400).json({ 
                message: existingStaff.email === email ? 
                    "Staff member with this email already exists" : 
                    "Staff member with this NIC already exists"
            });
        }

        // Generate staff ID
        const staffId = await Staff.generateStaffId();

        console.log('Creating staff with data:', {
            staffId,
            fullName,
            email,
            phoneNumber,
            nic,
            address,
            role
        });

        const newStaff = await Staff.create({
            staffId,
            fullName,
            email,
            password,
            phoneNumber,
            nic,
            address,
            role,
            createdBy: req.user._id
        });

        // Remove password from output
        newStaff.password = undefined;

        res.status(201).json({
            message: "Staff member created successfully",
            staff: newStaff,
            data: newStaff
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ 
            message: "Unable to create staff member", 
            error: err.message 
        });
    }
};

// Update staff member
const updateStaff = async (req, res) => {
    try {
        const { staffId } = req.params;
        const updates = req.body;

        // Don't allow password updates through this route
        delete updates.password;
        delete updates.staffId; // Don't allow staff ID changes

        const updatedStaff = await Staff.findByIdAndUpdate(
            staffId,
            { ...updates, updatedAt: new Date() },
            { new: true, runValidators: true }
        ).populate('createdBy', 'fullName staffId');

        if (!updatedStaff) {
            return res.status(404).json({ 
                message: "Staff member not found" 
            });
        }

        res.status(200).json({
            message: "Staff member updated successfully",
            data: updatedStaff
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ 
            message: "Unable to update staff member", 
            error: err.message 
        });
    }
};

// Deactivate staff member
const deactivateStaff = async (req, res) => {
    try {
        const { staffId } = req.params;

        // Don't allow self-deactivation
        if (staffId === req.user._id.toString()) {
            return res.status(400).json({ 
                message: "You cannot deactivate your own account" 
            });
        }

        const updatedStaff = await Staff.findByIdAndUpdate(
            staffId,
            { isActive: false, updatedAt: new Date() },
            { new: true }
        );

        if (!updatedStaff) {
            return res.status(404).json({ 
                message: "Staff member not found" 
            });
        }

        res.status(200).json({
            message: "Staff member deactivated successfully",
            data: updatedStaff
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ 
            message: "Unable to deactivate staff member", 
            error: err.message 
        });
    }
};

// Reactivate staff member
const reactivateStaff = async (req, res) => {
    try {
        const { staffId } = req.params;

        const updatedStaff = await Staff.findByIdAndUpdate(
            staffId,
            { isActive: true, updatedAt: new Date() },
            { new: true }
        );

        if (!updatedStaff) {
            return res.status(404).json({ 
                message: "Staff member not found" 
            });
        }

        res.status(200).json({
            message: "Staff member reactivated successfully",
            data: updatedStaff
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ 
            message: "Unable to reactivate staff member", 
            error: err.message 
        });
    }
};

// Change staff password
const changeStaffPassword = async (req, res) => {
    try {
        const { staffId } = req.params;
        const { currentPassword, newPassword } = req.body;

        // Only allow users to change their own password or admin to change any password
        if (staffId !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ 
                message: "You can only change your own password" 
            });
        }

        const staff = await Staff.findById(staffId).select('+password');
        if (!staff) {
            return res.status(404).json({ 
                message: "Staff member not found" 
            });
        }

        // If not admin changing someone else's password, verify current password
        if (staffId === req.user._id.toString()) {
            const isCurrentPasswordValid = await staff.correctPassword(currentPassword, staff.password);
            if (!isCurrentPasswordValid) {
                return res.status(400).json({ 
                    message: "Current password is incorrect" 
                });
            }
        }

        // Update password
        staff.password = newPassword;
        await staff.save();

        res.status(200).json({
            message: "Password changed successfully"
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ 
            message: "Unable to change password", 
            error: err.message 
        });
    }
};

// Get staff statistics
const getStaffStats = async (req, res) => {
    try {
        const stats = await Promise.all([
            Staff.countDocuments({ role: 'admin', isActive: true }),
            Staff.countDocuments({ role: 'verifier', isActive: true }),
            Staff.countDocuments({ isActive: false })
        ]);

        res.status(200).json({
            status: 'success',
            data: {
                activeAdmins: stats[0],
                activeVerifiers: stats[1],
                inactiveStaff: stats[2],
                totalActive: stats[0] + stats[1]
            }
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ 
            message: "Unable to fetch staff stats", 
            error: err.message 
        });
    }
};

// Export staff data as PDF
const exportStaffPDF = async (req, res) => {
    try {
        const staff = await Staff.find({ isActive: true })
            .populate('createdBy', 'fullName staffId')
            .sort({ createdAt: -1 });

        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];

        doc.on('data', buffer => buffers.push(buffer));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=Staff_Data_${new Date().toISOString().split('T')[0]}.pdf`);
            res.setHeader('Content-Length', pdfData.length);
            
            res.send(pdfData);
        });

        // Header
        doc.fontSize(20).font('Helvetica-Bold').text('STAFF DATA REPORT', 50, 50, { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica').text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
        doc.fontSize(10).text(`Total Staff Members: ${staff.length}`, { align: 'center' });
        
        // Draw line
        doc.moveTo(50, doc.y + 20).lineTo(550, doc.y + 20).stroke();
        doc.moveDown(2);

        // Staff Information Table
        doc.fontSize(14).font('Helvetica-Bold').text('STAFF MEMBERS', 50, doc.y);
        doc.moveDown(1);

        staff.forEach((member, index) => {
            if (doc.y > 700) { // Start new page if needed
                doc.addPage();
            }

            doc.fontSize(12).font('Helvetica-Bold').text(`${index + 1}. ${member.fullName}`, 50, doc.y);
            doc.moveDown(0.3);
            
            doc.fontSize(10).font('Helvetica');
            doc.text(`   Staff ID: ${member.staffId}`, 60, doc.y);
            doc.moveDown(0.2);
            doc.text(`   Email: ${member.email}`, 60, doc.y);
            doc.moveDown(0.2);
            doc.text(`   Phone: ${member.phoneNumber}`, 60, doc.y);
            doc.moveDown(0.2);
            doc.text(`   NIC: ${member.nic || 'N/A'}`, 60, doc.y);
            doc.moveDown(0.2);
            doc.text(`   Role: ${member.role.replace(/_/g, ' ').toUpperCase()}`, 60, doc.y);
            doc.moveDown(0.2);
            doc.text(`   Department: ${member.department}`, 60, doc.y);
            doc.moveDown(0.2);
            doc.text(`   Address: ${member.address || 'N/A'}`, 60, doc.y);
            doc.moveDown(0.2);
            doc.text(`   Created: ${new Date(member.createdAt).toLocaleDateString()}`, 60, doc.y);
            
            doc.moveDown(0.5);
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown(0.3);
        });

        doc.end();
    } catch (err) {
        console.log(err);
        res.status(500).json({ 
            message: "Unable to export staff PDF", 
            error: err.message 
        });
    }
};

// Export staff data as Excel
const exportStaffExcel = async (req, res) => {
    try {
        const staff = await Staff.find({ isActive: true })
            .populate('createdBy', 'fullName staffId')
            .sort({ createdAt: -1 });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Staff Data');

        // Set up columns
        worksheet.columns = [
            { header: 'Staff ID', key: 'staffId', width: 15 },
            { header: 'Full Name', key: 'fullName', width: 25 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Phone Number', key: 'phoneNumber', width: 15 },
            { header: 'NIC', key: 'nic', width: 15 },
            { header: 'Role', key: 'role', width: 25 },
            { header: 'Department', key: 'department', width: 25 },
            { header: 'Address', key: 'address', width: 40 },
            { header: 'Created Date', key: 'createdAt', width: 15 },
            { header: 'Created By', key: 'createdBy', width: 20 }
        ];

        // Style the header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Add data rows
        staff.forEach(member => {
            worksheet.addRow({
                staffId: member.staffId,
                fullName: member.fullName,
                email: member.email,
                phoneNumber: member.phoneNumber,
                nic: member.nic || 'N/A',
                role: member.role.replace(/_/g, ' ').toUpperCase(),
                department: member.department,
                address: member.address || 'N/A',
                createdAt: new Date(member.createdAt).toLocaleDateString(),
                createdBy: member.createdBy ? member.createdBy.fullName : 'System'
            });
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            column.width = Math.max(column.width, 10);
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Staff_Data_${new Date().toISOString().split('T')[0]}.xlsx`);

        // Write the Excel file
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.log(err);
        res.status(500).json({ 
            message: "Unable to export staff Excel", 
            error: err.message 
        });
    }
};

module.exports = {
    getAllStaff,
    getStaffById,
    createStaff,
    updateStaff,
    deactivateStaff,
    reactivateStaff,
    changeStaffPassword,
    getStaffStats,
    exportStaffPDF,
    exportStaffExcel
};
