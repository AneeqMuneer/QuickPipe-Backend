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