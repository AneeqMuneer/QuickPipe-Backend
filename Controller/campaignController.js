const Campaign  = require("../Model/campaignModel");
const catchAsyncError = require("../Middleware/asyncError");

// ✅ Create a new campaign
exports.createCampaign = catchAsyncError(async (req, res,next) => {
  try {
    const campaign = await Campaign.create(req.body);
    res.status(201).json({ success: true, message: "Campaign created successfully", data: campaign });
  } catch (error) {
    console.error("Error creating campaign:", error);
    res.status(500).json({ success: false, message: "Internal Server Error", error });
  }
});

// ✅ Get all campaigns
exports.getAllCampaigns = catchAsyncError(async (req, res) => {
  try {
    const campaigns = await Campaign.findAll();
    res.status(200).json({ success: true, data: campaigns });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    res.status(500).json({ success: false, message: "Internal Server Error", error });
  }
});

// ✅ Get a single campaign by ID
exports.getCampaignById =catchAsyncError( async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    if (!campaign) return res.status(404).json({ success: false, message: "Campaign not found" });

    res.status(200).json({ success: true, data: campaign });
  } catch (error) {
    console.error("Error fetching campaign:", error);
    res.status(500).json({ success: false, message: "Internal Server Error", error });
  }
});

// ✅ Update a campaign
exports.updateCampaign =catchAsyncError( async (req, res) => {
  try {
    const [updated] = await Campaign.update(req.body, { where: { id: req.params.id } });

    if (!updated) return res.status(404).json({ success: false, message: "Campaign not found or no changes made" });

    res.status(200).json({ success: true, message: "Campaign updated successfully" });
  } catch (error) {
    console.error("Error updating campaign:", error);
    res.status(500).json({ success: false, message: "Internal Server Error", error });
  }
});

// ✅ Delete a campaign
exports.deleteCampaign =catchAsyncError( async (req, res) => {
  try {
    const deleted = await Campaign.destroy({ where: { id: req.params.id } });

    if (!deleted) return res.status(404).json({ success: false, message: "Campaign not found" });

    res.status(200).json({ success: true, message: "Campaign deleted successfully" });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    res.status(500).json({ success: false, message: "Internal Server Error", error });
  }
});
