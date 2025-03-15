const axios = require("axios");
const querystring = require("querystring");
const catchAsyncError = require("../Middleware/asyncError");
const ErrorHandler = require("../Utils/errorHandler");

const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;
const ZOOM_REDIRECT_URI = "http://localhost:3000/api/v1/zoom/callback";

// 1️⃣ **Redirect User to Zoom OAuth**
exports.ZoomAuth = catchAsyncError(async (req, res, next) => {
    const zoomAuthURL = `https://zoom.us/oauth/authorize?response_type=code&client_id=${ZOOM_CLIENT_ID}&redirect_uri=${ZOOM_REDIRECT_URI}`;
    res.redirect(zoomAuthURL);
});

// 2️⃣ **Handle Zoom OAuth Callback & Get Access Token**
exports.ZoomCallback = catchAsyncError(async (req, res, next) => {
    const { code } = req.query;
    if (!code) {
        return next(new ErrorHandler("Authorization code is missing.", 400));
    }

    try {
        const tokenResponse = await axios.post(
            "https://zoom.us/oauth/token",
            querystring.stringify({
                grant_type: "authorization_code",
                code,
                redirect_uri: ZOOM_REDIRECT_URI,
            }),
            {
                headers: {
                    Authorization: `Basic ${Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString("base64")}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        const { access_token, refresh_token } = tokenResponse.data;

        res.status(200).json({
            success: true,
            message: "Zoom OAuth successful!",
            access_token,
            refresh_token,
        });

    } catch (error) {
        console.error("Zoom OAuth Error:", error.response.data);
        return next(new ErrorHandler("Failed to authenticate with Zoom.", 500));
    }
});

// 3️⃣ **Create Zoom Meeting**
exports.CreateZoomMeeting = catchAsyncError(async (req, res, next) => {
    const { access_token, topic, start_time, duration } = req.body;

    if (!access_token) {
        return next(new ErrorHandler("Access token is required to create a meeting.", 400));
    }

    try {
        const meetingResponse = await axios.post(
            "https://api.zoom.us/v2/users/me/meetings",
            {
                topic: topic || "New Zoom Meeting",
                type: 2, // Scheduled meeting
                start_time: start_time || new Date().toISOString(),
                duration: duration || 30,
                timezone: "UTC",
                settings: {
                    host_video: true,
                    participant_video: true,
                    join_before_host: false,
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                    "Content-Type": "application/json",
                },
            }
        );

        res.status(201).json({
            success: true,
            message: "Meeting created successfully",
            meeting_link: meetingResponse.data.join_url,
            start_url: meetingResponse.data.start_url,
        });

    } catch (error) {
        console.error("Zoom Meeting Creation Error:", error.response.data);
        return next(new ErrorHandler("Failed to create Zoom meeting.", 500));
    }
});
