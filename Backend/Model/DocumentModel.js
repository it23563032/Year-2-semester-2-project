const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    originalName: {
        type: String,
        required: true,
        trim: true
    },
    filename: {
        type: String,
        required: true,
        unique: true
    },
    category: {
        type: String,
        required: true,
        enum: [
            'Pleading',
            'Evidence', 
            'Motion',
            'Contract',
            'Correspondence',
            'Court Order',
            'Affidavit',
            'Financial Document',
            'Medical Record',
            'Property Document',
            'Identity Document',
            'Educational Certificate',
            'Employment Document',
            'Insurance Document',
            'Other'
        ]
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    fileSize: {
        type: Number,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    case: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        default: null
    },
    filePath: {
        type: String,
        required: true
    },
    // Version control
    version: {
        type: Number,
        default: 1
    },
    parentDocument: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        default: null
    },
    versionHistory: [{
        version: Number,
        uploadedAt: Date,
        filename: String,
        changes: String
    }],
    // OCR extracted text
    extractedText: {
        type: String,
        default: ''
    },
    ocrProcessed: {
        type: Boolean,
        default: false
    },
    // OCR metadata and processing information
    ocrMetadata: {
        lastProcessed: Date,
        language: {
            type: String,
            default: 'eng'
        },
        confidence: {
            type: Number,
            min: 0,
            max: 100
        },
        wordCount: {
            type: Number,
            default: 0
        },
        lineCount: {
            type: Number,
            default: 0
        },
        paragraphCount: {
            type: Number,
            default: 0
        },
        processingTime: {
            type: Number, // milliseconds
            default: 0
        },
        errors: [{
            timestamp: Date,
            error: String,
            retry: Boolean
        }]
    },
    // Sharing and permissions
    sharedWith: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        permissions: {
            type: String,
            enum: ['read', 'write', 'admin'],
            default: 'read'
        },
        sharedAt: {
            type: Date,
            default: Date.now
        }
    }],
    shared: {
        type: Boolean,
        default: false
    },
    // Metadata
    tags: [{
        type: String,
        trim: true
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    // File integrity
    checksum: {
        type: String,
        required: true
    },
    // Access tracking
    lastAccessed: {
        type: Date,
        default: Date.now
    },
    accessCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
documentSchema.index({ uploadedBy: 1, createdAt: -1 });
documentSchema.index({ case: 1, category: 1 });
documentSchema.index({ category: 1, createdAt: -1 });
documentSchema.index({ originalName: 'text', description: 'text', extractedText: 'text' });

// Virtual for file URL (if needed for direct access)
documentSchema.virtual('fileUrl').get(function() {
    return `/api/documents/${this._id}/download`;
});

// Pre-save middleware to handle version updates
documentSchema.pre('save', function(next) {
    if (this.isNew) {
        this.versionHistory.push({
            version: this.version,
            uploadedAt: new Date(),
            filename: this.filename,
            changes: 'Initial upload'
        });
    }
    next();
});

// Method to create a new version
documentSchema.methods.createNewVersion = function(newFilename, newFilePath, changes) {
    this.version += 1;
    this.filename = newFilename;
    this.filePath = newFilePath;
    this.versionHistory.push({
        version: this.version,
        uploadedAt: new Date(),
        filename: newFilename,
        changes: changes || 'Updated document'
    });
    return this.save();
};

// Method to share document with user
documentSchema.methods.shareWith = function(userId, permissions = 'read') {
    const existingShare = this.sharedWith.find(share => 
        share.user.toString() === userId.toString()
    );
    
    if (existingShare) {
        existingShare.permissions = permissions;
        existingShare.sharedAt = new Date();
    } else {
        this.sharedWith.push({
            user: userId,
            permissions: permissions,
            sharedAt: new Date()
        });
    }
    
    this.shared = this.sharedWith.length > 0;
    return this.save();
};

// Method to update access tracking
documentSchema.methods.recordAccess = function() {
    this.lastAccessed = new Date();
    this.accessCount += 1;
    return this.save();
};

// Static method to get documents for user
documentSchema.statics.getDocumentsForUser = function(userId, options = {}) {
    const query = {
        $or: [
            { uploadedBy: userId },
            { 'sharedWith.user': userId }
        ],
        isActive: true
    };
    
    if (options.category) {
        query.category = options.category;
    }
    
    if (options.caseId) {
        query.case = options.caseId;
    }
    
    return this.find(query)
        .populate('uploadedBy', 'name email')
        .populate('case', 'caseNumber caseType')
        .sort({ createdAt: -1 })
        .limit(options.limit || 50);
};

// Static method to get documents by case
documentSchema.statics.getDocumentsByCase = function(caseId) {
    return this.find({ 
        case: caseId, 
        isActive: true 
    })
    .populate('uploadedBy', 'name email')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('Document', documentSchema);