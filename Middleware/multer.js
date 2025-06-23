const multer = require("multer");
const ErrorHandler = require("../Utils/errorHandler");

console.log("Multer middleware loaded");

// Memory storage for both single and multiple files
const memoryStorage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
    console.log("File filter called for file:", file.originalname, "mimetype:", file.mimetype);

    const allowedTypes = [
        'application/pdf', // PDF
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // DOCX
    ];

    if (allowedTypes.includes(file.mimetype)) {
        console.log("File accepted");
        cb(null, true);
    } else {
        console.log("File rejected");
        cb(new ErrorHandler("Only PDF and DOCX files are allowed", 400), false);
    }
};

// Multer for single file upload
const upload = multer({
    storage: memoryStorage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 1
    },
    fileFilter
});

// Multer for multiple file upload (used in AddDocumentData)
const uploadMultiple = multer({
    storage: memoryStorage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
        files: 3
    },
    fileFilter
});

module.exports = { upload, uploadMultiple };