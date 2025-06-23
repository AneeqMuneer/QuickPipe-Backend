const ErrorHandler = require("../Utils/errorHandler");
const catchAsyncError = require("../Middleware/asyncError");

const twilio = require("twilio");

const { VoiceResponse } = twilio.twiml;
const client = twilio(
    process.env.TWILIO_ACCOUNT_SID_PAID,
    process.env.TWILIO_AUTH_TOKEN_PAID
);
const MyPhoneNumber = process.env.TWILIO_NUMBER_PAID;
const ngrokLink = "https://19a2-202-47-41-16.ngrok-free.app/coldCall";

const { Voicebot } = require("../Utils/coldCallUtils");

const fs = require("fs");
const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;
const ELEVEN_LABS_API_URL = process.env.ELEVEN_LABS_API_URL || "https://api.elevenlabs.io/";
const FormData = require('form-data');
const axios = require('axios');

exports.CreateHumanCall = catchAsyncError(async (req, res, next) => {
    const { LeadNumber, AgentNumber } = req.body;

    if (!LeadNumber || !AgentNumber) {
        return next(new ErrorHandler("Both 'LeadNumber' and 'AgentNumber' are required", 400));
    }

    const response = await client.calls.create({
        from: MyPhoneNumber,
        to: LeadNumber,
        twiml: `<Response><Pause length="3" /><Say>Wait a moment, we are connecting your call.</Say><Dial>${AgentNumber}</Dial></Response>`,
        statusCallback: `${ngrokLink}/status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST'
    });

    res.status(200).send({
        success: true,
        message: "Test API called successfully",
        callSid: response.sid,
        status: response.status,
        TwilioNumber: MyPhoneNumber,
        Lead: LeadNumber,
        Agent: AgentNumber
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

exports.CreateAICall = catchAsyncError(async (req, res, next) => {
    const { PhoneNumber } = req.body;

    if (!PhoneNumber) {
        return next(new ErrorHandler("Phone number is required", 400));
    }

    const call = await client.calls.create({
        from: MyPhoneNumber,
        to: PhoneNumber,
        url: `${ngrokLink}/handle-ai-call`,
        statusCallback: `${ngrokLink}/status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST'
    });

    res.status(200).send({
        success: true,
        message: "AI call initiated successfully",
        callSid: call.sid,
        status: call.status,
        Lead: PhoneNumber
    });
});

exports.HandleAICall = catchAsyncError(async (req, res, next) => {
    const twiml = new VoiceResponse();

    twiml.pause({ length: 2 });
    twiml.say({ voice: 'Polly.Matthew' }, "Hello, I am quickpipe's AI assistant. How may I help you today?");

    twiml.gather({
        input: 'speech',
        timeout: 20,
        action: `${ngrokLink}/process-user-input`,
        method: 'POST',
        speechTimeout: 'auto',
        speechModel: 'phone_call'
    });

    twiml.say({ voice: 'Polly.Matthew' }, "I didn't hear anything. Please call back if you need assistance.");
    twiml.hangup();

    res.type('text/xml');
    res.send(twiml.toString());
});

exports.ProcessUserInput = catchAsyncError(async (req, res, next) => {
    const userSpeech = req.body.SpeechResult;
    const callSid = req.body.CallSid;

    console.log(`User said: ${userSpeech}`);

    let aiResponse = " ";
    try {
        const voicebotResponse = await Voicebot(userSpeech);

        if (voicebotResponse) {
            aiResponse = voicebotResponse;
        }
    } catch (error) {
        console.error("Error calling Voicebot API:", error);
        aiResponse = "I'm sorry, I'm having trouble understanding.";
    }

    const twiml = new VoiceResponse();

    twiml.say({ voice: 'Polly.Matthew' }, aiResponse);

    if (aiResponse.includes("Thank you for your time")) {
        twiml.hangup();
    } else {
        twiml.gather({
            input: 'speech',
            timeout: 20,
            action: `${ngrokLink}/process-user-input`,
            method: 'POST',
            speechTimeout: 'auto',
            speechModel: 'phone_call'
        });

        twiml.say({ voice: 'Polly.Matthew' }, "I didn't hear anything. Please call back if you need assistance.");
        twiml.hangup();
    }

    res.type('text/xml');
    res.send(twiml.toString());
});

exports.CreateCloneVoice = catchAsyncError(async (req, res, next) => {
    const { CurrentWorkspaceId } = req.user.User;
    const { name, remove_background_noise } = req.body;

    if (!req.file) {
        return next(new ErrorHandler("Audio file is required", 400));
    }
    if (!name) {
        return next(new ErrorHandler("Voice name is required", 400));
    }

    try {
        const audioFile = req.file;

        const formData = new FormData();
        formData.append('name', name);
        formData.append('files', audioFile.buffer, {
            filename: audioFile.originalname,
            contentType: audioFile.mimetype
        });

        if (typeof remove_background_noise !== 'undefined') {
            formData.append('remove_background_noise', remove_background_noise.toString());
        }

        const response = await axios.post(
            `${ELEVEN_LABS_API_URL}/v1/voices/add`,
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                    'xi-api-key': ELEVEN_LABS_API_KEY
                }
            }
        );

        const data = response.data;

        res.status(200).json({
            success: true,
            message: "Clone voice created successfully",
            voiceId: data.voice_id,
            elevenLabsResponse: data,
        });

    } catch (error) {
        console.error("Error creating clone voice:", error?.response?.data || error.message);
        return next(new ErrorHandler("Internal Server Error during voice cloning", 500));
    }
});

exports.TextToSpeech = catchAsyncError(async (req, res, next) => {
    const { text, voiceId } = req.body;

    if (!text || !voiceId) {
        return next(new ErrorHandler("Text and voice ID are required", 400));
    }

    try {
        const response = await axios.post(
            `${ELEVEN_LABS_API_URL}/v1/text-to-speech/${voiceId}`,
            {text},
            {
                headers: {
                    'xi-api-key': ELEVEN_LABS_API_KEY,
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer'
            }
        );
        const audioBuffer = response.data;
        const audioFilePath = `./public/audio/${Date.now()}_tts.mp3`;
        fs.writeFileSync(audioFilePath, audioBuffer);
        res.status(200).json({
            success: true,
            message: "Text to speech conversion successful",
            audioFilePath
        });
    } catch (error) {
        console.error("Error in Text to Speech:", error?.response?.data || error.message);
        return next(new ErrorHandler("Internal Server Error during text to speech conversion", 500));
    }
});