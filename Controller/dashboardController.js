const SgMail = require("@sendgrid/mail");
const axios = require("axios");

const ErrorHandler = require("../Utils/errorHandler");
const catchAsyncError = require("../Middleware/asyncError");
const { Op } = require("sequelize");

const LeadModel = require("../Model/leadModel");
const CampaignModel = require("../Model/campaignModel");
const EmailAccountModel = require("../Model/emailAccountModel");

const { GetWeekStartAndEndDate } = require("../Utils/dashboardUtils");

SgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.SummaryWidget = catchAsyncError(async (req, res, next) => {
    const WorkspaceId = req.user.User.CurrentWorkspaceId;

    // Retrieving all active email accounts
    const ActiveEmails = await EmailAccountModel.findAll({
        where: {
            WorkspaceId,
            // Status: "Active"
        }
    });



    // Retrieving people who have received emails from sendgrid
    const headers = {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
    };
    const EmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    const { data: categories } = await axios.get("https://api.sendgrid.com/v3/categories?category=To:&limit=500", { headers });
    
    const PeopleReached = categories.length > 0 ? categories
        .map(item => item.category)
        .filter(category => {
            if (!category.startsWith("To:")) return false;
            const suffix = category.slice(3);
            return EmailRegex.test(suffix);
        }) : [];



    // Retreiving the opportunies and conversions from database
    const Leads = await LeadModel.findAll({
        include: [{
            model: CampaignModel,
            where: { WorkspaceId },
            required: true
        }]
    });

    const Opportunities = Leads.filter(lead => lead.Status === "Discovery");
    const Conversions = Leads.filter(lead => lead.Status === "Closed Won");


    res.status(200).json({
        success: true,
        message: "Summary widget fetched successfully",
        Details: {
            ActiveEmails: ActiveEmails.length || 0,
            PeopleReached: PeopleReached.length || 0,
            Opportunities: Opportunities.length || 0,
            Conversions: Conversions.length || 0
        }
    });
});

exports.LiveFeed = catchAsyncError(async (req, res, next) => {
    const events = Array.isArray(req.body) ? req.body : [];

    const io = req.app.get('io');

    events.forEach(evt => {
        try {
            const workspaceId = evt.workspaceId || null;
            console.log("Workspace id from email: ", workspaceId);
            if (!workspaceId) return;

            const payload = {
                workspaceId,
                workspaceName: evt.workspaceName,
                campaignId: evt.campaignId,
                campaignName: evt.campaignName,
                receiverName: evt.receiverName,
                receiverEmail: evt.receiverEmail,
                url: evt.url || '',
                event: evt.event,
                timestamp: evt.timestamp ? new Date(evt.timestamp * 1000).toLocaleString() : ''
            };

            const roomName = `Workspace_${workspaceId}`;
            const clients = io.sockets.adapter.rooms.get(roomName);

            if (!clients || clients.size === 0) {
                console.error(`No clients connected to room: ${roomName}`);
                return; // Exit if no clients are connected to the workspace room
            }

            io.to(roomName).emit('sendgrid_event', payload);
            console.log(`Emitted "${evt.event}" event from email address ${evt.receiverEmail} room ${roomName}":, payload`);

        } catch (err) {
            console.error('Error processing Sendgrid event:', err, evt);
        }
    });

    res.status(200).send('OK');
});

exports.StatsWidget = catchAsyncError(async (req, res, next) => {

});

exports.TopPeopleWidget = catchAsyncError(async (req, res, next) => {
    const WorkspaceId = req.user.User.CurrentWorkspaceId;

    const Campaigns = await CampaignModel.findAll({
        where: {
            WorkspaceId: WorkspaceId
        }
    });

    const Leads = await LeadModel.findAll({
        where: {
            CampaignId: {
                [Op.in]: Campaigns.map(campaign => campaign.id)
            },
            Status: "New",
            Email: {
                [Op.not]: null
            }
        }
    });

    const { StartDate, EndDate } = GetWeekStartAndEndDate();


    const headers = {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
    };

    let EmailStats = {};

    for (const Lead of Leads) {
        const url = `https://api.sendgrid.com/v3/categories/stats?start_date=${StartDate}&end_date=${EndDate}&aggregated_by=day&categories=${Lead.Email}`;

        try {
            const { data } = await axios.get(url, { headers });

            data.forEach(day => {
                const email = day.stats[0].name;
                const { opens = 0, clicks = 0 } = day.stats[0].metrics;

                if (!EmailStats[email]) {
                    EmailStats[email] = { opens: 0, clicks: 0, total: 0 };
                }

                EmailStats[email].opens += opens;
                EmailStats[email].clicks += clicks;
                EmailStats[email].total += opens + clicks;
            });
        } catch (error) {
            if (!EmailStats[Lead.Email]) {
                EmailStats[Lead.Email] = { opens: 0, clicks: 0, total: 0 };
            }
            continue;
        }
    }

    EmailStats = Object.fromEntries(
        Object.entries(EmailStats).sort(([, a], [, b]) => b.total - a.total)
    );

    const TopPeople = Object.entries(EmailStats)
        .slice(0, 3)
        .map(([email, stats]) => {
            const lead = Leads.find(lead => lead.Email === email);

            return {
                ...stats,
                details: lead || null
            };
        });

    res.status(200).json({
        success: true,
        message: "Top People fetched successfully",
        TopPeople
    });
});