const express = require("express");
const router = express.Router();
const { CreateCampaign , GetAllCampaigns , GetCampaignById , UpdateCampaign , DeleteCampaign , GetCampaignLeads } = require("../Controller/campaignController");
const { VerifyUser } = require("../Middleware/userAuth");

router.post("/", VerifyUser , CreateCampaign);
router.get("/", VerifyUser , GetAllCampaigns);
router.get("/:campaignid", VerifyUser , GetCampaignById);
router.put("/:campaignid", VerifyUser , UpdateCampaign);
router.delete("/:campaignid", VerifyUser , DeleteCampaign);
router.get("/:campaignid/leads", VerifyUser , GetCampaignLeads);

module.exports = router;