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

// 1. دالة بتجيب الصورة من ويكيبيديا (عشان الفراعنة والصور التاريخية)
async function getWikiImage(query) {
    try {
        // نبحث في ويكيبيديا الإنجليزي عشان الصور أوضح
        let wikiUrl = 'https://en.wikipedia.org/w/api.php?action=query&titles=' + encodeURIComponent(query) + '&prop=pageimages&format=json&pithumbsize=800&origin=*';
        let response = await axios.get(wikiUrl);
        let pages = response.data.query.pages;
        let pageId = Object.keys(pages)[0];

        if (pageId !== '-1' && pages[pageId].thumbnail) {
            return pages[pageId].thumbnail.source; 
        }
        return null; 
    } catch (error) {
        return null;
    }
}

// 2. دالة احتياطية بتجيب من Unsplash (لو الحاجة مش تاريخية)
async function getUnsplashImage(query) {
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
    const chatHistory = req.body.history || []; 

    try {
        let messages = [
            { 
                role: 'system', 
                content: "أنت مساعد ذكي اسمك 'حلّها'. أجب باللغة العربية دائماً. " +
                         "هام جداً: أنت تعمل داخل تطبيق يمتلك القدرة على عرض الصور. ممنوع تماماً أن تقول (لا أستطيع إرسال صور). " +
                         "إذا طلب المستخدم صورة (مثل: عاوز صورة، هات صورة)، " +
                         "اعتمد على تاريخ المحادثة لتعرف الشخصية المطلوب، " +
                         "ثم أضف في نهاية إجابتك هذا الوسم بالظبط: [IMAGE: English_Keyword]. " +
                         "مثال: إذا كان المستخدم يسأل عن أحمس وقال 'عاوز صورة'، أضف [IMAGE: Ahmose I]. " +
                         "لا تعتذر، فقط أضف الوسم."
            }
        ];

        // إضافة تاريخ المحادثة عشان الذكاء الاصطناعي يفتكر
        const recentHistory = chatHistory.slice(-6);
        recentHistory.forEach(msg => {
            messages.push({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.text
            });
        });

        messages.push({ role: 'user', content: userMessage });

        const groqUrl = 'https://api.groq.com/openai/v1/chat/completions';
        
        const groqResponse = await axios.post(groqUrl, {
            model: 'allam-2-7b', // الموديل بتاعك اللي شغال
            messages: messages
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
            
            // بنجرب نجيب من ويكيبيديا الأول (عشان الصور التاريخية)
            imageUrl = await getWikiImage(searchQuery);
            
            // لو ملقاش في ويكيبيديا، بنجرب Unsplash
            if (!imageUrl) {
                imageUrl = await getUnsplashImage(searchQuery);
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