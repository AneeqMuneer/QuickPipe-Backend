const nodemailer = require('nodemailer');
const path = require('path');

const AppLogoPath = process.env.COMPANY_LOGO;

exports.GenerateAuthCode = async () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length: 6 }, () => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
};

exports.GenerateTimestampAuthCode = async () => {
    const timestamp = Date.now();

    let base36Timestamp = timestamp.toString(36).toUpperCase();

    if (base36Timestamp.length >= 6) {
        return base36Timestamp.slice(-6);
    } else {
        return base36Timestamp.padStart(6, '0');
    }
};

exports.SendAuthCodeMail = async (email, authCode) => {
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
            from: process.env.EMAIL,
            to: email,
            subject: 'Two-Factor Authentication (2FA) Code',
            html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>2FA Code</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; text-align: center;">
    <div style="max-width: 500px; background: white; padding: 20px; border-radius: 10px; box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.1); margin: auto;">
        <img src="${AppLogoPath}" alt="QuickPipe AI" style="width: 120px; height: auto; margin-bottom: 20px;">
        <h2 style="color: #333;">Two-Factor Authentication</h2>
        <p style="font-size: 16px;">Use the following code to complete your login:</p>
        <h3 style="font-size: 24px; font-weight: bold; color: #16C47F; padding: 10px; border: 2px dashed #16C47F; display: inline-block;">${authCode}</h3>
        <p style="font-size: 14px; color: #777;">This code is valid for a limited time. Do not share it with anyone.</p>
        <p style="font-size: 14px;">If you did not request this, please ignore this email.</p>
        <br>
        <p style="font-size: 12px; color: #aaa;">Best regards,<br>QuickPipe Team</p>
    </div>
</body>
</html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`2FA Email sent to ${email}: `, info.response);

        return true;
    } catch (error) {
        console.error('Error sending 2FA email:', error);
        throw error;
    }
};

exports.SendForgetPasswordMail = async (email, resetToken) => {
    try {
        const resetUrl = `${process.env.FRONTEND_URL}/reset?token=${resetToken}`;

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
            from: process.env.EMAIL,
            to: email,
            subject: 'Password Reset Request',
            html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; text-align: center;">
    <div style="max-width: 500px; background: white; padding: 20px; border-radius: 10px; box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.1); margin: auto;">
        <img src="${AppLogoPath}" alt="QuickPipe AI" style="width: 120px; height: auto; margin-bottom: 20px;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p style="font-size: 16px;">Click the button below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; background-color: #16C47F; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 15px 0; font-weight: bold;">Reset Password</a>
        <p style="font-size: 14px; color: #777;">This link is valid for one time use only.</p>
        <p style="font-size: 14px;">If you did not request this password reset, please ignore this email.</p>
        <br>
        <p style="font-size: 12px; color: #aaa;">Best regards,<br>Quickpipe Team</p>
    </div>
</body>
</html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Password reset email sent to ${email}: `, info.response);

        return true;
    } catch (error) {
        console.error('Error sending password reset email:', error);
        throw error;
    }
};