const express = require("express");
const { 
    connectGoogleCalendar,
    createEvent,
    getEvents,
    getEvent,
    updateEvent,
    deleteEvent,
    syncGoogleEvents,
    handleOAuthCallback
} = require("../Controller/calendarController");
const { VerifyUser } = require("../Middleware/userAuth");

const router = express.Router();

// Connect Google Calendar route - requires user authentication
router.route("/connect").get(VerifyUser, connectGoogleCalendar);

router.route("/callback").get(handleOAuthCallback);

// Event management routes - all require authentication
router.route("/events")
    .get(VerifyUser, getEvents)
    .post(VerifyUser, createEvent);

router.route("/events/:id")
    .get(VerifyUser, getEvent)
    .put(VerifyUser, updateEvent)
    .delete(VerifyUser, deleteEvent);

// Sync events from Google Calendar
router.route("/sync").post(VerifyUser, syncGoogleEvents);

module.exports = router;