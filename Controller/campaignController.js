const CampaignModel = require("../Model/campaignModel");
const catchAsyncError = require("../Middleware/asyncError");

exports.CreateCampaign = catchAsyncError(async (req, res, next) => {
    const { Name } = req.body;

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
    const campaigns = await CampaignModel.findAll();

    res.status(200).json({
      success: true,
      data: campaigns,
    });
});

exports.GetCampaignById = catchAsyncError(async (req, res, next) => {
    const campaign = await CampaignModel.findByPk(req.params.id);
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

exports.UpdateCampaign = catchAsyncError(async (req, res) => {
    const { Name } = req.body;

    if (!Name) {
        return next(new ErrorHandler("Please fill all the required fields.", 400));
    }

    const campaign = await CampaignModel.findByPk(req.params.id);
    
    if (!campaign) {
        return next(new ErrorHandler("Campaign not found.", 404));
    }

    campaign.Name = Name;

    await campaign.save();

    res.status(200).json({
        success: true,
        message: "Campaign updated successfully",
        campaign,
    });
});

exports.DeleteCampaign = catchAsyncError(async (req, res) => {
    const campaign = await CampaignModel.findByPk(req.params.id);

    if (!campaign) {
        return next(new ErrorHandler("Campaign not found.", 404));
    }

    await campaign.destroy();

    res.status(200).json({
        success: true,
        message: "Campaign deleted successfully",
    });
});