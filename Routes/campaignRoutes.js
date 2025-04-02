const express = require("express");
const router = express.Router();
const { createCampaign , getAllCampaigns , getCampaignById , updateCampaign , deleteCampaign } = require("../Controller/campaignController");
const { VerifyUser } = require("../Middleware/userAuth");

router.post("/", VerifyUser , createCampaign);
router.get("/", VerifyUser , getAllCampaigns);
router.get("/:id", VerifyUser , getCampaignById);
router.put("/:id", VerifyUser , updateCampaign);
router.delete("/:id", VerifyUser , deleteCampaign);

module.exports = router;