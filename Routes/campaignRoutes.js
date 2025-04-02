const express = require("express");
const router = express.Router();
const { CreateCampaign , GetAllCampaigns , GetCampaignById , UpdateCampaign , DeleteCampaign } = require("../Controller/campaignController");
const { VerifyUser } = require("../Middleware/userAuth");

router.post("/campaign", VerifyUser , CreateCampaign);
router.get("/campaign", VerifyUser , GetAllCampaigns);
router.get("/campaign/:id", VerifyUser , GetCampaignById);
router.put("/campaign/:id", VerifyUser , UpdateCampaign);
router.delete("/campaign/:id", VerifyUser , DeleteCampaign);

module.exports = router;