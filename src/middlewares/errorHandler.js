function errorHandler(err, req, res, next) {
    console.error("Server Error:", err.message);
    res.status(500).json({ 
        reply: "معلش، حدث خطأ داخلي في السيرفر. جرب تاني بعد شوية.", 
        image: null 
    });
}
module.exports = errorHandler;