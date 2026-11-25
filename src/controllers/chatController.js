const { getAIReply } = require('../services/aiService');
const { getWikiImage, getUnsplashImage } = require('../services/imageService');
const cache = require('../utils/cache');
const prompts = require('../config/prompts');

async function handleChat(req, res, next) {
    const userMessage = req.body.message;
    const chatHistory = req.body.history || [];
    const mode = req.body.mode || 'general';

    const lastHistoryText = chatHistory.length > 0 ? (chatHistory[chatHistory.length - 1].text || '') : '';
    const cacheKey = 'v2_' + mode + '_' + lastHistoryText.slice(-30).trim().toLowerCase() + '_' + userMessage.trim().toLowerCase();

    if (cache.has(cacheKey)) {
        console.log("Returned from Cache 💾");
        return res.json(cache.get(cacheKey));
    }

    try {
        const systemPrompt = prompts[mode] || prompts['general'];
        let messages = [{ role: 'system', content: systemPrompt }];

        chatHistory.slice(-8).forEach(msg => {
            messages.push({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.text });
        });
        messages.push({ role: 'user', content: userMessage });

        let aiReply = await getAIReply(messages);
        let imageUrl = null;
        let pdfTitle = null;

        const imageMatch = aiReply.match(/\[IMAGE:\s*(.*?)\]/i);
        if (imageMatch) {
            const searchQuery = imageMatch[1].trim();
            aiReply = aiReply.replace(imageMatch[0], '').trim();
            imageUrl = await getWikiImage(searchQuery) || await getUnsplashImage(searchQuery);
        }

      const pdfMatch = aiReply.match(/\[PDF:\s*(.*?)\]/i);
if (pdfMatch) {
    pdfTitle = pdfMatch[1].trim();
    aiReply = aiReply.replace(pdfMatch[0], '').trim();
} else if (/pdf|بي\s*دي\s*اف|بيدياف|تنزيل\s*ملف|تحميل\s*ملف/i.test(userMessage) && aiReply.length > 80) {
    pdfTitle = 'ملف حلّها';
}

        const finalResponse = { reply: aiReply, image: imageUrl, pdfTitle: pdfTitle };
        cache.set(cacheKey, finalResponse);
        res.json(finalResponse);
    } catch (error) {
        next(error);
    }
}

module.exports = { handleChat };