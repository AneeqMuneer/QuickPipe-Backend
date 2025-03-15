const nodemailer = require('nodemailer');

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
        <h2 style="color: #333;">Two-Factor Authentication</h2>
        <p style="font-size: 16px;">Use the following code to complete your login:</p>
        <h3 style="font-size: 24px; font-weight: bold; color: #d9534f; padding: 10px; border: 2px dashed #d9534f; display: inline-block;">${authCode}</h3>
        <p style="font-size: 14px; color: #777;">This code is valid for a limited time. Do not share it with anyone.</p>
        <p style="font-size: 14px;">If you did not request this, please ignore this email.</p>
        <br>
        <p style="font-size: 12px; color: #aaa;">Best regards,<br>Security Team</p>
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
        const resetUrl = `${process.env.BACKEND_URL}/User/ResetPassword?token=${resetToken}`;

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
            subject: `Reset Your Password`,
            html: `
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset - Developers Day 2025</title>
</head>

<body style="height: 100%; align-items: center; background-color: white; margin: 0; font-family: Arial, sans-serif; display: flex;">
  <div style="max-width: 600px; margin: 10px auto">
    <div style="margin: 0px 5px; padding: 0px;">
      <div style="margin: 5px 0px 0px 0px; background: linear-gradient(to bottom right, #a02723, #000000); color: #FFFFFF; padding: 10px; border-radius: 10px; box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.3);">
        
        <div style="text-align: center; padding: 20px 0;">
          <img style="height:7em;" src="https://res.cloudinary.com/da6bsligl/image/upload/v1741530918/teams/yyyjnwuefugf5vefuuop.png" alt="Developers Day 2025 Logo" border="0">
        </div>

        <p style="margin-bottom: 0px; text-align: justify; padding: 0 25px 15px; font-size: 15px;">
          Dear User,
          <br><br>
          We received a request to reset your password for your Developers Day 2025 account.
          <br><br>
          Click the button below to reset your password:
          <br><br>
          <div style="text-align: center;">
            <a href="${resetUrl}" target="_blank" style="background-color: #ffffff; color: #a02723; font-size: 16px; padding: 10px 20px; border-radius: 5px; text-decoration: none; font-weight: bold; border: 2px solid #a02723;">Reset Password</a>
          </div>
          <br><br>
          If you didn't request this, please ignore this email. This link will expire in 30 minutes.
          <br><br>
          Best regards,<br>
          Team Developers' Day 2025
        </p>

        <table style="width: 100%; text-align: center; margin-top: 5px;">
          <tr>
            <td>
              <p style="margin: 0; padding-bottom: 5px; font-size: 0.9em;"><strong>For Further Updates<br>Stay Tuned!</strong></p>
              <div class="social-icons" style="margin: 10px;">
                  <a href="https://www.linkedin.com/company/developersday" target="_blank" style="display: inline-block;"><img src="https://img.icons8.com/color/48/linkedin.png" alt="LinkedIn"></a>
                  <a href="https://www.facebook.com/developersday" target="_blank" style="display: inline-block;"><img src="https://img.icons8.com/color/48/facebook-new.png" alt="Facebook"></a>
                  <a href="https://www.instagram.com/developersday" target="_blank" style="display: inline-block;"><img src="https://img.icons8.com/color/48/instagram-new--v1.png" alt="Instagram"></a>
              </div>
            </td>
          </tr>
        </table>
      </div>
    </div>
  </div>
</body>
</html>`
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
        console.log(`Password reset mail sent to ${email} successfully.`);

        return true;
    } catch (error) {
        console.log('Error sending email:', error);
        throw error;
    }
};