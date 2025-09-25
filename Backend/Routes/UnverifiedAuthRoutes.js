const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const UnverifiedAuthController = require("../Controllers/UnverifiedAuthController");
const { protect } = UnverifiedAuthController;

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/verification-documents');
    console.log('Upload path:', uploadPath);
    
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
      console.log('Created upload directory:', uploadPath);
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ message: 'File upload error: ' + err.message });
  }
  if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};

// Registration routes with image upload and error handling
router.post("/register-client", upload.single('nicImage'), handleMulterError, UnverifiedAuthController.registerUnverifiedClient);
router.post("/register-lawyer", upload.single('lawIdImage'), handleMulterError, UnverifiedAuthController.registerUnverifiedLawyer);

// Login route (universal)
router.post("/login", UnverifiedAuthController.login);

// Test route
router.get("/test", (req, res) => {
  res.json({ message: "UnverifiedAuth routes working", timestamp: new Date() });
});

// Test registration route (without image)
router.post("/test-register-client", async (req, res) => {
  try {
    console.log('Test registration received:', req.body);
    res.json({ 
      message: "Test registration successful", 
      receivedData: req.body,
      timestamp: new Date() 
    });
  } catch (err) {
    console.error('Test registration error:', err);
    res.status(500).json({ message: "Test registration failed", error: err.message });
  }
});

// Protected routes
router.get("/me", protect, UnverifiedAuthController.getMe);

// Route to serve uploaded images
router.get("/image/:filename", (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, '../uploads/verification-documents', filename);
  res.sendFile(imagePath);
});

module.exports = router;
