require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/chat.html');
});

// دالة بتجيب صورة من Unsplash
async function getImage(query) {
    try {
        const url = 'https://api.unsplash.com/search/photos?query=' + query + '&client_id=' + process.env.UNSPLASH_ACCESS_KEY + '&per_page=1';
        const response = await axios.get(url);
        if (response.data.results.length > 0) {
            return response.data.results[0].urls.regular;
        }
        return null;
    } catch (error) {
        return null;
    }
}

app.post('/api/chat', async (req, res) => {
    const userMessage = req.body.message;

    try {
       const prompt =`You are a smart assistant named Halla. Always reply in Arabic. IMPORTANT: Whenever the user asks for a picture/image or asks about a physical object, person, animal, or place, you MUST include [IMAGE: exact English search keyword] at the very end of your response (for example: [IMAGE: Tutankhamun]). User question: ${userMessage}`;

        // استخدام Groq مباشرة (بدون مكتبات معقدة)
        const groqUrl = 'https://api.groq.com/openai/v1/chat/completions';
        
        const groqResponse = await axios.post(groqUrl, {
            model: 'allam-2-7b', // موديل سريع جداً ومستقر
            messages: [
                { role: 'user', content: prompt }
            ]
        }, {
            headers: {
                'Authorization': 'Bearer ' + process.env.GROQ_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        let aiReply = groqResponse.data.choices[0].message.content;
        let imageUrl = null;
        const imageMatch = aiReply.match(/\[IMAGE:\s*(.*?)\]/i);
        if (imageMatch) {
            const searchQuery = imageMatch[1].trim();
            aiReply = aiReply.replace(imageMatch[0], '').trim();
            try {
                const unsplashRes = await axios.get('https://api.unsplash.com/search/photos', {
                    params: {
                        query: searchQuery,
                        client_id: process.env.UNSPLASH_ACCESS_KEY,
                        per_page: 1
                    }
                });
                if (unsplashRes.data.results && unsplashRes.data.results.length > 0) {
                    imageUrl = unsplashRes.data.results[0].urls.regular;
                }
            } catch (imgErr) {
                console.error("Unsplash Error:", imgErr.message);
            }
        }

        res.json({ reply: aiReply, image: imageUrl });

    } catch (error) {
        console.error("Groq API Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ reply: "معلش، حصلت مشكلة. جرب تاني.", image: null });
    }
});

app.listen(port, () => {
    console.log("Server is running on: http://localhost:3000");
});