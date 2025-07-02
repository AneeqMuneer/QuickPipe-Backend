const http = require("http");
const { Server } = require("socket.io");
const app = require("./app.js");
const dotenv = require("dotenv");

process.on("uncaughtException", (err) => {
    console.log(`Error: ${err.message}`);
    process.exit(1);
});

dotenv.config({ path: "./config/config.env" });
require("./Model/connect.js");

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // allow frontend origin or use specific origin
        methods: ["GET", "POST"]
    }
});

// Attach io to the app
app.set("io", io);

// Handle socket connections
io.on("connection", (socket) => {
    console.log("Frontend connected:", socket.id);

    // Client joins a room (workspace-based)
    socket.on("joinWorkspace", (workspaceId) => {
        socket.join(`Workspace_${workspaceId}`);
        console.log(`Socket ${socket.id} joined Workspace_${workspaceId}`);
    });

    socket.on("disconnect", () => {
        console.log("Socket disconnected:", socket.id);
    });
});

server.listen(process.env.PORT, () => {
    console.log(`Server is running on http://localhost:${process.env.PORT}/`);
});

process.on("unhandledRejection", (err) => {
    console.log(`Error: ${err.message}`);
    server.close(() => process.exit(1));
});