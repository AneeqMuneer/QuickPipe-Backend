const SgMail = require("@sendgrid/mail");
const axios = require("axios");

const ErrorHandler = require("../Utils/errorHandler");
const catchAsyncError = require("../Middleware/asyncError");

const WorkspaceModel = require("../Model/workspaceModel");

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

    const url = `https://api.sendgrid.com/v3/categories/stats?start_date=${startDate}&end_date=${endDate}&categories=workspace1&aggregated_by=day`;

    const headers = {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
    };

    try {
        const { data: stats } = await axios.get(url, { headers });

        const MonthlyStatistics = [];

        stats.forEach(stat => {
            const { date, stats: statistics } = stat;

            const { delivered, unique_opens, unique_clicks } = statistics[0].metrics;

            MonthlyStatistics.push({
                Date: parseInt(date.split("-")[2]),
                Delivered: delivered,
                Opens: unique_opens,
                Clicks: unique_clicks
            });
        });

        res.status(200).json({
            success: true,
            message: "Monthly statistics fetched successfully",
            MonthlyStatistics
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

    const url = `https://api.sendgrid.com/v3/categories/stats?start_date=${startDate}&end_date=${endDate}&categories=workspace1&aggregated_by=day`;

    const headers = {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
    };

    try {
        const { data: stats } = await axios.get(url, { headers });

        const QuarterlyStatistics = [
            { Quarter: 1, Delivered: 0, Opens: 0, Clicks: 0 },
            { Quarter: 2, Delivered: 0, Opens: 0, Clicks: 0 },
            { Quarter: 3, Delivered: 0, Opens: 0, Clicks: 0 },
            { Quarter: 4, Delivered: 0, Opens: 0, Clicks: 0 }
        ];

        stats.forEach(stat => {
            const { date, stats: statistics } = stat;

            const { delivered, unique_opens, unique_clicks } = statistics[0].metrics;

            const quarter = Math.ceil((new Date(date).getMonth() + 1) / 3) - 1;

            QuarterlyStatistics[quarter].Delivered += delivered;
            QuarterlyStatistics[quarter].Opens += unique_opens;
            QuarterlyStatistics[quarter].Clicks += unique_clicks;
        });

        res.status(200).json({
            success: true,
            message: "Quarterly statistics fetched successfully",
            QuarterlyStatistics
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

    const url = `https://api.sendgrid.com/v3/categories/stats?start_date=${startDate}&end_date=${endDate}&categories=workspace1&aggregated_by=day`;

    const headers = {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
    };

    try {
        const { data: stats } = await axios.get(url, { headers });

        const YearlyStatistics = [
            { Month: 1, Delivered: 0, Opens: 0, Clicks: 0 },
            { Month: 2, Delivered: 0, Opens: 0, Clicks: 0 },
            { Month: 3, Delivered: 0, Opens: 0, Clicks: 0 },
            { Month: 4, Delivered: 0, Opens: 0, Clicks: 0 },
            { Month: 5, Delivered: 0, Opens: 0, Clicks: 0 },
            { Month: 6, Delivered: 0, Opens: 0, Clicks: 0 },
            { Month: 7, Delivered: 0, Opens: 0, Clicks: 0 },
            { Month: 8, Delivered: 0, Opens: 0, Clicks: 0 },
            { Month: 9, Delivered: 0, Opens: 0, Clicks: 0 },
            { Month: 10, Delivered: 0, Opens: 0, Clicks: 0 },
            { Month: 11, Delivered: 0, Opens: 0, Clicks: 0 },
            { Month: 12, Delivered: 0, Opens: 0, Clicks: 0 }
        ];

        stats.forEach(stat => {
            const { date, stats: statistics } = stat;

            const { delivered, unique_opens, unique_clicks } = statistics[0].metrics;

            const month = new Date(date).getMonth();

            YearlyStatistics[month].Delivered += delivered;
            YearlyStatistics[month].Opens += unique_opens;
            YearlyStatistics[month].Clicks += unique_clicks;
        });

        res.status(200).json({
            success: true,
            message: "Yearly statistics fetched successfully",
            YearlyStatistics
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