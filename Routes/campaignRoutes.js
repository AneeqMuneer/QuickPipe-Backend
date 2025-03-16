const express = require("express");
const router = express.Router();
const campaignController = require("../Controller/campaignController");
const { VerifyUser } = require("../Middleware/userAuth");

router.post("/", VerifyUser,campaignController.createCampaign);
router.get("/", VerifyUser,campaignController.getAllCampaigns);
router.get("/:id", VerifyUser,campaignController.getCampaignById);
router.put("/:id", VerifyUser,campaignController.updateCampaign);
router.delete("/:id", VerifyUser,campaignController.deleteCampaign);

module.exports = router;
