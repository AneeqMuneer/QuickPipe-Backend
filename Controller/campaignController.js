const catchAsyncError = require("../Middleware/asyncError");
const ErrorHandler = require("../Utils/errorHandler");

const CampaignModel = require("../Model/campaignModel");
const LeadModel = require("../Model/leadModel");
const SequenceModel = require("../Model/sequenceModel");
const ScheduleModel = require("../Model/scheduleModel");
const TemplateModel = require("../Model/templateModel");

const { getRandomSendingTime } = require("../Utils/leadUtils");

const cron = require("node-cron");
const nodemailer = require("nodemailer");
const moment = require("moment-timezone");
const OpenAI = require('openai');
const sgMail = require('@sendgrid/mail');
const { Op } = require("sequelize");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/* OVERALL CAMPAIGN OPERATIONS */

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

    campaign.SequenceId = sequence.id;
    campaign.ScheduleId = schedule.id;
    await campaign.save();

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
        // Active pe add cron job to run api
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

    if (campaign.Status !== "Active") {
        return next(new ErrorHandler("Campaign is not active", 400));
    }
    const sequences = await SequenceModel.findOne({ where: { CampaignId: campaign.id } });
    const schedules = await ScheduleModel.findOne({ where: { CampaignId: campaign.id } });
    const leads = await LeadModel.findAll({ where: { CampaignId: campaign.id } });

    const mailAccounts = ['account1@gmail.com','account2@gmail.com','account3@gmail.com','account4@gmail.com','account5@gmail.com'];

    if (!sequences || sequences.length === 0) return next(new ErrorHandler("Sequence not found", 404));
    if (!schedules || schedules.length === 0) return next(new ErrorHandler("Schedules not found", 404));
    if (!leads || leads.length === 0) return next(new ErrorHandler("No leads found", 404));

    const emails = sequences.Emails;

    // jo CampaignStep hai wo index pe jo email hai wo bhejna hai so if 1 means 0 is already sent now need to send 1
    const Plan = [];

    for (const lead of leads) {
        if (!lead.Responded) {
            if (lead.CampaignStep < emails.length) {
                
                if (lead.CampaignStep === 0) {
                    const sendingEmail = emails[lead.CampaignStep];
                    const emailAccount = mailAccounts[Math.floor(Math.random() * mailAccounts.length)];
                    const sendingSchedule = schedules.Schedule[Math.floor(Math.random() * schedules.Schedule.length)];
                    const sendingTime = getRandomSendingTime(sendingSchedule , 0);
                    
                    Plan.push({
                        Receiver: lead.Email,
                        EmailAccount: emailAccount,
                        Time: sendingTime,
                        Subject: sendingEmail.Subject,
                        Body: sendingEmail.Body,
                    });
                    // cron job to send email with updating lastinteraction and step (with condition for if exists)
                    
                    lead.CommunicationEmail = emailAccount;
                    lead.SendingSchedule = sendingSchedule;
                    await lead.save();
                } else {
                    const sendingEmail = emails[lead.CampaignStep];
                    const emailAccount = lead.CommunicationEmail;
                    const sendingSchedule = lead.SendingSchedule;
                    const sendingTime = getRandomSendingTime(sendingSchedule , emails[lead.CampaignStep -1].Delay);
                    
                    // cron job to send email with updating lastinteraction, step (with condition for if exists), and if has responded or not
                    
                    Plan.push({
                        Receiver: lead.Email,
                        EmailAccount: emailAccount,
                        Time: sendingTime,
                        Subject: sendingEmail.Subject,
                        Body: sendingEmail.Body,
                    });
                }
            }
        }
    }
    
    // run cron job to call this api again

    res.status(200).json({
        success: true,
        message: "Campaign run successfully",
        Plan,
    })
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
    
    Write a follow-up email for a campaign named "${campaign.Name}", at the step titled "${currentEmail.Name}".
    
    The lead hasn't responded to any previous emails. Below is the context from earlier steps:
    
    ${context}
    
    Keep it short, polite, and persuasive—without being pushy. Gently remind them of your previous message and encourage engagement.
    
    Start with something like "Just checking in..." or "Wanted to follow up..."
    
    Respond only in this JSON format:
    
    {
      "Body": "your follow-up email body here"
    }
    Make sure to use new line characters to show a new line in the JSON response to make it a valid JSON`.trim();
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
    Make sure to use new line characters to show a new line in the JSON response to make it a valid JSON`.trim();
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
    Make sure to use new line characters to show a new line in the JSON response to make it a valid JSON`.trim();
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
    Make sure to use new line characters to show a new line in the JSON response to make it a valid JSON`.trim();
        }
    }

    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        store: true,
        messages: [
            { "role": "user", "content": prompt },
        ],
    });

    const answer = JSON.parse(response.choices[0].message.content);

    return res.status(200).json({
        success: true,
        message: "AI response generated successfully",
        content: answer,
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

Your task is to generate a complete cold email sequence for a campaign named "${campaign.Name}". 
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

exports.CreateTemplate = catchAsyncError(async (req, res, next) => {
    const { Name, Subject, Body } = req.body;

    if (!Name || !Subject || !Body) {
        return next(new ErrorHandler("All fields are required", 400));
    }

    const Template = await TemplateModel.create({
        Name,
        Subject,
        Body
    });

    res.status(201).json({
        success: true,
        message: "Template created successfully",
        Template
    });
});

exports.GetAllTemplates = catchAsyncError(async (req, res, next) => {
    const Templates = await TemplateModel.findAll();

    res.status(200).json({
        success: true,
        message: "Templates retrieved successfully",
        Templates
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

exports.GenerateAISchedule = catchAsyncError(async (req, res, next) => {
    const { Emails, Leads } = req.body;
    const campaign = req.campaign;

    if (!campaign) {
        return next(new ErrorHandler("Campaign not found", 400));
    }

    const existingSequenceContext = Emails && Emails.length > 0
        ? `Here is the current sequence:\n\n${Emails.map((e, i) =>
            `Step ${i + 1} - ${e.Name || "Unnamed"}\nSubject: ${e.Subject || "N/A"}\nBody: ${e.Body || "N/A"}`
        ).join('\n\n')}`
        : "There is currently no existing sequence.";

    const uniqueLocations = [...new Set(Leads.map(lead => lead.Location).filter(Boolean))];

    const prompt = `You are an expert cold outreach strategist and scheduling assistant.

We are running a campaign named "${campaign.Name}".

You will help generate a set of sending **schedules** for email accounts to follow.

---

Each schedule will define:
- Name: A unique name like "Schedule 1"
- TimingFrom: Starting time for email sends in 24-hour format (e.g., "09:00:00")
- TimingTo: Ending time for email sends in 24-hour format (e.g., "17:00:00")
- Timezone: The relevant IANA timezone (e.g., "America/New_York")
- Days: An array of days during which emails will be sent (e.g., ["Monday", "Wednesday", "Friday"])

---

### Context

Here is the current sequence of emails that will be sent:

${existingSequenceContext}

---

Here are the locations from where the various leads belong from:

${uniqueLocations.join(", ")}

Use this to determine which timezones should be considered for sending emails during working hours (9 AM to 5 PM local time, or slightly earlier/later to test variation).

---

Please generate multiple schedule variants that are:
- Realistic (simulate human work hours)
- Take into account all the unique locations of the leads
- Randomized to avoid detection by spam filters
- Diverse in days and hours to avoid pattern detection
- Following the structure below in JSON format

### Output JSON Format:
[
  {
    "Name": "Schedule 1",
    "TimingFrom": "09:00:00",
    "TimingTo": "17:00:00",
    "Timezone": "America/New_York",
    "Days": ["Monday", "Wednesday", "Friday"]
  },
  {
    "Name": "Schedule 2",
    "TimingFrom": "08:30:00",
    "TimingTo": "16:30:00",
    "Timezone": "Europe/London",
    "Days": ["Tuesday", "Thursday"]
  },
  ...
]

Quick Tip: Avoid using Saturday and Sunday for sending emails, as most people are not working on weekends.
Make sure to use a variety of timezones and days to make the schedule look natural and human-like.
`

    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        store: true,
        messages: [
            { "role": "user", "content": prompt },
        ],
    });

    AISchedule = JSON.parse(response.choices[0].message.content);

    return res.status(200).json({
        success: true,
        message: "AI response generated successfully",
        content: AISchedule,
    });
});

exports.GetAllTimezones = catchAsyncError(async (req , res , next) => {
    const timezones = moment.tz.names();

    res.status(200).json({
        success: true,
        message: "Timezones found successfully",
        timezones,
    });
});

/* OPTIONS TAB */

// Active pe add cron job to run api
// cron job mein update last interaction & campaign step
// create cron job to send email
// create cron job to run campaign at the end of the API
