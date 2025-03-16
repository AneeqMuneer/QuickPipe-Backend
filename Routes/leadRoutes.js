const express = require("express");
const { 
    createLead, 
    getAllLeads, 
    getLeadById, 
    updateLead, 
    deleteLead, 
    updateLeadStatus 
} = require("../Controller/leadController");
const { VerifyUser } = require("../Middleware/userAuth");

const router = express.Router();

// Create a new Lead
router.route("/CreateLead").post(VerifyUser,createLead);

// Get all Leads
router.route("/GetAllLeads").get(VerifyUser,getAllLeads);

// Get a single Lead by ID
router.route("/GetLead/:id").get(VerifyUser,getLeadById);

// Update Lead details
router.route("/UpdateLead/:id").post(VerifyUser,updateLead);

// Delete a Lead
router.route("/DeleteLead/:id").delete(VerifyUser,deleteLead);

// Update Lead Status
router.route("/UpdateLeadStatus/:id").patch(VerifyUser,updateLeadStatus);

module.exports = router;
