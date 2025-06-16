const { Meetings, Lead, User } = require("../Model/connect");
const ErrorHandler = require("../Utils/errorHandler");
const catchAsyncError = require("../Middleware/asyncError");

exports.getAllMeetings = catchAsyncError(async (req, res, next) => {
  try {
    console.log('Fetching all meetings...');
    
    // First, try to get meetings without includes to verify basic functionality
    const meetings = await Meetings.findAll({
      order: [['MeetingDate', 'DESC'], ['MeetingTime', 'DESC']]
    });

    console.log(`Successfully fetched ${meetings.length} meetings`);
    
    // If we have meetings, try to load their associations one by one
    if (meetings.length > 0) {
      for (let meeting of meetings) {
        try {
          await meeting.reload({
            include: [
              {
                model: Lead,
                as: 'Lead',
                attributes: ['id', 'Name', 'Email']
              },
              {
                model: User,
                as: 'User',
                attributes: ['id', 'Name', 'Email']
              }
            ]
          });
        } catch (err) {
          console.error('Error loading associations for meeting:', meeting.id, err);
        }
      }
    }

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