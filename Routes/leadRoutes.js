const express = require("express");
const { 
    createLead, 
    getAllLeads, 
    getLeadById, 
    updateLead, 
    deleteLead, 
    updateLeadStatus, 
    searchLeads
} = require("../Controller/leadController");
const { VerifyUser } = require("../Middleware/userAuth");

const router = express.Router();

router.route("/CreateLead").post(VerifyUser,createLead);
router.route("/GetAllLeads").get(VerifyUser,getAllLeads);
router.route("/GetLead/:id").get(VerifyUser,getLeadById);
router.route("/UpdateLead/:id").post(VerifyUser,updateLead);
router.route("/DeleteLead/:id").delete(VerifyUser,deleteLead);
router.route("/UpdateLeadStatus/:id").patch(VerifyUser,updateLeadStatus);
router.route('/searchLeads').post(VerifyUser,searchLeads);

module.exports = router;
