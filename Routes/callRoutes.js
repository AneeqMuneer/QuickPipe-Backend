const express = require("express");
const { getAllCalls } = require("../Controller/callController");
const router = express.Router();

router.get("/", getAllCalls);

module.exports = router; 