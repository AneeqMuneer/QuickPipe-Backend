const CallModel = require("../Model/callModel");
const LeadModel = require("../Model/leadModel");

exports.getAllCalls = async (req, res) => {
  try {
    const calls = await CallModel.findAll({
      include: [{ model: LeadModel, attributes: ["Name", "Email"] }]
    });
    res.status(200).json({ success: true, calls });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch calls", error });
  }
};