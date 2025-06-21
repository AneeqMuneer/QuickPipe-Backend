const express = require("express");
const { GetBusinessData, AddWebsiteData, AddDocumentData, UpdateBusinessName } = require("../Controller/businessController");
const { VerifyUser } = require("../Middleware/userAuth");
const { uploadMultiple } = require("../Middleware/multer.js");

const router = express.Router();

router.route("/GetBusinessData").get(VerifyUser, GetBusinessData);
router.route("/AddWebsiteData").put(VerifyUser, AddWebsiteData);
router.route("/AddDocumentData").put(VerifyUser, uploadMultiple.array('documents', 3), AddDocumentData);
router.route("/UpdateBusinessName").put(VerifyUser, UpdateBusinessName);

module.exports = router;