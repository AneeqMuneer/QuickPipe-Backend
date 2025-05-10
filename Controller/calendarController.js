const ErrorHandler = require("../Utils/errorHandler");
const catchAsyncError = require("../Middleware/asyncError");
const { google } = require("googleapis");
const { Op, where } = require("sequelize");
const dotenv = require('dotenv')
dotenv.config({ path: "../config/config.env" });

// Import models
const TaskModel = require("../Model/taskModel");
// const UserModel = require("../Model/userModel");
const ApiModel = require('../Model/apiModel');
const {refreshGoogleAccessToken} = require('../Utils/calendarUtils');

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

    console.log(req.user.User.CurrentWorkspaceId);
    const state = encodeURIComponent(JSON.stringify({ CurrentWorkspaceId: req.user.User.CurrentWorkspaceId }));

    // Generate the Google authentication URL
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Request offline access to receive a refresh token
      scope: ['https://www.googleapis.com/auth/calendar'],
      prompt: 'consent',
      state,
    });

    console.log(url);

    // Send the URL to the frontend
    res.status(200).json({
      success: true,
      message: "Google Calendar authentication URL generated successfully",
      url, // Send the URL in the response
    });
  } catch (error) {
    return next(new ErrorHandler("Failed to connect Google Calendar: " + error, 500));
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
      const { CurrentWorkspaceId } = JSON.parse(decodeURIComponent(state));
      console.log("decoded CurrentWorkspaceId ",CurrentWorkspaceId);
  
      // Exchange the code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      
      // Store tokens in session or database
      const api = await ApiModel.findOne({
        where:{WorkspaceId:CurrentWorkspaceId}
      });


      //workspace ke andar
      await api.update({
        GoogleCalendarAccessToken:tokens.access_token,
        GoogleCalendarRefreshToken:tokens.refresh_token,
      })

      // req.session.tokens = tokens; // If using session storage
      res.redirect(`${process.env.FRONTEND_URL}/settings?sucess=true&type=calendar`); // Redirect to your frontend URL
      // res.status(200).json({
      //   success: true,
      //   message: 'Successfully authenticated with Google Calendar'
      // });
    } catch (error) {
        return next(new ErrorHandler("Failed to connect Google Calendar" + error, 500));
    }
});

// Create a new event and sync with Google Calendar
exports.createEvent = catchAsyncError(async (req, res, next) => {
  const { Task_Title, Description, eventTime, eventDate, Person, Meeting_Link, Extra_Notes } = req.body;
  const CurrentWorkspaceId = req.user.User.CurrentWorkspaceId;
  
  if (!Task_Title || !Description || !eventTime || !eventDate || !Person || !Meeting_Link) {
    return next(new ErrorHandler("Please provide all required fields", 400));
  }

  // If workspace has connected Google Calendar, sync the event
  const api = await ApiModel.findOne({
    where: { WorkspaceId: CurrentWorkspaceId }
  });

  if (!api) {
    return next(new ErrorHandler('Connect your Google Calendar before submitting this request',400));
  }
  
  // Create event in our database
  const event = await TaskModel.create({
    Task_Title,
    Description,
    eventDate,
    eventTime,
    Person,
    Meeting_Link,
    Extra_Notes,
    WorkspaceId: CurrentWorkspaceId  // Make sure to associate with workspace
  });
  
  
  if (api && api.GoogleCalendarAccessToken && api.GoogleCalendarRefreshToken) {
    let calendar;
    
    try {
      // Fixed: Use the EXACT same property names as stored in database
      calendar = setupCalendarClient(api.GoogleCalendarAccessToken, api.GoogleCalendarRefreshToken);
      
      // If token expired, try to refresh
      if (!calendar) {
        const updatedTokens = await refreshGoogleAccessToken(api.GoogleCalendarRefreshToken);
        if (updatedTokens) {
          // Update the tokens in the database
          await api.update({
            GoogleCalendarAccessToken: updatedTokens.accessToken,
            GoogleCalendarRefreshToken: updatedTokens.refreshToken
          });
          calendar = setupCalendarClient(updatedTokens.accessToken, updatedTokens.refreshToken);
        }
      }

      if (!calendar) {
        throw new Error("Failed to initialize calendar client");
      }
      
      // Format event for Google Calendar API
      // Create a proper datetime from your Time and Date fields
      const startDateTime = new Date(`${eventDate}T${eventTime}`);
      // Add 1 hour for end time if not specified
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

      const googleEvent = {
        summary: Task_Title,
        description: Description, // Fixed: Use lowercase 'description'
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: 'UTC'
        },
        end: {
          dateTime: endDateTime.toISOString(), // Added missing end time
          timeZone: 'UTC'
        },
        location: Meeting_Link, // Use Meeting_Link as location
        // Add Person as attendee if it's an email
        attendees: Person.includes('@') ? [{ email: Person }] : [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 30 },
            { method: 'popup', minutes: 10 }
          ]
        }
      };
      
      // Fixed: Added await here - this is critical
      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: googleEvent
      });
      
      // Update our event with Google Calendar event ID
      await event.update({ GoogleEventId: response.data.id });
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
  const WorkspaceId = req.user.User.CurrentWorkspaceId;
  const { startDate, endDate } = req.query;
  
  let whereClause = { WorkspaceId };
  
  // Add date range filter if provided
  if (startDate && endDate) {
    whereClause.startDateTime = {
      [Op.between]: [new Date(startDate), new Date(endDate)]
    };
  }
  
  const events = await TaskModel.findAll({
    where: whereClause,
    order: [['eventDate', 'ASC']]
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
  const WorkspaceId = req.user.User.CurrentWorkspaceId;
  
  const event = await TaskModel.findOne({
    where: { 
      GoogleEventId: eventId,
      WorkspaceId
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
  const CurrentWorkspaceId = req.user.User.CurrentWorkspaceId;
  const { Task_Title, Description, eventDate, eventTime, Meeting_Link,Extra_Notes, Person } = req.body;
  
  const event = await TaskModel.findOne({
    where: { 
      GoogleEventId: eventId,
      WorkspaceId:CurrentWorkspaceId
    }
  });
  
  if (!event) {
    return next(new ErrorHandler("Event not found", 404));
  }
  
  // Update event in our database
  await event.update({
    Task_Title: Task_Title || event.Task_Title,
    Description: Description !== undefined ? Description : event.Description,
    eventTime: eventTime || event.eventTime,
    Person: Person || event.Person,
    Meeting_Link: Meeting_Link || event.Meeting_Link,
    Extra_Notes: Extra_Notes || event.Extra_Notes,
    eventDate: eventDate || event.eventDate,
    GoogleEventId: event.GoogleEventId || event.GoogleEventId,
    WorkspaceId: event.WorkspaceId || event.WorkspaceId

  });
  
  // If event has a Google Calendar ID, update it there too
  if (event.GoogleEventId) {
    const api = await ApiModel.findOne({
      where: { WorkspaceId :CurrentWorkspaceId}

    }); 
    
    if (api.GoogleCalendarAccessToken && api.GoogleCalendarRefreshToken) {
      const calendar = setupCalendarClient(api.GoogleCalendarAccessToken, api.GoogleCalendarRefreshToken);
      
        const startDateTime = new Date(`${eventDate}T${eventTime}`);
        // Add 1 hour for end time if not specified
        const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
      
      const googleEvent = {
        summary: Task_Title || event.Task_Title,
        description: Description !== undefined ? Description : event.Description,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: 'UTC'
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: 'UTC'
        },
        location: Meeting_Link !== undefined ? Meeting_Link : event.Meeting_Link,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 30 },
            { method: 'popup', minutes: 10 }
          ]
        }
      };
      
      try {
        await calendar.events.update({
          calendarId: 'primary',
          eventId: event.GoogleEventId,
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
  const CurrentWorkspaceId = req.user.User.CurrentWorkspaceId;

  const event = await TaskModel.findOne({
    where: {
      GoogleEventId: eventId,
      WorkspaceId: CurrentWorkspaceId
    }
  });

  if (!event) {
    return next(new ErrorHandler("Event not found", 404));
  }

  // If event has a Google Calendar ID, delete it there too
  if (event.GoogleEventId) {
    const api = await ApiModel.findOne({
      where: { WorkspaceId: CurrentWorkspaceId }
    });

    if (api?.GoogleCalendarAccessToken && api?.GoogleCalendarRefreshToken) {
      const calendar = setupCalendarClient(api.GoogleCalendarAccessToken, api.GoogleCalendarRefreshToken);

      try {
        await calendar.events.delete({
          calendarId: 'primary',
          eventId: event.GoogleEventId
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
  // If workspace has connected Google Calendar, sync the event
  const CurrentWorkspaceId = req.user.User.CurrentWorkspaceId;
  const api = await ApiModel.findOne({
    where: { WorkspaceId: CurrentWorkspaceId }
  });

  if (!api) {
    return next(new ErrorHandler('Connect your Google Calendar before submitting this request',400));
  }  
  if (!api.googleAccessToken || !api.googleRefreshToken) {
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