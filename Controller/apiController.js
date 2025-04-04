const ErrorHandler = require("../Utils/errorHandler");
const catchAsyncError = require("../Middleware/asyncError");
const TokenCreation = require("../Utils/tokenCreation");
const { Op } = require("sequelize");

const WorkspaceModel = require("../Model/workspaceModel");
const APIModel = require("../Model/apiModel");

exports.AddApi = catchAsyncError(async (req , res , next) => {
    const WorkspaceId = req.user.User.CurrentWorkspaceId;

    const Workspace = await WorkspaceModel.findOne({
        where: {
            id: WorkspaceId
        }
    });

    if (!Workspace) {
        return next(new ErrorHandler("Workspace doesn't exist", 400));
    }

    const API = await APIModel.findOne({
        where: {
            WorkspaceId
        }
    });

    if (!API) {
        return next(new ErrorHandler("API section not found" , 400));
    }

    API.SlackAPI = req.body.SlackAPI || API.SlackAPI;
    API.GoogleCalendarAPI = req.body.GoogleCalendarAPI || API.GoogleCalendarAPI;
    API.OpenAiAPI = req.body.OpenAiAPI || API.OpenAiAPI;
    API.HubspotAPI = req.body.HubspotAPI || API.HubspotAPI;
    API.SalesforceAPI = req.body.SalesforceAPI || API.SalesforceAPI;

    await API.save();

    res.status(200).json({
        success: true,
        message: 'API key added successfully',
        API
    });
});