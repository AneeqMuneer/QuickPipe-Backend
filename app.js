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

const UserRoutes = require("./Routes/userRoutes");

app.use("/User", UserRoutes);


app.use(middleware)
module.exports = app;