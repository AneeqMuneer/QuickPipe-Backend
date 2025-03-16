const Lead = require("../Model/leadModel");
const catchAsyncError = require("../Middleware/asyncError");
const ErrorHandler = require("../Utils/errorHandler");

// Create a new Lead
exports.createLead = catchAsyncError(async (req, res, next) => {
    const { name, email, phone, company, campaignId, website, title, location, employeeCount } = req.body;

    if (!name) {
        return next(new ErrorHandler("Lead name is required", 400));
    }

    const lead = await Lead.create({
        name,
        email,
        phone,
        company,
        campaignId,
        website,
        title,
        location,
        employeeCount
    });

    res.status(201).json({
        success: true,
        message: "Lead created successfully",
        lead
    });
});

// Get all Leads
exports.getAllLeads = catchAsyncError(async (req, res, next) => {
    const leads = await Lead.findAll();
    res.status(200).json({
        success: true,
        leads
    });
});

// Get a single Lead by ID
exports.getLeadById = catchAsyncError(async (req, res, next) => {
    const { id } = req.params;
    const lead = await Lead.findByPk(id);

    if (!lead) {
        return next(new ErrorHandler("Lead not found", 404));
    }

    res.status(200).json({
        success: true,
        lead
    });
});

// Update Lead details
exports.updateLead = catchAsyncError(async (req, res, next) => {
    const { id } = req.params;
    const { name, email, phone, company, campaignId, website, title, location, employeeCount } = req.body;

    const lead = await Lead.findByPk(id);

    if (!lead) {
        return next(new ErrorHandler("Lead not found", 404));
    }

    await lead.update({
        name,
        email,
        phone,
        company,
        campaignId,
        website,
        title,
        location,
        employeeCount
    });

    res.status(200).json({
        success: true,
        message: "Lead updated successfully",
        lead
    });
});

// Delete a Lead
exports.deleteLead = catchAsyncError(async (req, res, next) => {
    const { id } = req.params;
    const lead = await Lead.findByPk(id);

    if (!lead) {
        return next(new ErrorHandler("Lead not found", 404));
    }

    await lead.destroy();

    res.status(200).json({
        success: true,
        message: "Lead deleted successfully"
    });
});

// Update Lead Status
exports.updateLeadStatus = catchAsyncError(async (req, res, next) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
        "Discovery",
        "Evaluation",
        "Proposal",
        "Negotiation",
        "Commit",
        "Closed"
    ];

    if (!validStatuses.includes(status)) {
        return next(new ErrorHandler("Invalid status value", 400));
    }

    const lead = await Lead.findByPk(id);
    if (!lead) {
        return next(new ErrorHandler("Lead not found", 404));
    }

    await lead.update({ status });

    res.status(200).json({
        success: true,
        message: "Lead status updated successfully",
        lead
    });
});
