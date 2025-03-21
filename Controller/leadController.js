const Lead = require("../Model/leadModel");
const catchAsyncError = require("../Middleware/asyncError");
const ErrorHandler = require("../Utils/errorHandler");
const axios = require('axios');
require('dotenv').config();
const APOLLO_API_KEY = process.env.APOLLO_API_KEY;
const APOLLO_API_URL = 'https://api.apollo.io/v1/people/search';

const getApolloHeaders = () => {
  return {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'X-Api-Key': APOLLO_API_KEY
  };
};

function extractTitleAndLocation(description) {
  // Common job title patterns - improved to capture standalone titles
  const titlePatterns = [
    // Standalone common titles
    /\b(Developer|Engineer|Architect|Designer|Analyst|Specialist|Manager|Director|Consultant)\b/i,

    // C-level executives
    /\b(CEO|CTO|CFO|COO|CMO|CIO|CHRO|CSO)\b/i,

    // Chief titles
    /\b(Chief\s+[A-Za-z]+(\s+Officer)?)\b/i,

    // VP titles
    /\b(VP|Vice\s+President)(\s+of)?\s+([A-Za-z]+(\s+[A-Za-z]+)?)\b/i,

    // Director titles
    /\b(Director)(\s+of)?\s+([A-Za-z]+(\s+[A-Za-z]+)?)\b/i,

    // Head titles
    /\b(Head)(\s+of)?\s+([A-Za-z]+(\s+[A-Za-z]+)?)\b/i,

    // Manager titles
    /\b(Manager)(\s+of)?\s+([A-Za-z]+(\s+[A-Za-z]+)?)\b/i,

    // Specialized roles
    /\b([A-Za-z]+)\s+(Engineer|Developer|Architect|Designer|Analyst|Specialist)\b/i,

    // Engineer/Developer with specialization
    /\b(([A-Za-z]+(\s+[A-Za-z]+)?)\s+)?(Engineer|Developer)\b/i
  ];

  // Common location patterns (city, state, country)
  const locationPatterns = [
    /\b([A-Za-z\s]+),\s+([A-Za-z]{2})\b/i, // City, State abbreviation
    /\b([A-Za-z\s]+),\s+([A-Za-z\s]+)\b/i, // City, State/Country
    /\b(in|at|from)\s+([A-Za-z\s]+),\s+([A-Za-z\s]+)\b/i, // in/at/from City, State/Country
    /\b(in|at|from)\s+([A-Za-z\s]+)\b/i // in/at/from Location
  ];

  let title = null;
  let location = null;

  // Extract title
  for (const pattern of titlePatterns) {
    const match = description.match(pattern);
    if (match) {
      title = match[0].trim();
      break;
    }
  }

  // Extract location
  for (const pattern of locationPatterns) {
    const match = description.match(pattern);
    if (match) {
      // If the pattern includes a preposition (in/at/from), grab the location part
      if (match[1] && (match[1].toLowerCase() === 'in' || match[1].toLowerCase() === 'at' || match[1].toLowerCase() === 'from')) {
        location = match.slice(2).join(', ').trim();
      } else {
        location = match[0].trim();
      }
      break;
    }
  }

  return { title, location };
}
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

exports.searchLeads = catchAsyncError(async (req, res, next) => {
  try {
    const { query, domain } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'No search query provided' });
    }

    // Extract title and location from the query
    const { title, location } = extractTitleAndLocation(query);
    console.log('Extracted title:', title);
    console.log('Extracted location:', location);

    console.log(process.env.APOLLO_API_KEY)
    // Prepare Apollo API parameters
    const apolloParams = {
      per_page: 5
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
        headers: getApolloHeaders()
      });

      // Return the results along with the extracted parameters
      return res.json({
        originalQuery: query,
        extractedParameters: {
          titles: title ? [title] : [],
          locations: location ? [location] : [],
          domains: domain ? [domain] : []
        },
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