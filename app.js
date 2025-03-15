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

const UserRoutes = require('./Routes/userRoutes')
const ZoomRoutes = require('./Routes/zoomRoutes')
const CalendarRoutes = require('./Routes/calendarRoutes')

app.use("/user",UserRoutes);
app.use("/zoom",ZoomRoutes);
app.use("/calendar",CalendarRoutes)


app.use(middleware);
module.exports = app;