const express = require("express");
const app = express();
const middleware = require("./Middleware/error");
const cors = require("cors");

app.use(cors({ 
    origin: "*",
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));

app.use(express.urlencoded({ 
    extended: true,
    limit: '50mb'
}));

const UserRoutes = require('./Routes/userRoutes');
const ZoomRoutes = require('./Routes/zoomRoutes');
const CalendarRoutes = require('./Routes/calendarRoutes');
const WorkspaceRoutes = require("./Routes/workspaceRoutes");
const MemberRoutes = require("./Routes/memberRoutes");
const leadRoutes = require('./Routes/leadRoutes')
const campaignRoutes = require('./Routes/campaignRoutes')

app.use("/user" , UserRoutes);
app.use("/workspace" , WorkspaceRoutes)
app.use("/zoom" , ZoomRoutes);
app.use("/calendar" , CalendarRoutes);
app.use("/member" , MemberRoutes);
app.use('/lead',leadRoutes)
app.use('/campaign',campaignRoutes)


app.use(middleware);
module.exports = app;