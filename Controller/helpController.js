const ErrorHandler = require("../Utils/errorHandler");
const catchAsyncError = require("../Middleware/asyncError");
const nodemailer = require("nodemailer");

exports.SendFeedbackMail = catchAsyncError(async (req, res, next) => {
    const { Type, Subject, Message } = req.body;
    const { User } = req.user;

    if (!Type || !Subject || !Message) {
        return next(new ErrorHandler("Please fill all the required fields.", 400));
    }

    if (!req.file) {
        return next(new ErrorHandler("Please upload a file", 400));
    }
    
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        const mailOptions = {
            from: User.Email,
            to: process.env.EMAIL,
            subject: `${Type} - ${Subject}`,
            text: `${Message}`,
            attachments: [
                {
                    filename: req.file.originalname,
                    content: req.file.buffer,
                },
            ],
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Feedback invitation sent to ${User.Email}: `, info.response);

        res.status(200).json({
            success: true,
            message: "Feedback Submitted Successfully",
            Feedback: {
                Type,
                Subject,
                Message,
            }
        });

        return true;
    } catch (error) {
        console.error('Error sending feedback:', error);
        throw error;
    }
});