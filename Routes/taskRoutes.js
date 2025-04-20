const express = require('express');
const {
    createTask,
    getTask,
    getAllTasks,
    updateTask,
    deleteTask,
    getTasksByDateRange,
    getTasksByFilter
} = require('../Controller/taskController');

const {VerifyUser} = require('../Middleware/userAuth');

const router = express.Router();

router.post("/", VerifyUser, createTask);
router.get("/", VerifyUser, getAllTasks);
router.get("/range", VerifyUser, getTasksByDateRange);
router.get("/filter", VerifyUser, getTasksByFilter);
router.get("/:id", VerifyUser, getTask);
router.put("/:id", VerifyUser, updateTask);
router.delete("/:id", VerifyUser, deleteTask);



module.exports = router;