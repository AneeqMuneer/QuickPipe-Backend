const multer = require("multer");
const ErrorHandler = require("../Utils/errorHandler");
const path = require("path");
const fs = require("fs");

console.log("Multer middleware loaded");

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Memory storage for single file uploads (existing functionality)
const memoryStorage = multer.memoryStorage();

// Disk storage for multiple file uploads
const diskStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Keep original filename with timestamp to avoid conflicts
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    console.log("File filter called for file:", file.originalname, "mimetype:", file.mimetype);

    // Accept image files
    if (file.mimetype.startsWith('image/')) {
        console.log("File accepted as image");
        cb(null, true);
        return;
    }

    // Accept PDF files
    if (file.mimetype === 'application/pdf') {
        console.log("File accepted as PDF");
        cb(null, true);
        return;
    }

    // Accept MP3 files
    if (file.mimetype === 'audio/mpeg') {
        console.log("File accepted as MP3");
        cb(null, true);
        return;
    }

    // Accept common document formats
    const documentTypes = [
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/vnd.ms-excel', // .xls
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-powerpoint', // .ppt
        'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
        'text/plain' // .txt
    ];

    if (documentTypes.includes(file.mimetype)) {
        console.log("File accepted as document");
        cb(null, true);
        return;
    }

    console.log("File rejected - unsupported type");
    cb(new ErrorHandler("Only images, PDFs, MP3s, and common document formats are allowed", 400), false);
};

// Single file upload (existing functionality)
const upload = multer({
    storage: memoryStorage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 1 // Limit to 1 file per request
    },
    fileFilter: fileFilter,
    onError: function (err, next) {
        console.log("Multer error:", err);
        if (err.code === 'LIMIT_FILE_SIZE') {
            next(new ErrorHandler("File size too large. Maximum size is 10MB", 400));
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            next(new ErrorHandler("Unexpected file field. Please check your form field names.", 400));
        } else {
            next(new ErrorHandler(err.message || "Error processing form data", 500));
        }
    }
});

// Multiple files upload for documents
const uploadMultiple = multer({
    storage: diskStorage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit per file
        files: 3 // Maximum 3 files
    },
    fileFilter: fileFilter,
    onError: function (err, next) {
        console.log("Multer error:", err);
        if (err.code === 'LIMIT_FILE_SIZE') {
            next(new ErrorHandler("File size too large. Maximum size is 10MB per file", 400));
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            next(new ErrorHandler("Unexpected file field. Please check your form field names.", 400));
        } else if (err.code === 'LIMIT_FILE_COUNT') {
            next(new ErrorHandler("Too many files. Maximum 3 files allowed.", 400));
        } else {
            next(new ErrorHandler(err.message || "Error processing form data", 500));
        }
    }
});

module.exports = { upload, uploadMultiple };