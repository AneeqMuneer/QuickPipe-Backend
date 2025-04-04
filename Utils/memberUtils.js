const nodemailer = require('nodemailer');

const AppLogoPath = process.env.COMPANY_LOGO;

exports.SendInviteMail = async (User, Workspace) => {
    const inviteUrl = `${process.env.FRONTEND_URL}/invitationAccept/${Workspace.id}/${User.id}`;
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
            to: User.Email,
            subject: `Invitation to Join ${Workspace.WorkspaceName} on QuickPipe`,
            html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Workspace Invitation</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; text-align: center;">
    <div style="max-width: 500px; background: white; padding: 20px; border-radius: 10px; box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.1); margin: auto;">
        <img src="${AppLogoPath}" alt="QuickPipe" style="width: 120px; height: auto; margin-bottom: 20px;">
        <h2 style="color: #333;">Workspace Invitation</h2>
        <p style="font-size: 16px;">You've been invited by <strong>${User.FirstName}</strong> to join:</p>
        <h3 style="font-size: 24px; font-weight: bold; color: #16C47F; padding: 10px; border: 2px dashed #16C47F; display: inline-block;">${Workspace.WorkspaceName}</h3>
        <p style="font-size: 14px; color: #777;">Click the button below to accept the invitation:</p>
        <a href="${inviteUrl}" style="display: inline-block; background-color: #FF9D23; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 15px 0; font-weight: bold;">View Invitation</a>
        <p style="font-size: 14px; color: #777;">This invitation link is valid for 7 days.</p>
        <p style="font-size: 14px;">If you don't have a QuickPipe account, you can create one to accept this invitation.</p>
        <br>
        <p style="font-size: 14px;">If you did not expect this invitation, please ignore this email.</p>
        <br>
        <p style="font-size: 12px; color: #aaa;">Best regards,<br>QuickPipe Team</p>
    </div>
</body>
</html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Workspace invitation sent to ${User.Email}: `, info.response);

        return true;
    } catch (error) {
        console.error('Error sending workspace invitation:', error);
        throw error;
    }
};