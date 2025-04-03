const express = require("express");
const router = express.Router();
const { CreateCampaign , GetAllCampaigns , GetCampaignById , UpdateCampaign , DeleteCampaign , GetCampaignLeads } = require("../Controller/campaignController");
const { VerifyUser } = require("../Middleware/userAuth");

router.post("/CreateCampaign", VerifyUser , CreateCampaign);
router.get("/GetAllCampaigns", VerifyUser , GetAllCampaigns);
router.get("/GetCampaignById/:campaignid", VerifyUser , GetCampaignById);
router.put("/UpdateCampaign/:campaignid", VerifyUser , UpdateCampaign);
router.delete("/DeleteCampaign/:campaignid", VerifyUser , DeleteCampaign);
router.get("/GetCampaignLeads/:campaignid", VerifyUser , GetCampaignLeads);

module.exports = router;