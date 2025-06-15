const express = require('express');
const {
    CreateTask,
    GetTask,
    GetAllTasks,
    UpdateTask,
    DeleteTask,
    GetTasksByDateRange,
    GetTasksByFilter
} = require('../Controller/taskController');

const {VerifyUser} = require('../Middleware/userAuth');

const router = express.Router();

router.post("/", VerifyUser, CreateTask);
router.get("/", VerifyUser, GetAllTasks);
router.get("/range", VerifyUser, GetTasksByDateRange);
router.get("/filter", VerifyUser, GetTasksByFilter);
router.get("/:id", VerifyUser, GetTask);
router.put("/:id", VerifyUser, UpdateTask);
router.delete("/:id", VerifyUser, DeleteTask);



module.exports = router;