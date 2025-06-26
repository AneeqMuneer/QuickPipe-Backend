const express = require("express");
const router = express.Router();
const { 
    CreateCampaign , GetAllCampaigns , GetCampaignById , 
    UpdateCampaign , DeleteCampaign , GetCampaignLeads , 
    GetCampaignSequence , UpdateCampaignSequence , GetCampaignSchedule , 
    UpdateCampaignSchedule , SendCampaignMail , GenerateAIEmail , 
    GenerateAISequence , ActivePauseCampaign , GenerateAISchedule ,
    RunCampaign , GetAllTimezones , CreateTemplate , GetAllTemplates,
    SendGoogleMail
} = require("../Controller/campaignController");
const { VerifyUser } = require("../Middleware/userAuth");
const { VerifyCampaign } = require("../Middleware/campaignAuth");

router.route("/CreateCampaign").post(VerifyUser , CreateCampaign);
router.route("/GetAllCampaigns").get(VerifyUser , GetAllCampaigns);
router.route("/GetCampaignById/:campaignid").get(VerifyUser , VerifyCampaign , GetCampaignById);
router.route("/UpdateCampaign/:campaignid").put(VerifyUser , VerifyCampaign , UpdateCampaign);
router.route("/DeleteCampaign/:campaignid").delete(VerifyUser , VerifyCampaign , DeleteCampaign);
router.route("/ActivePauseCampaign/:campaignid").put(VerifyUser , VerifyCampaign , ActivePauseCampaign);
router.route("/RunCampaign/:campaignid").put(VerifyUser , VerifyCampaign , RunCampaign);

router.route("/GetCampaignLeads/:campaignid/people").get(VerifyUser , VerifyCampaign , GetCampaignLeads);

router.route("/GetCampaignSequence/:campaignid/sequence").get(VerifyUser , VerifyCampaign , GetCampaignSequence);
router.route("/UpdateCampaignSequence/:campaignid/sequence").put(VerifyUser , VerifyCampaign , UpdateCampaignSequence);
router.route("/SendCampaignMail/:campaignid/sequence").put(VerifyUser , VerifyCampaign , SendCampaignMail);
router.route("/GenerateAIEmail/:campaignid/sequence").post(VerifyUser , VerifyCampaign , GenerateAIEmail);
router.route("/GenerateAISequence/:campaignid/sequence").post(VerifyUser , VerifyCampaign , GenerateAISequence);
router.route("/CreateTemplate/sequence").post(VerifyUser , CreateTemplate);
router.route("/GetAllTemplates/sequence").get(VerifyUser , GetAllTemplates);

router.route("/GetCampaignSchedule/:campaignid/schedule").get(VerifyUser , VerifyCampaign , GetCampaignSchedule);
router.route("/UpdateCampaignSchedule/:campaignid/schedule").put(VerifyUser , VerifyCampaign , UpdateCampaignSchedule);
router.route("/GenerateAISchedule/:campaignid/schedule").post(VerifyUser , VerifyCampaign , GenerateAISchedule);
router.route("/GetAllTimezones").get(GetAllTimezones);

router.route("/SendGoogleMail").post(VerifyUser , SendGoogleMail);

module.exports = router;