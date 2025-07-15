const SgMail = require("@sendgrid/mail");
const axios = require("axios");

const ErrorHandler = require("../Utils/errorHandler");
const catchAsyncError = require("../Middleware/asyncError");

const WorkspaceModel = require("../Model/workspaceModel");
const CampaignModel = require("../Model/campaignModel");
const LeadModel = require("../Model/leadModel");

SgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.GetWorkspaceAnalyticsMonthly = catchAsyncError(async (req, res, next) => {
    const WorkspaceId = req.user.User.CurrentWorkspaceId;

    const Workspace = await WorkspaceModel.findByPk(WorkspaceId);

    if (!Workspace) {
        return next(new ErrorHandler("Workspace not found", 404));
    }

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const startDate = currentMonth < 10 ? `${currentYear}-0${currentMonth}-01` : `${currentYear}-${currentMonth}-01`;
    const endDate = currentMonth < 10 ? `${currentYear}-0${currentMonth}-${new Date(currentYear, currentMonth, 0).getDate()}` : `${currentYear}-${currentMonth}-${new Date(currentYear, currentMonth, 0).getDate()}`;

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    const url = `https://api.sendgrid.com/v3/categories/stats?start_date=${startDate}&end_date=${endDate}&categories=workspace1&aggregated_by=day`;

    const headers = {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
    };

    try {
        // Retrieving email statistics from SendGrid
        const { data: stats } = await axios.get(url, { headers });

        const MonthlyStatistics = [];

        stats.forEach(stat => {
            const { date, stats: statistics } = stat;

            const { delivered, unique_opens, unique_clicks, opens, clicks } = statistics[0].metrics;

            MonthlyStatistics.push({
                Date: parseInt(date.split("-")[2]),
                Delivered: delivered,
                UniqueOpens: unique_opens,
                UniqueClicks: unique_clicks,
                Opens: opens,
                Clicks: clicks,
                Opportunities: 0,
                Conversions: 0
            });
        });

        const TotalDelivered = MonthlyStatistics.reduce((acc, curr) => acc + curr.Delivered, 0);
        const TotalUniqueOpens = MonthlyStatistics.reduce((acc, curr) => acc + curr.UniqueOpens, 0);
        const TotalUniqueClicks = MonthlyStatistics.reduce((acc, curr) => acc + curr.UniqueClicks, 0);

        const OpenRate = (TotalUniqueOpens / TotalDelivered) * 100;
        const ClickRate = (TotalUniqueClicks / TotalDelivered) * 100;

        // Get leads data for analytics
        const Leads = await LeadModel.findAll({
            include: [{
                model: CampaignModel,
                where: { WorkspaceId },
                required: true
            }]
        });

        const Opportunities = Leads.filter(lead => lead.OpportunityTime !== null && lead.OpportunityTime >= startDateObj && lead.OpportunityTime <= endDateObj);
        const Conversions = Leads.filter(lead => lead.ConversionTime !== null && lead.ConversionTime >= startDateObj && lead.ConversionTime <= endDateObj);
        const ConversionMoney = Opportunities.reduce((acc, curr) => acc + curr.OpportunityAmount, 0);

        Opportunities.forEach(opportunity => {
            const date = opportunity.OpportunityTime.toISOString().split("T")[0];
            const index = MonthlyStatistics.findIndex(stat => stat.Date === parseInt(date.split("-")[2]));
            if (index !== -1) {
                MonthlyStatistics[index].Opportunities++;
            }
        });

        Conversions.forEach(conversion => {
            const date = conversion.ConversionTime.toISOString().split("T")[0];
            const index = MonthlyStatistics.findIndex(stat => stat.Date === parseInt(date.split("-")[2]));
            if (index !== -1) {
                MonthlyStatistics[index].Conversions++;
            }
        });

        // Get sequence data from SendGrid
        const { data: categories } = await axios.get("https://api.sendgrid.com/v3/categories?category=Campaign:&limit=500", { headers });

        const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        const campaignCategories = categories
            .map(item => item.category)
            .filter(category => {
                if (!category.startsWith("Campaign:")) return false;
                const suffix = category.slice(9);
                return uuidV4Regex.test(suffix);
            });

        res.status(200).json({
            success: true,
            message: "Monthly statistics fetched successfully",
            Statistics: {
                Graph: MonthlyStatistics,
                OpenRate: isNaN(OpenRate) ? 0 : parseFloat(OpenRate.toFixed(2)),
                ClickRate: isNaN(ClickRate) ? 0 : parseFloat(ClickRate.toFixed(2)),
                SequenceStarted: campaignCategories.length ? campaignCategories.length : 0,
                Opportunities: Opportunities ? Opportunities.length : 0,
                Conversions: Conversions ? Conversions.length : 0,
                Amount: ConversionMoney ? ConversionMoney : 0
            }
        });
    } catch (error) {
        console.error("SendGrid API Error:", error);

        if (error.response && error.response.data && error.response.data.errors) {
            return next(new ErrorHandler(error.response.data.errors[0].message, error.response.status || 500));
        } else if (error.response && error.response.data) {
            return next(new ErrorHandler(error.response.data.message || "SendGrid API error", error.response.status || 500));
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return next(new ErrorHandler("Unable to connect to SendGrid API", 503));
        } else {
            return next(new ErrorHandler(error.message || "An error occurred while fetching analytics", 500));
        }
    }
});

exports.GetWorkspaceAnalyticsQuarterly = catchAsyncError(async (req, res, next) => {
    const WorkspaceId = req.user.User.CurrentWorkspaceId;

    const Workspace = await WorkspaceModel.findByPk(WorkspaceId);

    if (!Workspace) {
        return next(new ErrorHandler("Workspace not found", 404));
    }

    const currentYear = new Date().getFullYear();
    const startDate = `${currentYear}-01-01`;
    const endDate = `${currentYear}-12-31`;

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    const url = `https://api.sendgrid.com/v3/categories/stats?start_date=${startDate}&end_date=${endDate}&categories=workspace1&aggregated_by=day`;

    const headers = {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
    };

    try {
        // Retrieving email statistics from SendGrid
        const { data: stats } = await axios.get(url, { headers });

        const QuarterlyStatistics = [
            { Quarter: 1, Delivered: 0, UniqueOpens: 0, UniqueClicks: 0, Opens: 0, Clicks: 0, Opportunities: 0, Conversions: 0 },
            { Quarter: 2, Delivered: 0, UniqueOpens: 0, UniqueClicks: 0, Opens: 0, Clicks: 0, Opportunities: 0, Conversions: 0 },
            { Quarter: 3, Delivered: 0, UniqueOpens: 0, UniqueClicks: 0, Opens: 0, Clicks: 0, Opportunities: 0, Conversions: 0 },
            { Quarter: 4, Delivered: 0, UniqueOpens: 0, UniqueClicks: 0, Opens: 0, Clicks: 0, Opportunities: 0, Conversions: 0 }
        ];

        stats.forEach(stat => {
            const { date, stats: statistics } = stat;

            const { delivered, unique_opens, unique_clicks, opens, clicks } = statistics[0].metrics;

            const quarter = Math.ceil((new Date(date).getMonth() + 1) / 3) - 1;

            QuarterlyStatistics[quarter].Delivered += delivered;
            QuarterlyStatistics[quarter].UniqueOpens += unique_opens;
            QuarterlyStatistics[quarter].UniqueClicks += unique_clicks;
            QuarterlyStatistics[quarter].Opens += opens;
            QuarterlyStatistics[quarter].Clicks += clicks;
        });

        const TotalDelivered = QuarterlyStatistics.reduce((acc, curr) => acc + curr.Delivered, 0);
        const TotalUniqueOpens = QuarterlyStatistics.reduce((acc, curr) => acc + curr.UniqueOpens, 0);
        const TotalUniqueClicks = QuarterlyStatistics.reduce((acc, curr) => acc + curr.UniqueClicks, 0);

        const OpenRate = (TotalUniqueOpens / TotalDelivered) * 100;
        const ClickRate = (TotalUniqueClicks / TotalDelivered) * 100;

        // Get leads data for analytics
        const Leads = await LeadModel.findAll({
            include: [{
                model: CampaignModel,
                where: { WorkspaceId },
                required: true
            }]
        });

        const Opportunities = Leads.filter(lead => lead.OpportunityTime !== null && lead.OpportunityTime >= startDateObj && lead.OpportunityTime <= endDateObj);
        const Conversions = Leads.filter(lead => lead.ConversionTime !== null && lead.ConversionTime >= startDateObj && lead.ConversionTime <= endDateObj);
        const ConversionMoney = Opportunities.reduce((acc, curr) => acc + curr.OpportunityAmount, 0);

        Opportunities.forEach(opportunity => {
            const quarter = Math.ceil((new Date(opportunity.OpportunityTime).getMonth() + 1) / 3) - 1;
            QuarterlyStatistics[quarter].Opportunities++;
        });

        Conversions.forEach(conversion => {
            const quarter = Math.ceil((new Date(conversion.ConversionTime).getMonth() + 1) / 3) - 1;
            QuarterlyStatistics[quarter].Conversions++;
        });

        // Get sequence data from SendGrid
        const { data: categories } = await axios.get("https://api.sendgrid.com/v3/categories?category=Campaign:&limit=500", { headers });

        const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        const campaignCategories = categories
            .map(item => item.category)
            .filter(category => {
                if (!category.startsWith("Campaign:")) return false;
                const suffix = category.slice(9);
                return uuidV4Regex.test(suffix);
            });

        res.status(200).json({
            success: true,
            message: "Quarterly statistics fetched successfully",
            Statistics: {
                Graph: QuarterlyStatistics,
                OpenRate: isNaN(OpenRate) ? 0 : parseFloat(OpenRate.toFixed(2)),
                ClickRate: isNaN(ClickRate) ? 0 : parseFloat(ClickRate.toFixed(2)),
                SequenceStarted: campaignCategories.length ? campaignCategories.length : 0,
                Opportunities: Opportunities ? Opportunities.length : 0,
                Conversions: Conversions ? Conversions.length : 0,
                Amount: ConversionMoney ? ConversionMoney : 0
            }
        });
    } catch (error) {
        console.error("SendGrid API Error:", error);

        if (error.response && error.response.data && error.response.data.errors) {
            return next(new ErrorHandler(error.response.data.errors[0].message, error.response.status || 500));
        } else if (error.response && error.response.data) {
            return next(new ErrorHandler(error.response.data.message || "SendGrid API error", error.response.status || 500));
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return next(new ErrorHandler("Unable to connect to SendGrid API", 503));
        } else {
            return next(new ErrorHandler(error.message || "An error occurred while fetching analytics", 500));
        }
    }
});

exports.GetWorkspaceAnalyticsYearly = catchAsyncError(async (req, res, next) => {
    const WorkspaceId = req.user.User.CurrentWorkspaceId;

    const Workspace = await WorkspaceModel.findByPk(WorkspaceId);

    if (!Workspace) {
        return next(new ErrorHandler("Workspace not found", 404));
    }

    const currentYear = new Date().getFullYear();
    const startDate = `${currentYear}-01-01`;
    const endDate = `${currentYear}-12-31`;

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    const url = `https://api.sendgrid.com/v3/categories/stats?start_date=${startDate}&end_date=${endDate}&categories=workspace1&aggregated_by=day`;

    const headers = {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
    };

    try {
        // Retrieving email statistics from SendGrid
        const { data: stats } = await axios.get(url, { headers });

        const YearlyStatistics = [
            { Month: 1, Delivered: 0, UniqueOpens: 0, UniqueClicks: 0, Opens: 0, Clicks: 0, Opportunities: 0, Conversions: 0 },
            { Month: 2, Delivered: 0, UniqueOpens: 0, UniqueClicks: 0, Opens: 0, Clicks: 0, Opportunities: 0, Conversions: 0 },
            { Month: 3, Delivered: 0, UniqueOpens: 0, UniqueClicks: 0, Opens: 0, Clicks: 0, Opportunities: 0, Conversions: 0 },
            { Month: 4, Delivered: 0, UniqueOpens: 0, UniqueClicks: 0, Opens: 0, Clicks: 0, Opportunities: 0, Conversions: 0 },
            { Month: 5, Delivered: 0, UniqueOpens: 0, UniqueClicks: 0, Opens: 0, Clicks: 0, Opportunities: 0, Conversions: 0 },
            { Month: 6, Delivered: 0, UniqueOpens: 0, UniqueClicks: 0, Opens: 0, Clicks: 0, Opportunities: 0, Conversions: 0 },
            { Month: 7, Delivered: 0, UniqueOpens: 0, UniqueClicks: 0, Opens: 0, Clicks: 0, Opportunities: 0, Conversions: 0 },
            { Month: 8, Delivered: 0, UniqueOpens: 0, UniqueClicks: 0, Opens: 0, Clicks: 0, Opportunities: 0, Conversions: 0 },
            { Month: 9, Delivered: 0, UniqueOpens: 0, UniqueClicks: 0, Opens: 0, Clicks: 0, Opportunities: 0, Conversions: 0 },
            { Month: 10, Delivered: 0, UniqueOpens: 0, UniqueClicks: 0, Opens: 0, Clicks: 0, Opportunities: 0, Conversions: 0 },
            { Month: 11, Delivered: 0, UniqueOpens: 0, UniqueClicks: 0, Opens: 0, Clicks: 0, Opportunities: 0, Conversions: 0 },
            { Month: 12, Delivered: 0, UniqueOpens: 0, UniqueClicks: 0, Opens: 0, Clicks: 0, Opportunities: 0, Conversions: 0 }
        ];

        stats.forEach(stat => {
            const { date, stats: statistics } = stat;

            const { delivered, unique_opens, unique_clicks, opens, clicks } = statistics[0].metrics;

            const month = new Date(date).getMonth();

            YearlyStatistics[month].Delivered += delivered;
            YearlyStatistics[month].UniqueOpens += unique_opens;
            YearlyStatistics[month].UniqueClicks += unique_clicks;
            YearlyStatistics[month].Opens += opens;
            YearlyStatistics[month].Clicks += clicks;
        });

        const TotalDelivered = YearlyStatistics.reduce((acc, curr) => acc + curr.Delivered, 0);
        const TotalUniqueOpens = YearlyStatistics.reduce((acc, curr) => acc + curr.UniqueOpens, 0);
        const TotalUniqueClicks = YearlyStatistics.reduce((acc, curr) => acc + curr.UniqueClicks, 0);

        const OpenRate = (TotalUniqueOpens / TotalDelivered) * 100;
        const ClickRate = (TotalUniqueClicks / TotalDelivered) * 100;

        // Get leads data for analytics
        const Leads = await LeadModel.findAll({
            include: [{
                model: CampaignModel,
                where: { WorkspaceId },
                required: true
            }]
        });

        const Opportunities = Leads.filter(lead => lead.OpportunityTime !== null && lead.OpportunityTime >= startDateObj && lead.OpportunityTime <= endDateObj);
        const Conversions = Leads.filter(lead => lead.ConversionTime !== null && lead.ConversionTime >= startDateObj && lead.ConversionTime <= endDateObj);
        const ConversionMoney = Opportunities.reduce((acc, curr) => acc + curr.OpportunityAmount, 0);

        Opportunities.forEach(opportunity => {
            const month = new Date(opportunity.OpportunityTime).getMonth() - 1;
            YearlyStatistics[month].Opportunities++;
        });

        Conversions.forEach(conversion => {
            const month = new Date(conversion.ConversionTime).getMonth() - 1;
            YearlyStatistics[month].Conversions++;
        });

        // Get sequence data from SendGrid
        const { data: categories } = await axios.get("https://api.sendgrid.com/v3/categories?category=Campaign:&limit=500", { headers });

        const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        const campaignCategories = categories
            .map(item => item.category)
            .filter(category => {
                if (!category.startsWith("Campaign:")) return false;
                const suffix = category.slice(9);
                return uuidV4Regex.test(suffix);
            });

        res.status(200).json({
            success: true,
            message: "Yearly statistics fetched successfully",
            Statistics: {
                Graph: YearlyStatistics,
                OpenRate: isNaN(OpenRate) ? 0 : parseFloat(OpenRate.toFixed(2)),
                ClickRate: isNaN(ClickRate) ? 0 : parseFloat(ClickRate.toFixed(2)),
                SequenceStarted: campaignCategories.length ? campaignCategories.length : 0,
                Opportunities: Opportunities ? Opportunities.length : 0,
                Conversions: Conversions ? Conversions.length : 0,
                Amount: ConversionMoney ? ConversionMoney : 0
            }
        });
    } catch (error) {
        console.error("SendGrid API Error:", error);

        if (error.response && error.response.data && error.response.data.errors) {
            return next(new ErrorHandler(error.response.data.errors[0].message, error.response.status || 500));
        } else if (error.response && error.response.data) {
            return next(new ErrorHandler(error.response.data.message || "SendGrid API error", error.response.status || 500));
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return next(new ErrorHandler("Unable to connect to SendGrid API", 503));
        } else {
            return next(new ErrorHandler(error.message || "An error occurred while fetching analytics", 500));
        }
    }
});