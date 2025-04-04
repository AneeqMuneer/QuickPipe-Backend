const axios = require('axios');
const catchAsyncError = require("../Middleware/asyncError");
const ErrorHandler = require("../Utils/errorHandler");

require('dotenv').config();

const { ExtractTitleAndLocation } = require('../Utils/leadUtils');

const LeadModel = require("../Model/leadModel");
const CampaignModel = require("../Model/campaignModel");

exports.AddLeadsToCampaign = catchAsyncError(async (req, res, next) => {
    const { Leads , CampaignId } = req.body;

    if (!Leads || Leads.length === 0) {
        return next(new ErrorHandler("Please select at least one lead", 400));
    }

    if (!CampaignId) {
        return next(new ErrorHandler("Please select a campaign first", 400));
    }

    const campaign = await CampaignModel.findByPk(CampaignId);

    if (!campaign) {
        return next(new ErrorHandler("Campaign not found", 404));
    }

    if (campaign.WorkspaceId !== req.user.User.CurrentWorkspaceId) {
        return next(new ErrorHandler("Invalid Campaign", 403));
    }

    for (let i = 0; i < Leads.length; i++) {
        if (!Leads[i].Name) {
            return next(new ErrorHandler("Lead doesn't have a name", 400));
        }
        Leads[i].CampaignId = CampaignId;
    }

    const leads = await LeadModel.bulkCreate(Leads);

    res.status(201).json({
        success: true,
        message: "Lead created successfully",
        leads
    });
});

exports.GetAllLeads = catchAsyncError(async (req, res, next) => {
    const leads = await LeadModel.findAll();

    res.status(200).json({
      success: true,
      leads
    });
});

exports.GetLeadById = catchAsyncError(async (req, res, next) => {
    const { leadid } = req.params;
    const lead = await LeadModel.findByPk(leadid);

    if (!lead) {
      return next(new ErrorHandler("Lead not found", 404));
    }

    res.status(200).json({
      success: true,
      lead
    });
});

exports.UpdateLead = catchAsyncError(async (req, res, next) => {
    const { leadid } = req.params;
    const { Name, Email, Phone, Company, CampaignId, Website, Title, Location } = req.body;

    const Lead = await LeadModel.findByPk(leadid);

    if (!Lead) {
      return next(new ErrorHandler("Lead not found", 404));
    }

    await LeadModel.update({
      Name: Name.trim() || LeadModel.Name,
      Email: Email || LeadModel.Email,
      Phone: Phone || LeadModel.Phone,
      Company: Company || LeadModel.Company,
      CampaignId: CampaignId || LeadModel.CampaignId,
      Website: Website || LeadModel.Website,
      Title: Title || LeadModel.Title,
      Location: Location || LeadModel.Location,
    });

    res.status(200).json({
      success: true,
      message: "Lead updated successfully",
      Lead
    });
});

exports.DeleteLead = catchAsyncError(async (req, res, next) => {
    const { leadid } = req.params;
    const lead = await LeadModel.findByPk(leadid);

    if (!lead) {
      return next(new ErrorHandler("Lead not found", 404));
    }

    await leadModel.destroy();

    res.status(200).json({
      success: true,
      message: "Lead deleted successfully"
    });
});

exports.UpdateLeadStatus = catchAsyncError(async (req, res, next) => {
    const { leadid } = req.params;
    const { status } = req.body;

    const lead = await LeadModel.findByPk(leadid);

    if (!lead) {
      return next(new ErrorHandler("Lead not found", 404));
    }

    await LeadModel.update({ status });

    res.status(200).json({
      success: true,
      message: "Lead status updated successfully",
      lead
    });
});

exports.SearchLeads = catchAsyncError(async (req, res, next) => {
  try {
    const { query, domain, page = 1, per_page = 5 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'No search query provided' });
    }

    // Extract title and location from the query
    const { title, location } = ExtractTitleAndLocation(query);
    console.log('Extracted title:', title);
    console.log('Extracted location:', location);

    console.log(process.env.APOLLO_API_KEY);
    // Prepare Apollo API parameters
    const apolloParams = {
      per_page: parseInt(per_page),
      page: parseInt(page)
    };

    // Add extracted data as arrays (even if single values)
    if (title) apolloParams.person_titles = [title];
    if (location) apolloParams.person_locations = [location];
    if (domain) apolloParams.organization_domains = [domain];

    // Only proceed if we have at least one search parameter
    if (!title && !location && !domain) {
      return res.status(400).json({
        error: 'Could not extract any searchable information from query',
        query: query
      });
    }

    // Make a single call to Apollo API
    const APOLLO_API_URL = 'https://api.apollo.io/v1/mixed_people/search';

    try {
      const apolloResponse = await axios.get(APOLLO_API_URL, {
        params: apolloParams,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Api-Key': process.env.APOLLO_API_KEY,
        }
      });

      // Get pagination info from Apollo response
      const paginationInfo = {
        currentPage: parseInt(page),
        perPage: parseInt(per_page),
        totalResults: apolloResponse.data.pagination?.total_entries || 0,
        totalPages: apolloResponse.data.pagination?.total_pages || 1
      };

      // Return the results along with the extracted parameters and pagination info
      return res.json({
        originalQuery: query,
        extractedParameters: {
          titles: title ? [title] : [],
          locations: location ? [location] : [],
          domains: domain ? [domain] : []
        },
        pagination: paginationInfo,
        results: apolloResponse.data
      });

    } catch (error) {
      console.error('Apollo API error:', error.message);
      return res.status(500).json({
        error: 'Failed to retrieve data from Apollo API',
        details: error.message,
        extractedParameters: {
          titles: title ? [title] : [],
          locations: location ? [location] : [],
          domains: domain ? [domain] : []
        }
      });
    }
  } catch (error) {
    console.error('Error processing search:', error);
    return next(new ErrorHandler('Failed to process search query', 500));
  }
});