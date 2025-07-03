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

            const { delivered, unique_opens, unique_clicks, opens, clicks } = statistics[0].metrics;

            MonthlyStatistics.push({
                Date: parseInt(date.split("-")[2]),
                Delivered: delivered,
                UniqueOpens: unique_opens,
                UniqueClicks: unique_clicks,
                Opens: opens,
                Clicks: clicks
            });
        });

        const TotalDelivered = MonthlyStatistics.reduce((acc, curr) => acc + curr.Delivered, 0);
        const TotalUniqueOpens = MonthlyStatistics.reduce((acc, curr) => acc + curr.UniqueOpens, 0);
        const TotalUniqueClicks = MonthlyStatistics.reduce((acc, curr) => acc + curr.UniqueClicks, 0);

        const OpenRate = (TotalUniqueOpens / TotalDelivered) * 100;
        const ClickRate = (TotalUniqueClicks / TotalDelivered) * 100;

        res.status(200).json({
            success: true,
            message: "Monthly statistics fetched successfully",
            Statistics: {
                Graph: MonthlyStatistics,
                OpenRate: isNaN(OpenRate) ? 0 : parseFloat(OpenRate.toFixed(2)),
                ClickRate: isNaN(ClickRate) ? 0 : parseFloat(ClickRate.toFixed(2)),
                SequenceStarted: 0,
                Opportunities: 0,
                Conversions: 0
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

    const url = `https://api.sendgrid.com/v3/categories/stats?start_date=${startDate}&end_date=${endDate}&categories=workspace1&aggregated_by=day`;

    const headers = {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
    };

    try {
        const { data: stats } = await axios.get(url, { headers });

        const QuarterlyStatistics = [
            { Quarter: 1, Delivered: 0, UniqueOpens: 0, UniqueClicks: 0, Opens: 0, Clicks: 0 },
            { Quarter: 2, Delivered: 0, UniqueOpens: 0, UniqueClicks: 0, Opens: 0, Clicks: 0 },
            { Quarter: 3, Delivered: 0, UniqueOpens: 0, UniqueClicks: 0, Opens: 0, Clicks: 0 },
            { Quarter: 4, Delivered: 0, UniqueOpens: 0, UniqueClicks: 0, Opens: 0, Clicks: 0 }
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

        res.status(200).json({
            success: true,
            message: "Quarterly statistics fetched successfully",
            Statistics: {
                Graph: QuarterlyStatistics,
                OpenRate: isNaN(OpenRate) ? 0 : parseFloat(OpenRate.toFixed(2)),
                ClickRate: isNaN(ClickRate) ? 0 : parseFloat(ClickRate.toFixed(2)),
                SequenceStarted: 0,
                Opportunities: 0,
                Conversions: 0
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

    const url = `https://api.sendgrid.com/v3/categories/stats?start_date=${startDate}&end_date=${endDate}&categories=workspace1&aggregated_by=day`;

    const headers = {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
    };

    try {
        const { data: stats } = await axios.get(url, { headers });

        const YearlyStatistics = [
            { Month: 1, Delivered: 0, UniqueOpens: 0, UniqueClicks: 0, Opens: 0, Clicks: 0 },
            { Month: 2, Delivered: 0, UniqueOpens: 0, UniqueClicks: 0, Opens: 0, Clicks: 0 },
            { Month: 3, Delivered: 0, UniqueOpens: 0, UniqueClicks: 0, Opens: 0, Clicks: 0 },
            { Month: 4, Delivered: 0, UniqueOpens: 0, UniqueClicks: 0, Opens: 0, Clicks: 0 },
            { Month: 5, Delivered: 0, UniqueOpens: 0, UniqueClicks: 0, Opens: 0, Clicks: 0 },
            { Month: 6, Delivered: 0, UniqueOpens: 0, UniqueClicks: 0, Opens: 0, Clicks: 0 },
            { Month: 7, Delivered: 0, UniqueOpens: 0, UniqueClicks: 0, Opens: 0, Clicks: 0 },
            { Month: 8, Delivered: 0, UniqueOpens: 0, UniqueClicks: 0, Opens: 0, Clicks: 0 },
            { Month: 9, Delivered: 0, UniqueOpens: 0, UniqueClicks: 0, Opens: 0, Clicks: 0 },
            { Month: 10, Delivered: 0, UniqueOpens: 0, UniqueClicks: 0, Opens: 0, Clicks: 0 },
            { Month: 11, Delivered: 0, UniqueOpens: 0, UniqueClicks: 0, Opens: 0, Clicks: 0 },
            { Month: 12, Delivered: 0, UniqueOpens: 0, UniqueClicks: 0, Opens: 0, Clicks: 0 }
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

        res.status(200).json({
            success: true,
            message: "Yearly statistics fetched successfully",
            Statistics: {
                Graph: YearlyStatistics,
                OpenRate: isNaN(OpenRate) ? 0 : parseFloat(OpenRate.toFixed(2)),
                ClickRate: isNaN(ClickRate) ? 0 : parseFloat(ClickRate.toFixed(2)),
                SequenceStarted: 0,
                Opportunities: 0,
                Conversions: 0
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