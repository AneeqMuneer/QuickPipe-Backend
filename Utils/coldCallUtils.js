const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

exports.Voicebot = async (message) => {

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

    return answer;
};