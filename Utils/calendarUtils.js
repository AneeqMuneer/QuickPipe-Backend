// In Utils/calendarUtils.js

const { google } = require('googleapis');
const dotenv = require('dotenv');
dotenv.config({ path: "../config/config.env" });

exports.refreshGoogleAccessToken = async (refreshToken) => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    const { tokens } = await oauth2Client.refreshAccessToken();
    
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || refreshToken // Use new refresh token if provided, otherwise keep old one
    };
  } catch (error) {
    console.error("Error refreshing Google access token:", error);
    return null;
  }
};