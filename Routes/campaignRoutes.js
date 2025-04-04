const express = require("express");
const router = express.Router();
const { CreateCampaign , GetAllCampaigns , GetCampaignById , UpdateCampaign , DeleteCampaign , GetCampaignLeads , GetCampaignSequence , UpdateCampaignSequence , GetCampaignSchedule , UpdateCampaignSchedule } = require("../Controller/campaignController");
const { VerifyUser } = require("../Middleware/userAuth");
const { VerifyCampaign } = require("../Middleware/campaignAuth");

router.post("/CreateCampaign", VerifyUser , CreateCampaign);
router.get("/GetAllCampaigns", VerifyUser , GetAllCampaigns);
router.get("/GetCampaignById/:campaignid", VerifyUser , VerifyCampaign , GetCampaignById);
router.put("/UpdateCampaign/:campaignid", VerifyUser , VerifyCampaign , UpdateCampaign);
router.delete("/DeleteCampaign/:campaignid", VerifyUser , VerifyCampaign , DeleteCampaign);

router.get("/GetCampaignLeads/:campaignid/people", VerifyUser , VerifyCampaign , GetCampaignLeads);

router.get("/GetCampaignSequence/:campaignid/sequence", VerifyUser , VerifyCampaign , GetCampaignSequence);
router.put("/UpdateCampaignSequence/:campaignid/sequence", VerifyUser , VerifyCampaign , UpdateCampaignSequence);

router.get("/GetCampaignSchedule/:campaignid/schedule", VerifyUser , VerifyCampaign , GetCampaignSchedule);
router.put("/UpdateCampaignSchedule/:campaignid/schedule", VerifyUser , VerifyCampaign , UpdateCampaignSchedule);

module.exports = router;