const nodemailer = require('nodemailer');
const { google } = require('googleapis');

exports.GmailOauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    `${process.env.FRONTEND_URL}/${process.env.GMAIL_REDIRECT_ENDPOINT}`
);

exports.GmailScopes = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
];

exports.MicrosoftEmailAccountDetails = {
    ClientId: process.env.OUTLOOK_CLIENT_ID,
    ClientSecret: process.env.OUTLOOK_CLIENT_SECRET,
    RedirectUri: `${process.env.FRONTEND_URL}/${process.env.OUTLOOK_REDIRECT_ENDPOINT}`,
    OutlookScopes: [
        'User.Read',
        'Mail.Read',
        'Mail.Send',
        'offline_access'
    ]
};

exports.GenerateRandomPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

exports.SendZohoAccountCreationEmail = async (AlertEmailAddress, EmailAddress, Password) => {
    try {
        const AppLogoPath = process.env.COMPANY_LOGO;

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
            to: AlertEmailAddress,
            subject: 'Zoho Account Created',
            html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Zoho Account Created</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; text-align: center;">
        <div style="max-width: 500px; background: white; padding: 20px; border-radius: 10px; box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.1); margin: auto;">
            <img src="${AppLogoPath}" alt="QuickPipe AI" style="width: 120px; height: auto; margin-bottom: 20px;">
            <h2 style="color: #333;">Zoho Account Created</h2>
            <p style="font-size: 16px;">Your Zoho account has been created successfully.</p>
            <p style="font-size: 14px; color: #777;">Email Address: <b>${EmailAddress}</b></p>
            <p style="font-size: 14px; color: #777;">Password: <b>${Password}</b></p>
            <br>
            <p style="font-size: 12px; color: #aaa;">Best regards,<br>Quickpipe Team</p>
        </div>
    </body>
    </html>
                `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Zoho account creation email sent to ${AlertEmailAddress}: `, info.response);

        return true;
    } catch (error) {
        console.error('Error sending zoho account creation email:', error);
        throw error;
    }
};