const axios = require('axios');

async function getAIReply(messages) {
    const groqUrl = 'https://api.groq.com/openai/v1/chat/completions';
    const modelsToTry = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'allam-2-7b'];

    for (const modelName of modelsToTry) {
        try {
            console.log("Trying model: " + modelName);
            const response = await axios.post(groqUrl, {
                model: modelName,
                messages: messages,
                temperature: 0.3
            }, {
                headers: {
                    'Authorization': 'Bearer ' + process.env.GROQ_API_KEY,
                    'Content-Type': 'application/json'
                }
            });
            return response.data.choices[0].message.content;
        } catch (error) {
            console.error("Model failed: " + modelName, error.response?.data || error.message);
        }
    }

    throw new Error("All models failed");
}

module.exports = { getAIReply };