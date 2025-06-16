const { Calls } = require("../Model/connect");
const { Lead } = require("../Model/connect");

exports.getAllCalls = async (req, res) => {
  try {
    const calls = await Calls.findAll({
      include: [{ model: Lead, attributes: ["Name", "Email"] }]
    });
    res.status(200).json({ success: true, calls });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch calls", error });
  }
}; 