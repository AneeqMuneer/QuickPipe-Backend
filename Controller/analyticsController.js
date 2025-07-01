const SgMail = require("@sendgrid/mail");
const axios = require("axios");

const ErrorHandler = require("../Utils/errorHandler");
const catchAsyncError = require("../Middleware/asyncError");

const WorkspaceModel = require("../Model/workspaceModel");

SgMail.setApiKey(process.env.SENDGRID_API_KEY);

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
        // Fetching sendgrid metrics
        const { data: stats } = await axios.get(url, { headers });

        const quarters = [
            { delivered: 0, opens: 0, clicks: 0 },
            { delivered: 0, opens: 0, clicks: 0 },
            { delivered: 0, opens: 0, clicks: 0 },
            { delivered: 0, opens: 0, clicks: 0 }
        ];

        stats.forEach(stat => {
            const { date, stats: sList } = stat;
            const entry = sList.find(s => s.name === WorkspaceId);
            if (!entry) return;

            const { delivered, unique_opens, unique_clicks } = entry.metrics;
            const month = new Date(date).getMonth();

            const qIndex = Math.floor(month / 3);
            quarters[qIndex].delivered += delivered;
            quarters[qIndex].opens += unique_opens;
            quarters[qIndex].clicks += unique_clicks;
        });

        const QuarterlyStatistics = quarters.map((q, i) => ({
            quarter: i + 1,
            Sents: q.delivered,
            Opens: q.opens,
            Clicks: q.clicks
        }));

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


});