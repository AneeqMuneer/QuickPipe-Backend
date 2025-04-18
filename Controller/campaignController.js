const catchAsyncError = require("../Middleware/asyncError");
const ErrorHandler = require("../Utils/errorHandler");

const CampaignModel = require("../Model/campaignModel");
const LeadModel = require("../Model/leadModel");
const SequenceModel = require("../Model/sequenceModel");
const ScheduleModel = require("../Model/scheduleModel");

const moment = require("moment");
const cron = require("node-cron");
const nodemailer = require("nodemailer");
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

exports.CreateCampaign = catchAsyncError(async (req, res, next) => {
    const { Name } = req.body;
    console.log(req.user.User);

    if (!Name) {
        return next(new ErrorHandler("Please fill all the required fields.", 400));
    }

    const campaign = await CampaignModel.create({
        WorkspaceId: req.user.User.CurrentWorkspaceId,
        Name,
    });

    const sequence = await SequenceModel.create({
        CampaignId: campaign.id,
    });

    const schedule = await ScheduleModel.create({
        CampaignId: campaign.id,
    })

    res.status(201).json({
        success: true,
        campaign,
        sequence,
        schedule
    });
});

exports.GetAllCampaigns = catchAsyncError(async (req, res, next) => {
    const campaigns = await CampaignModel.findAll({
        where: {
            WorkspaceId: req.user.User.CurrentWorkspaceId,
        }
    });

    res.status(200).json({
        success: true,
        campaigns,
    });
});

exports.GetCampaignById = catchAsyncError(async (req, res, next) => {
    res.status(200).json({
        success: true,
        message: "Campaign found successfully",
        campaign: req.campaign,
    });
});

exports.UpdateCampaign = catchAsyncError(async (req, res, next) => {
    const { Name } = req.body;
    const campaign = req.campaign;

    if (!Name) {
        return next(new ErrorHandler("Please fill all the required fields.", 400));
    }

    campaign.Name = Name;

    await campaign.save();

    res.status(200).json({
        success: true,
        message: "Campaign updated successfully",
        campaign,
    });
});

exports.DeleteCampaign = catchAsyncError(async (req, res, next) => {
    const campaign = req.campaign;

    await campaign.destroy();

    res.status(200).json({
        success: true,
        message: "Campaign deleted successfully",
    });
});

exports.ActivePauseCampaign = catchAsyncError(async (req, res, next) => {
    const campaign = req.campaign;

    if (campaign.Status === "Active") {
        campaign.Status = "Paused";
    } else if (campaign.Status === "Paused") {
        campaign.Status = "Active";
    }

    await campaign.save();

    res.status(200).json({
        success: true,
        message: "Campaign status updated successfully",
        campaign,
    });
});

exports.RunCampaign = catchAsyncError(async (req, res, next) => {
    const campaign = req.campaign;

    
});

/* PEOPLE TAB */

exports.GetCampaignLeads = catchAsyncError(async (req, res, next) => {
    const campaign = req.campaign;

    const leads = await LeadModel.findAll({
        where: {
            CampaignId: campaign.id,
        },
    });

    res.status(200).json({
        success: true,
        message: "Leads found successfully",
        leads,
    });
});

/* SEQUENCE TAB */

exports.GetCampaignSequence = catchAsyncError(async (req, res, next) => {
    const campaign = req.campaign;

    const sequence = await SequenceModel.findOne({
        where: {
            CampaignId: campaign.id,
        },
    });

    res.status(200).json({
        success: true,
        message: "Sequence found successfully",
        sequence,
    });
});

exports.UpdateCampaignSequence = catchAsyncError(async (req, res, next) => {
    const { Emails } = req.body;
    const campaign = req.campaign;

    const sequence = await SequenceModel.findOne({
        where: {
            CampaignId: campaign.id,
        },
    });

    for (let i = 0; i < Emails.length; i++) {
        const { Delay } = Emails[i];

        if (!Delay) {
            Emails[i].Delay = 0;
        }
    }

    sequence.Emails = Emails;

    await sequence.save();

    res.status(200).json({
        success: true,
        message: "Sequence updated successfully",
        sequence,
    });
});

exports.SendCampaignMail = catchAsyncError(async (req, res, next) => {
    const { EmailPlan } = req.body;
    const campaign = req.campaign;

    const sequence = await SequenceModel.findOne({
        where: {
            CampaignId: campaign.id,
        },
    });

    if (!sequence) {
        return next(new ErrorHandler("Sequence not found", 404));
    }

    for (let i = 0; i < EmailPlan.length; i++) {
        const { Email, Subject, Body, Time } = EmailPlan[i];

        if (!Email || !Subject || !Body || !Time) {
            return next(new ErrorHandler("Please fill all the required fields.", 400));
        }

        console.log("Current UTC time:", moment.utc().format());

        const crondate = moment(Time).format("m H D M *");
        const cronjob = cron.schedule(crondate, () => {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                    user: process.env.EMAIL,
                    pass: process.env.EMAIL_PASSWORD,
                },
            });

            const mailOptions = {
                from: process.env.EMAIL,
                to: Email,
                subject: Subject,
                text: Body,
            };

            const info = transporter.sendMail(mailOptions);
            console.log(`Email scheduled for ${Email}`);
        });

    }

    res.status(200).json({
        success: true,
        message: "Emails sent successfully",
    });
});

exports.GenerateAIEmail = catchAsyncError(async (req, res, next) => {
    const { Emails, EmailIndex } = req.body;
    const campaign = req.campaign;
    
    if (EmailIndex < 0 || EmailIndex >= Emails.length) {
        return next(new ErrorHandler("Email index out of range", 400));
    }

    const currentEmail = Emails[EmailIndex];
    const isReply = !currentEmail.Subject || currentEmail.Subject.trim() === "";
    let prompt;

    if (isReply) {
        // Follow-up email
        const context = Emails.slice(0, EmailIndex).map((email, idx) => {
            return `Step ${idx + 1} - "${email.Name || "N/A"}"\nSubject: ${email.Subject || "N/A"}\nBody: ${email.Body || "N/A"}`;
        }).join("\n\n");

        if (!currentEmail.Body || currentEmail.Body.trim() === "") {
            // Inspired follow-up email with context
            prompt = `
    You are a professional cold outreach strategist.
    
    Write a follow-up email for a campaign named "${campaign.name}", at the step titled "${currentEmail.Name}".
    
    The lead hasn't responded to any previous emails. Below is the context from earlier steps:
    
    ${context}
    
    Keep it short, polite, and persuasive—without being pushy. Gently remind them of your previous message and encourage engagement.
    
    Start with something like "Just checking in..." or "Wanted to follow up..."
    
    Respond only in this JSON format:
    
    {
      "Body": "your follow-up email body here"
    }
            `.trim();
        } else {
            // Improve follow-up email with context
            prompt = `
    You are a professional cold email strategist.
    
    Improve the following follow-up email for a campaign named "${campaign.name}", at the step titled "${currentEmail.Name}".
    
    This email is a reply to previous attempts. Here's the context from earlier steps:
    
    ${context}
    
    Current draft:
    ${currentEmail.Body}
    
    Make it more engaging, natural, and persuasive while keeping it concise and friendly.
    
    Respond only in this JSON format:
    
    {
      "Body": "your improved email body here"
    }
            `.trim();
        }
    } else {
        // Cold email (non-reply)
        if (!currentEmail.Body || currentEmail.Body.trim() === "") {
            // Inspired new email without context
            prompt = `
    You are a professional cold email copywriter.
    
    Create a cold outreach email for a campaign named "${campaign.name}", in the step titled "${currentEmail.Name}".
    
    The user is seeking inspiration. Use the following subject line:
    
    Subject: ${currentEmail.Subject}
    
    Make the email professional, concise, and engaging. Aim to spark interest and encourage a reply.
    
    Respond only in this JSON format:
    
    {
      "Subject": "your improved subject here",
      "Body": "your inspired email here"
    }
            `.trim();
        } else {
            // Improve cold email
            prompt = `
    You are a professional cold email copywriter.
    
    Improve this cold email for a campaign named "${campaign.name}", in the step titled "${currentEmail.Name}".
    
    Subject: ${currentEmail.Subject}
    
    Body:
    ${currentEmail.Body}
    
    Make it more engaging, personalized, and clear—while keeping it concise and conversational.
    
    Respond only in this JSON format:
    
    {
      "Subject": "your improved subject here",
      "Body": "your improved email body here"
    }
            `.trim();
        }
    }

    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        store: true,
        messages: [
            { "role": "user", "content": prompt },
        ],
    });

    console.log(response.choices[0].message.content);

    // const answer = JSON.parse(response.choices[0].message.content);

    return res.status(200).json({
        success: true,
        message: "AI response generated successfully",
        // content: answer,
    });
});

exports.GenerateAISequence = catchAsyncError(async (req, res, next) => {
    const { Emails } = req.body;
    const campaign = req.campaign;

    if (!campaign) {
        return next(new ErrorHandler("Campaign not found", 400));
    }

    const existingSequenceContext = Emails && Emails.length > 0
        ? `Here is the current sequence:\n\n${Emails.map((e, i) =>
            `Step ${i + 1} - ${e.Name || "Unnamed"}\nSubject: ${e.Subject || "N/A"}\nBody: ${e.Body || "N/A"}`
        ).join('\n\n')}`
        : "There is currently no existing sequence.";

    const prompt = `
You are a professional cold outreach strategist.

Your task is to generate a complete cold email sequence for a campaign named "${campaign.name}". 
This is the current state of the sequence: ${existingSequenceContext}

Use this information to create a new sequence or improve the existing one that aligns on the objectives of the campaign highlighted by it's name.

The goal of this sequence is to engage the lead effectively and improve chances of a response or conversion.

Please decide:
- The number of emails in the sequence
- The name/title of each step
- The subject line for each email (unless it's a follow-up, then it can be empty)
- The body of each email (brief, persuasive, and personalized)
- A delay (in days) from the previous step (e.g., 0 for the first, then 2, 4, etc.)

The response must be in **JSON format** like the following:
[
  {
    "Name": "Name of the step 1 email",
    "Subject": "subject of the step 1 email",
    "Body": "Body of the step 1 email",
    "Delay": 0 (for the first email of the sequence this should be 0)
  },
  {
    "Name": "Name of the step 2 email",
    "Subject": "subject of the step 2 email",
    "Body": "Body of the step 2 email",
    "Delay": 1 (any integer (number of days) that makes it seem realistic, e.g., 1, 2, 3, etc.)
  },
  ... and so on as much is necessary to make the campaign successful
]

Keep the tone professional but friendly and results-driven. Don't be too pushy. Output ONLY the JSON.
`;

    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        store: true,
        messages: [
            { "role": "user", "content": prompt },
        ],
    });

    AISequence = JSON.parse(response.choices[0].message.content);

    return res.status(200).json({
        success: true,
        message: "AI response generated successfully",
        content: AISequence,
    });
});


/* SCHEDULE TAB */

exports.GetCampaignSchedule = catchAsyncError(async (req, res, next) => {
    const campaign = req.campaign;

    const schedule = await ScheduleModel.findOne({
        where: {
            CampaignId: campaign.id,
        },
    });

    res.status(200).json({
        success: true,
        message: "Schedule found successfully",
        schedule,
    });
});

exports.UpdateCampaignSchedule = catchAsyncError(async (req, res, next) => {
    const { Schedule } = req.body;
    const campaign = req.campaign;

    const schedule = await ScheduleModel.findOne({
        where: {
            CampaignId: campaign.id,
        },
    });

    schedule.Schedule = Schedule;

    await schedule.save();

    res.status(200).json({
        success: true,
        message: "Schedule updated successfully",
        schedule,
    });
});

exports.GenerateAISchedule = catchAsyncError(async (req , res , next) => {
    const { Schedule } = req.body;
});

/* OPTIONS TAB */