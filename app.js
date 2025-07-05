const express = require("express");
const app = express();
const middleware = require("./Middleware/error");
const cors = require("cors");
const path = require("path");
const { connectRedis } = require('./Utils/redisUtils');

// Connect to Redis
connectRedis();

app.use(cors({
    origin: "*",
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Special raw body parser for Stripe webhooks
const stripeWebhookPath = '/EmailAccount/StripeWebhook';
app.use((req, res, next) => {
    if (req.originalUrl === stripeWebhookPath) {
        let rawBody = '';
        req.on('data', chunk => {
            rawBody += chunk.toString();
        });
        req.on('end', () => {
            req.rawBody = rawBody;
            next();
        });
    } else {
        express.json({ limit: '50mb' })(req, res, next);
    }
});

app.use(express.urlencoded({
    extended: true,
    limit: '50mb'
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

const AnalyticsRoutes = require('./Routes/analyticsRoutes');
const ApiRoutes = require("./Routes/apiRoutes");
const BusinessRoutes = require("./Routes/businessRoutes");
const CalendarRoutes = require('./Routes/calendarRoutes');
const CallRoutes = require('./Routes/callRoutes');
const CampaignRoutes = require('./Routes/campaignRoutes');
const ColdCallRoutes = require("./Routes/coldCallRoutes");
const DashboardRoutes = require('./Routes/dashboardRoutes');
const EmailAccountRoutes = require("./Routes/emailAccountRoutes");
const HelpRoutes = require("./Routes/helpRoutes");
const LeadRoutes = require('./Routes/leadRoutes');
const MeetingRoutes = require('./Routes/meetingRoutes');
const MemberRoutes = require("./Routes/memberRoutes");
const TaskRoutes = require('./Routes/taskRoutes');
const UserRoutes = require('./Routes/userRoutes');
const WorkspaceRoutes = require("./Routes/workspaceRoutes");
const ZoomRoutes = require('./Routes/zoomRoutes');

app.use("/analytics", AnalyticsRoutes);
app.use("/business", BusinessRoutes);
app.use("/calendar", CalendarRoutes);
app.use('/calls', CallRoutes);
app.use('/campaign', CampaignRoutes);
app.use('/coldCall', ColdCallRoutes);
app.use("/dashboard", DashboardRoutes);
app.use('/EmailAccount', EmailAccountRoutes);
app.use("/help", HelpRoutes);
app.use("/integration", ApiRoutes);
app.use('/lead', LeadRoutes);
app.use('/meetings', MeetingRoutes);
app.use("/member", MemberRoutes);
app.use('/tasks', TaskRoutes);
app.use("/user", UserRoutes);
app.use("/workspace", WorkspaceRoutes);
app.use("/zoom", ZoomRoutes);

// Render payment page
app.get('/payment', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(middleware);
module.exports = app;
