const ErrorHandler = require("../Utils/errorHandler");
const catchAsyncError = require("../Middleware/asyncError");
const { google } = require("googleapis");
const { Op } = require("sequelize");
const dotenv = require('dotenv')
dotenv.config({ path: "../config/config.env" });

// Import models
const TaskModel = require("../Model/taskModel");
const UserModel = require("../Model/userModel");

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );

// Google Calendar API setup
const setupCalendarClient = (accessToken, refreshToken) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URL
  );
  
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken
  });
  
  return google.calendar({ version: 'v3', auth: oauth2Client });
};

// Controller to connect user's Google Calendar account
exports.connectGoogleCalendar = catchAsyncError(async (req, res, next) => {
  try {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "User not authenticated" });
      }
    console.log(req.user.User.id)
    const state = encodeURIComponent(JSON.stringify({ userId: req.user.User.id }));
    // Generate the Google authentication URL
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline', // Request offline access to receive a refresh token
        scope:['https://www.googleapis.com/auth/calendar.events'],
        prompt:'consent',
        state
      });
      console.log(url);
      // Redirect the user to Google's OAuth 2.0 server
      res.redirect(url);
    } catch (error) {
    return next(new ErrorHandler("Failed to connect Google Calendar" + error, 500));
  }
});

exports.handleOAuthCallback = catchAsyncError(async (req, res,next) => {
    try {
      // Extract the code from the query parameter
      const { code,state } = req.query;
      
      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Authorization code is required'
        });
      }
      console.log("state variable ",state);
      const { userId } = JSON.parse(decodeURIComponent(state));
      console.log("decoded userid ",userId);
  
      // Exchange the code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      
      // Store tokens in session or database
      const user = await UserModel.findOne({
        where:{id:userId}
      });

      //workspace ke andar
      await user.update({
        googleAuthCode: code,
        googleAccessToken:tokens.access_token,
        googleRefreshToken:tokens.refresh_token,
        googleTokenExpiry:tokens.expiry_date
      })

      // req.session.tokens = tokens; // If using session storage
      
      res.status(200).json({
        success: true,
        message: 'Successfully authenticated with Google Calendar'
      });
    } catch (error) {
        return next(new ErrorHandler("Failed to connect Google Calendar" + error, 500));
    }
  });

// Create a new event and sync with Google Calendar
exports.createEvent = catchAsyncError(async (req, res, next) => {
  const { title, description, startDateTime, endDateTime, location, attendees, reminderMinutes } = req.body;
  const userId = req.user.id;
  
  if (!title || !startDateTime || !endDateTime) {
    return next(new ErrorHandler("Please provide title, start time and end time", 400));
  }
  
  // Create event in our database
  const event = await TaskModel.create({
    title,
    description,
    startDateTime,
    endDateTime,
    location,
    userId,
    reminderMinutes: reminderMinutes || 30
  });
  
  // If user has connected Google Calendar, sync the event
  const user = await UserModel.findByPk(userId);
  
  if (user.googleAccessToken && user.googleRefreshToken) {
    const calendar = setupCalendarClient(user.googleAccessToken, user.googleRefreshToken);
    
    // Format attendees for Google Calendar API
    const formattedAttendees = attendees ? 
      attendees.map(email => ({ email })) : 
      [];
    
    const googleEvent = {
      summary: title,
      description,
      start: {
        dateTime: new Date(startDateTime).toISOString(),
        timeZone: 'UTC'
      },
      end: {
        dateTime: new Date(endDateTime).toISOString(),
        timeZone: 'UTC'
      },
      location,
      attendees: formattedAttendees,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: reminderMinutes || 30 },
          { method: 'popup', minutes: 10 }
        ]
      }
    };
    
    try {
      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: googleEvent
      });
      
      // Update our event with Google Calendar event ID
      await event.update({ googleEventId: response.data.id });
    } catch (error) {
      // Continue even if Google Calendar sync fails
      console.error("Google Calendar sync failed:", error);
    }
  }
  
  res.status(201).json({
    success: true,
    message: "Event created successfully",
    event
  });
});

// Get all events for a user
exports.getEvents = catchAsyncError(async (req, res, next) => {
  const userId = req.user.id;
  const { startDate, endDate } = req.query;
  
  let whereClause = { userId };
  
  // Add date range filter if provided
  if (startDate && endDate) {
    whereClause.startDateTime = {
      [Op.between]: [new Date(startDate), new Date(endDate)]
    };
  }
  
  const events = await TaskModel.findAll({
    where: whereClause,
    order: [['startDateTime', 'ASC']]
  });
  
  res.status(200).json({
    success: true,
    count: events.length,
    events
  });
});

// Get a single event
exports.getEvent = catchAsyncError(async (req, res, next) => {
  const eventId = req.params.id;
  const userId = req.user.id;
  
  const event = await TaskModel.findOne({
    where: { 
      id: eventId,
      userId
    }
  });
  
  if (!event) {
    return next(new ErrorHandler("Event not found", 404));
  }
  
  res.status(200).json({
    success: true,
    event
  });
});

// Update an event
exports.updateEvent = catchAsyncError(async (req, res, next) => {
  const eventId = req.params.id;
  const userId = req.user.id;
  const { title, description, startDateTime, endDateTime, location, attendees, reminderMinutes } = req.body;
  
  const event = await TaskModel.findOne({
    where: { 
      id: eventId,
      userId
    }
  });
  
  if (!event) {
    return next(new ErrorHandler("Event not found", 404));
  }
  
  // Update event in our database
  await event.update({
    title: title || event.title,
    description: description !== undefined ? description : event.description,
    startDateTime: startDateTime || event.startDateTime,
    endDateTime: endDateTime || event.endDateTime,
    location: location !== undefined ? location : event.location,
    reminderMinutes: reminderMinutes || event.reminderMinutes
  });
  
  // If event has a Google Calendar ID, update it there too
  if (event.googleEventId) {
    const user = await UserModel.findByPk(userId);
    
    if (user.googleAccessToken && user.googleRefreshToken) {
      const calendar = setupCalendarClient(user.googleAccessToken, user.googleRefreshToken);
      
      const formattedAttendees = attendees ? 
        attendees.map(email => ({ email })) : 
        [];
      
      const googleEvent = {
        summary: title || event.title,
        description: description !== undefined ? description : event.description,
        start: {
          dateTime: new Date(startDateTime || event.startDateTime).toISOString(),
          timeZone: 'UTC'
        },
        end: {
          dateTime: new Date(endDateTime || event.endDateTime).toISOString(),
          timeZone: 'UTC'
        },
        location: location !== undefined ? location : event.location,
        attendees: formattedAttendees.length > 0 ? formattedAttendees : undefined,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: reminderMinutes || event.reminderMinutes },
            { method: 'popup', minutes: 10 }
          ]
        }
      };
      
      try {
        await calendar.events.update({
          calendarId: 'primary',
          eventId: event.googleEventId,
          resource: googleEvent
        });
      } catch (error) {
        console.error("Google Calendar update failed:", error);
      }
    }
  }
  
  res.status(200).json({
    success: true,
    message: "Event updated successfully",
    event
  });
});

// Delete an event
exports.deleteEvent = catchAsyncError(async (req, res, next) => {
  const eventId = req.params.id;
  const userId = req.user.id;
  
  const event = await TaskModel.findOne({
    where: { 
      id: eventId,
      userId
    }
  });
  
  if (!event) {
    return next(new ErrorHandler("Event not found", 404));
  }
  
  // If event has a Google Calendar ID, delete it there too
  if (event.googleEventId) {
    const user = await UserModel.findByPk(userId);
    
    if (user.googleAccessToken && user.googleRefreshToken) {
      const calendar = setupCalendarClient(user.googleAccessToken, user.googleRefreshToken);
      
      try {
        await calendar.events.delete({
          calendarId: 'primary',
          eventId: event.googleEventId
        });
      } catch (error) {
        console.error("Google Calendar deletion failed:", error);
      }
    }
  }
  
  // Delete from our database
  await event.destroy();
  
  res.status(200).json({
    success: true,
    message: "Event deleted successfully"
  });
});

// Sync events from Google Calendar
exports.syncGoogleEvents = catchAsyncError(async (req, res, next) => {
  const userId = req.user.id;
  const user = await UserModel.findByPk(userId);
  
  if (!user.googleAccessToken || !user.googleRefreshToken) {
    return next(new ErrorHandler("Google Calendar not connected", 400));
  }
  
  const calendar = setupCalendarClient(user.googleAccessToken, user.googleRefreshToken);
  
  try {
    // Get events from last 30 days and next 90 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const ninetyDaysAhead = new Date();
    ninetyDaysAhead.setDate(ninetyDaysAhead.getDate() + 90);
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: thirtyDaysAgo.toISOString(),
      timeMax: ninetyDaysAhead.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });
    
    const googleEvents = response.data.items;
    let syncCount = 0;
    
    // Process each Google Calendar event
    for (const gEvent of googleEvents) {
      // Skip events without start/end times or already synced
      if (!gEvent.start.dateTime || !gEvent.end.dateTime) continue;
      
      // Check if event already exists in our database
      const existingEvent = await TaskModel.findOne({
        where: { googleEventId: gEvent.id, userId }
      });
      
      if (existingEvent) {
        // Update existing event
        await existingEvent.update({
          title: gEvent.summary,
          description: gEvent.description || '',
          startDateTime: new Date(gEvent.start.dateTime),
          endDateTime: new Date(gEvent.end.dateTime),
          location: gEvent.location || ''
        });
      } else {
        // Create new event
        await TaskModel.create({
          title: gEvent.summary,
          description: gEvent.description || '',
          startDateTime: new Date(gEvent.start.dateTime),
          endDateTime: new Date(gEvent.end.dateTime),
          location: gEvent.location || '',
          userId,
          googleEventId: gEvent.id
        });
        syncCount++;
      }
    }
    
    res.status(200).json({
      success: true,
      message: `Successfully synced ${syncCount} new events from Google Calendar`,
      totalEvents: googleEvents.length
    });
  } catch (error) {
    return next(new ErrorHandler("Failed to sync Google Calendar events", 500));
  }
});