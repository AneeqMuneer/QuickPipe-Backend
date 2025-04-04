const catchAsyncError = require("../Middleware/asyncError");
const ErrorHandler = require("../Utils/errorHandler");

const CampaignModel = require("../Model/campaignModel");
const LeadModel = require("../Model/leadModel");
const SequenceModel = require("../Model/sequenceModel");

exports.CreateCampaign = catchAsyncError(async (req, res, next) => {
    const { Name } = req.body;
    console.log(req.user.User);

    if (!Name) {
        return next(new ErrorHandler("Please fill all the required fields.", 400));
    }

    const campaign = await CampaignModel.create({
        WorkspaceId: req.user.User.CurrentWorkspaceId,
        Name,
    });

    const sequence = await SequenceModel.create({
        CampaignId: campaign.id,
    });

    const schedule = await ScheduleModel.create({
        CampaignId: campaign.id,
    })

    res.status(201).json({
        success: true,
        campaign,
        sequence,
        schedule
    });
});

exports.GetAllCampaigns = catchAsyncError(async (req, res, next) => {
    const campaigns = await CampaignModel.findAll({
        where: {
            WorkspaceId: req.user.User.CurrentWorkspaceId,
        }
    });

    res.status(200).json({
      success: true,
      campaigns,
    });
});

exports.GetCampaignById = catchAsyncError(async (req, res, next) => {
    res.status(200).json({
        success: true,
        message: "Campaign found successfully",
        campaign: req.campaign,
    });
});

exports.UpdateCampaign = catchAsyncError(async (req, res, next) => {
    const { Name } = req.body;
    const campaign = req.campaign;

    if (!Name) {
        return next(new ErrorHandler("Please fill all the required fields.", 400));
    }    

    campaign.Name = Name;

    await campaign.save();

    res.status(200).json({
        success: true,
        message: "Campaign updated successfully",
        campaign,
    });
});

exports.DeleteCampaign = catchAsyncError(async (req , res , next) => {
    const campaign = req.campaign;

    await campaign.destroy();

    res.status(200).json({
        success: true,
        message: "Campaign deleted successfully",
    });
});

/* PEOPLE TAB */

exports.GetCampaignLeads = catchAsyncError(async (req , res , next) => {
    const campaign = req.campaign;

    const leads = await LeadModel.findAll({
        where: {
            CampaignId: campaign.id,
        },
    });

    res.status(200).json({
        success: true,
        message: "Leads found successfully",
        leads,
    });
});

/* SEQUENCE TAB */

exports.GetCampaignSequence = catchAsyncError(async (req , res , next) => {
    const campaign = req.campaign;

    const sequence = await SequenceModel.findOne({
        where: {
            CampaignId: campaign.id,
        },
    });

    res.status(200).json({
        success: true,
        message: "Sequence found successfully",
        sequence,
    });
});

exports.UpdateCampaignSequence = catchAsyncError(async (req , res , next) => {
    const { Emails } = req.body;
    const campaign = req.campaign;

    const sequence = await SequenceModel.findOne({
        where: {
            CampaignId: campaign.id,
        },
    });

    sequence.Emails = Emails;

    await sequence.save();

    res.status(200).json({
        success: true,
        message: "Sequence updated successfully",
        sequence,
    });
});

/* SCHEDULE TAB */

exports.GetCampaignSchedule = catchAsyncError(async (req , res , next) => {
    const campaign = req.campaign;

    const schedule = await ScheduleModel.findOne({
        where: {
            CampaignId: campaign.id,
        },
    });

    res.status(200).json({
        success: true,
        message: "Schedule found successfully",
        schedule,
    });
});

exports.UpdateCampaignSchedule = catchAsyncError(async (req , res , next) => {
    const { Schedule } = req.body;
    const campaign = req.campaign;

    const schedule = await ScheduleModel.findOne({
        where: {
            CampaignId: campaign.id,
        },
    });

    schedule.Schedule = Schedule;

    await schedule.save();

    res.status(200).json({
        success: true,
        message: "Schedule updated successfully",
        schedule,
    });
});

/* OPTIONS TAB */