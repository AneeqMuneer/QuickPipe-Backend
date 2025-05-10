const ErrorHandler = require("../Utils/errorHandler");
const catchAsyncError = require("../Middleware/asyncError");

const twilio = require("twilio");
const OpenAI = require("openai");

const { VoiceResponse } = twilio.twiml;
const client = twilio(
    process.env.TWILIO_ACCOUNT_SID_PAID,
    process.env.TWILIO_AUTH_TOKEN_PAID
);
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
const MyPhoneNumber = process.env.TWILIO_NUMBER_PAID;
const ngrokLink = "https://8416-202-47-41-16.ngrok-free.app/coldCall";

exports.CreateHumanCall = catchAsyncError(async (req, res, next) => {
    const { PhoneNumber , ToNumber } = req.body;

    if (!PhoneNumber || !ToNumber) {
        return next(new ErrorHandler("Both 'PhoneNumber' and 'ToNumber' are required", 400));
    }

    const response = await client.calls.create({
        from: MyPhoneNumber,
        to: PhoneNumber,
        twiml: `<Response><Pause length="3" /><Say>Wait a moment, we are connecting your call.</Say><Dial>${ToNumber}</Dial></Response>`,
        statusCallback: `${ngrokLink}/status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST'
    });

    res.status(200).send({
        success: true,
        message: "Test API called successfully",
        callSid: response.sid,
        status: response.status,
        from: MyPhoneNumber,
        to: PhoneNumber,
        toNumber: ToNumber
    });
});

exports.TwimlStatus = catchAsyncError(async (req, res, next) => {
    const { CallSid, CallStatus } = req.body;

    console.log(`CallSid: ${CallSid}, CallStatus: ${CallStatus}`);

    res.status(200).send({
        success: true,
        message: "Twiml status received",
        CallSid,
        CallStatus
    });
});

exports.Voicebot = catchAsyncError(async (req, res, next) => {
    const { message } = req.body;

    const prompt = `
    You are a helpful call assistant for a company that sends cold calls to potential customers.
    You are given a message and you need to respond to it but make sure to respond in a way that is friendly and engaging.
    Your job is to make the customer feel comfortable and engaged with the call until the agent can take over. Till then you need to keep the conversation going.
    If the customer is not interested and is trying to end the call, you need to say "Thank you for your time. Have a great day!" and end the call.
    If the customer is interested and is trying to ask more information about the product or business, you need to say "Our agent can communicate with you in a moment. Please hold on." and end the call.
    Message: ${message}
    Make sure to respond only with the answer, no other text.
    `;

    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        store: true,
        messages: [
            { "role": "user", "content": prompt },
        ],
    });

    const answer = response.choices[0].message.content;

    res.status(200).send({
        success: true,
        message: "Test API called successfully",
        answer
    });
});

exports.SwitchToAIMode = catchAsyncError(async (req, res, next) => {
    
});

exports.SwitchToHumanMode = catchAsyncError(async (req, res, next) => {
    
});