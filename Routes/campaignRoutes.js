const express = require("express");
const router = express.Router();
const { 
    CreateCampaign , GetAllCampaigns , GetCampaignById , 
    UpdateCampaign , DeleteCampaign , GetCampaignLeads , 
    GetCampaignSequence , UpdateCampaignSequence , GetCampaignSchedule , 
    UpdateCampaignSchedule , SendCampaignMail , GenerateAIEmail , 
    GenerateAISequence , ActivePauseCampaign , GenerateAISchedule ,
    RunCampaign , GetAllTimezones , CreateTemplate , GetAllTemplates
} = require("../Controller/campaignController");
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
router.post("/GenerateAIEmail/:campaignid/sequence", VerifyUser , VerifyCampaign , GenerateAIEmail);
router.post("/GenerateAISequence/:campaignid/sequence", VerifyUser , VerifyCampaign , GenerateAISequence);
router.post("/CreateTemplate/sequence", VerifyUser , CreateTemplate);
router.get("/GetAllTemplates/sequence", VerifyUser , GetAllTemplates);

router.get("/GetCampaignSchedule/:campaignid/schedule", VerifyUser , VerifyCampaign , GetCampaignSchedule);
router.put("/UpdateCampaignSchedule/:campaignid/schedule", VerifyUser , VerifyCampaign , UpdateCampaignSchedule);
router.post("/GenerateAISchedule/:campaignid/schedule", VerifyUser , VerifyCampaign , GenerateAISchedule);
router.get("/GetAllTimezones", GetAllTimezones);

module.exports = router;