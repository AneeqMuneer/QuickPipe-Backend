// QuickPipe-Backend/Controller/aiController.js
const axios = require('axios');
const ErrorHandler = require('../Utils/errorHandler');
const catchAsyncError = require('../Middleware/asyncError');

exports.chatWithGPT = catchAsyncError(async (req, res, next) => {
  const { message } = req.body;
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: message }]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json({ reply: response.data.choices[0].message.content });
  } catch (error) {
    next(new ErrorHandler(error.message, 500));
  }
});