const { Op } = require("sequelize");
const catchAsyncError = require("../Middleware/asyncError");
const ErrorHandler = require("../Utils/errorHandler");
const TaskModel = require("../Model/taskModel");

require("dotenv").config();

// Create a new Task
exports.CreateTask = catchAsyncError(async (req, res, next) => {
  const userId = req.user.User.id;
  const {
    Task_Title,
    Description,
    eventDate,
    eventTime,
    Person,
    Meeting_Link,
    Extra_Notes,
    GoogleEventId,
  } = req.body;

  const task = await TaskModel.create({
    Task_Title,
    Description,
    eventDate,
    eventTime,
    Person,
    Meeting_Link,
    Extra_Notes,
    GoogleEventId,
    userId,
  });

  res.status(201).json({
    success: true,
    message: "Task created successfully",
    task,
  });
});

// Get single Task by ID
exports.GetTask = catchAsyncError(async (req, res, next) => {
  const taskId = req.params.id;
  const userId = req.user.User.id;

  const task = await TaskModel.findOne({
    where: { id: taskId, userId },
  });

  if (!task) {
    return next(new ErrorHandler("Task not found", 404));
  }

  res.status(200).json({
    success: true,
    task,
  });
});

// Get all tasks for logged-in user
exports.GetAllTasks = catchAsyncError(async (req, res, next) => {
  const CurrentWorkspaceId = req.user.User.CurrentWorkspaceId;
  const tasks = await TaskModel.findAll({
    where: { WorkspaceId :CurrentWorkspaceId },
    order: [["eventDate", "ASC"]],
  });

  res.status(200).json({
    success: true,
    tasks,
  });
});

// Update a Task
exports.UpdateTask = catchAsyncError(async (req, res, next) => {
  const taskId = req.params.id;
  const userId = req.user.User.id;

  const task = await TaskModel.findOne({
    where: { id: taskId, userId },
  });

  if (!task) {
    return next(new ErrorHandler("Task not found", 404));
  }

  await task.update(req.body);

  res.status(200).json({
    success: true,
    message: "Task updated successfully",
    task,
  });
});

// Delete a Task
exports.DeleteTask = catchAsyncError(async (req, res, next) => {
  const taskId = req.params.id;
  const userId = req.user.User.id;

  const task = await TaskModel.findOne({
    where: { id: taskId, userId },
  });

  if (!task) {
    return next(new ErrorHandler("Task not found", 404));
  }

  await task.destroy();

  res.status(200).json({
    success: true,
    message: "Task deleted successfully",
  });
});

// Get tasks by filter (month/week)
exports.GetTasksByFilter = catchAsyncError(async (req, res, next) => {
  const CurrentWorkspaceId = req.user.User.CurrentWorkspaceId;
  const { filterType, date } = req.query;

  if (!filterType || !date) {
    return next(new ErrorHandler("Missing filterType or date in query", 400));
  }

  const baseDate = new Date(date);
  let start, end;

  if (filterType === "month") {
    start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
  } else if (filterType === "week") {
    const day = baseDate.getDay(); // 0 (Sun) - 6 (Sat)
    start = new Date(baseDate);
    start.setDate(baseDate.getDate() - day); // Sunday
    end = new Date(start);
    end.setDate(start.getDate() + 6); // Saturday
  } else {
    return next(new ErrorHandler("Invalid filterType. Use 'month' or 'week'", 400));
  }

  const tasks = await TaskModel.findAll({
    where: {
      WorkspaceId:CurrentWorkspaceId,
      eventDate: {
        [Op.between]: [start, end],
      },
    },
    order: [["eventDate", "ASC"]],
  });

  res.status(200).json({
    success: true,
    tasks,
  });
});

// Get tasks by custom date range
exports.GetTasksByDateRange = catchAsyncError(async (req, res, next) => {
  const CurrentWorkspaceId = req.user.User.CurrentWorkspaceId;
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return next(new ErrorHandler("Start date and end date are required", 400));
  }

  const tasks = await TaskModel.findAll({
    where: {
      WorkspaceId:CurrentWorkspaceId,
      eventDate: {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      },
    },
    order: [["eventDate", "ASC"]],
  });

  res.status(200).json({
    success: true,
    tasks,
  });
});