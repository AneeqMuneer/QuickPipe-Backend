const express = require("express");
const { AddFeedback, SendFeedbackMail } = require("../Controller/helpController");
const { VerifyUser } = require("../Middleware/userAuth");
const upload = require("../Middleware/multer.js");

const router = express.Router();

const handleMulterErrors = (req, res, next) => {
    upload.single('Attachment')(req, res, (err) => {
        console.log("Multer processing complete for feedback submission");
        if (err) {
            console.log("Multer error in feedback submission:", err);
            return next(new ErrorHandler(err.message || "Error processing form data", 400));
        }

        console.log("File processed successfully for feedback submission:", req.file ? "File exists" : "No file");
        next();
    });
};

router.route("/AddFeedback").post(handleMulterErrors , VerifyUser, SendFeedbackMail);

module.exports = router;