const express = require("express");
const router = express.Router();
const { 
    CreateCampaign , GetAllCampaigns , GetCampaignById , 
    UpdateCampaign , DeleteCampaign , GetCampaignLeads , 
    GetCampaignSequence , UpdateCampaignSequence , GetCampaignSchedule , 
    UpdateCampaignSchedule , SendCampaignMail , GenerateAIEmail , 
    GenerateAISequence , ActivePauseCampaign , GenerateAISchedule ,
    RunCampaign } = require("../Controller/campaignController");
const { VerifyUser } = require("../Middleware/userAuth");
const { VerifyCampaign } = require("../Middleware/campaignAuth");

router.post("/CreateCampaign", VerifyUser , CreateCampaign);
router.get("/GetAllCampaigns", VerifyUser , GetAllCampaigns);
router.get("/GetCampaignById/:campaignid", VerifyUser , VerifyCampaign , GetCampaignById);
router.put("/UpdateCampaign/:campaignid", VerifyUser , VerifyCampaign , UpdateCampaign);
router.delete("/DeleteCampaign/:campaignid", VerifyUser , VerifyCampaign , DeleteCampaign);
router.put("/ActivePauseCampaign/:campaignid", VerifyUser , VerifyCampaign , ActivePauseCampaign);
router.put("/RunCampaign/:campaignid", VerifyUser , VerifyCampaign , RunCampaign);

router.get("/GetCampaignLeads/:campaignid/people", VerifyUser , VerifyCampaign , GetCampaignLeads);

router.get("/GetCampaignSequence/:campaignid/sequence", VerifyUser , VerifyCampaign , GetCampaignSequence);
router.put("/UpdateCampaignSequence/:campaignid/sequence", VerifyUser , VerifyCampaign , UpdateCampaignSequence);
router.put("/SendCampaignMail/:campaignid/sequence", VerifyUser , VerifyCampaign , SendCampaignMail);
router.get("/GenerateAIEmail/:campaignid/sequence", VerifyUser , VerifyCampaign , GenerateAIEmail);
router.get("/GenerateAISequence/:campaignid/sequence", VerifyUser , VerifyCampaign , GenerateAISequence);

router.get("/GetCampaignSchedule/:campaignid/schedule", VerifyUser , VerifyCampaign , GetCampaignSchedule);
router.put("/UpdateCampaignSchedule/:campaignid/schedule", VerifyUser , VerifyCampaign , UpdateCampaignSchedule);
router.get("/GenerateAISchedule/:campaignid/schedule", VerifyUser , VerifyCampaign , GenerateAISchedule);

module.exports = router;