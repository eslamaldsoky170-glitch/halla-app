require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// تفعيل قراءة الـ JSON
app.use(express.json());

// ربط مجلد الملفات الثابتة
app.use(express.static(path.join(__dirname, 'public')));

// مسار الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/chat.html'));
});

// مسارات الشات (الـ API)
const chatRoutes = require('./src/routes/chatRoutes');
app.use('/api/chat', chatRoutes);

// ربط الحارس (middleware) لمعالجة الأخطاء
const errorHandler = require('./src/middlewares/errorHandler');
app.use(errorHandler);

// تشغيل السيرفر
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log("Server is running on: http://localhost:3000");
    });
}

module.exports = app;