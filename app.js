const express = require("express");
const app = express();
const middleware = require("./Middleware/error");
const cors = require("cors");
const path = require("path");
const { connectRedis } = require('./Utils/redisUtils');

// Connect to Redis
connectRedis();

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
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

const UserRoutes = require('./Routes/userRoutes');
const ZoomRoutes = require('./Routes/zoomRoutes');
const CalendarRoutes = require('./Routes/calendarRoutes');
const WorkspaceRoutes = require("./Routes/workspaceRoutes");
const MemberRoutes = require("./Routes/memberRoutes");
const leadRoutes = require('./Routes/leadRoutes');
const campaignRoutes = require('./Routes/campaignRoutes');
const apiRoutes = require("./Routes/apiRoutes");
const helpRoutes = require("./Routes/helpRoutes");
const taskRoutes = require('./Routes/taskRoutes');
const emailAccountRoutes = require("./Routes/emailAccountRoutes");
const coldCallRoutes = require("./Routes/coldCallRoutes");
const callRoutes = require('./Routes/callRoutes');
const meetingRoutes = require('./Routes/meetingRoutes');

app.use("/user", UserRoutes);
app.use("/workspace", WorkspaceRoutes)
app.use("/zoom", ZoomRoutes);
app.use("/calendar", CalendarRoutes);
app.use("/member", MemberRoutes);
app.use('/lead', leadRoutes);
app.use('/campaign', campaignRoutes);
app.use("/integration", apiRoutes);
app.use("/help", helpRoutes);
app.use('/tasks', taskRoutes);
app.use('/EmailAccount', emailAccountRoutes);
app.use('/coldCall', coldCallRoutes);
app.use('/calls', callRoutes);
app.use('/meetings', meetingRoutes);

// Render payment page
app.get('/payment', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(middleware);
module.exports = app;
