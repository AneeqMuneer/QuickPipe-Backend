const catchAsyncError = require("../Middleware/asyncError");
const ErrorHandler = require("../Utils/errorHandler");

const CampaignModel = require("../Model/campaignModel");
const LeadModel = require("../Model/leadModel");

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

    res.status(201).json({
        success: true,
        campaign,
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
    const campaign = await CampaignModel.findByPk(req.params.campaignid);
    const workspaceId = req.user.User.CurrentWorkspaceId;

    if (!campaign) {
        return next(new ErrorHandler("Campaign not found.", 404));
    }

    if (campaign.WorkspaceId !== workspaceId) {
        return next(new ErrorHandler("Invalid campaign.", 403));
    }

    res.status(200).json({
        success: true,
        message: "Campaign found successfully",
        campaign,
    });
});

exports.UpdateCampaign = catchAsyncError(async (req, res, next) => {
    const { Name } = req.body;
    const campaignId = req.params.campaignid;
    const workspaceId = req.user.User.CurrentWorkspaceId;
    
    const campaign = await CampaignModel.findByPk(campaignId);
    
    if (!campaign) {
        return next(new ErrorHandler("Campaign not found.", 404));
    }
    
    if (campaign.WorkspaceId !== workspaceId) {
      return next(new ErrorHandler("Invalid campaign.", 403));
    }

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
    const campaignId = req.params.campaignid;
    const workspaceId = req.user.User.CurrentWorkspaceId;
  
    const campaign = await CampaignModel.findByPk(campaignId);
      
    if (!campaign) {
        return next(new ErrorHandler("Campaign not found.", 404));
    }
    
    if (campaign.WorkspaceId !== workspaceId) {
      return next(new ErrorHandler("Invalid campaign.", 403));
    }

    await campaign.destroy();

    res.status(200).json({
        success: true,
        message: "Campaign deleted successfully",
    });
});

exports.GetCampaignLeads = catchAsyncError(async (req , res , next) => {
    const campaignId = req.params.campaignid;
    const workspaceId = req.user.User.CurrentWorkspaceId;

    const campaign = await CampaignModel.findByPk(campaignId);
    
    if (!campaign) {
        return next(new ErrorHandler("Campaign not found.", 404));
    }
    
    if (campaign.WorkspaceId !== workspaceId) {
      return next(new ErrorHandler("Invalid campaign.", 403));
    }

    const leads = await LeadModel.findAll({
        where: {
            CampaignId: campaignId,
        },
    });

    res.status(200).json({
        success: true,
        message: "Leads found successfully",
        leads,
    });
});