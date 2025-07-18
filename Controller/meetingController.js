const Meeting = require('../Model/meetingModel');
const Lead = require('../Model/leadModel');
const User = require('../Model/userModel');
const ErrorHandler = require("../Utils/errorHandler");
const catchAsyncError = require("../Middleware/asyncError");

exports.getAllMeetings = catchAsyncError(async (req, res, next) => {
  try {
    console.log('Fetching all meetings...');
    
    // Get meetings with basic associations
    const meetings = await Meeting.findAll({
      include: [
        {
          model: Lead,
          as: 'Lead',
          attributes: ['id', 'Name', 'Email']
        },
        {
          model: User,
          as: 'User',
          attributes: ['id', 'FirstName', 'LastName', 'Email']
        }
      ],
      order: [['MeetingDate', 'DESC'], ['MeetingTime', 'DESC']]
    });

    console.log(`Successfully fetched ${meetings.length} meetings`);
    
    res.status(200).json({ 
      success: true, 
      meetings,
      count: meetings.length
    });
  } catch (error) {
    console.error('Error in getAllMeetings:', error);
    
    // Log specific error details
    if (error.name === 'SequelizeDatabaseError') {
      console.error('Database error details:', {
        message: error.message,
        sql: error.sql,
        parameters: error.parameters
      });
    } else if (error.name === 'SequelizeValidationError') {
      console.error('Validation error details:', error.errors);
    }

    return next(new ErrorHandler(
      error.message || 'Failed to fetch meetings', 
      error.statusCode || 500
    ));
  }
}); 