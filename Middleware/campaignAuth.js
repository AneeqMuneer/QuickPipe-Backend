const asyncError = require("../Middleware/asyncError.js");
const ErrorHandler = require("../Utils/errorHandler");
const CampaignModel = require("../Model/campaignModel.js");

exports.VerifyCampaign = asyncError(async (req, res, next) => {
    const campaignId = req.params.campaignid;
    const workspaceId = req.user.User.CurrentWorkspaceId;

    const campaign = await CampaignModel.findByPk(campaignId);
    
    if (!campaign) {
        return next(new ErrorHandler("Campaign not found.", 404));
    }
    
    if (campaign.WorkspaceId !== workspaceId) {
      return next(new ErrorHandler("Invalid campaign.", 403));
    }

    req.campaign = campaign;
    next();
});