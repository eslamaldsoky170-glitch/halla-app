require('dotenv').config();
const axios = require('axios');

async function listModels() {
    try {
        const response = await axios.get('https://api.groq.com/openai/v1/models', {
            headers: {
                'Authorization': 'Bearer ' + process.env.GROQ_API_KEY
            }
        });

        console.log("✅ الموديلات المتاحة لحسابك هي:");
        response.data.data.forEach(model => {
            console.log("- " + model.id);
        });
    } catch (error) {
        console.error("❌ حدث خطأ:", error.response ? error.response.data : error.message);
    }
}

listModels();