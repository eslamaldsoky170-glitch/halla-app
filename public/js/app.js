const firebaseConfig = {
  apiKey: "AIzaSyAwxoUFenT4HunNCfQWxWCrUCaBB7dlde8",
  authDomain: "halla-app-8b4dd.firebaseapp.com",
  projectId: "halla-app-8b4dd",
  storageBucket: "halla-app-8b4dd.firebasestorage.app",
  messagingSenderId: "509081270409",
  appId: "1:509081270409:web:d8410b9a56412dd62d2e58"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();
const db = firebase.firestore();

let currentUser = null;
let currentChatId = null;
let unsubscribeMessages = null;
let currentMessages = [];
let currentMode = 'general';

const modeButtons = document.querySelectorAll('.mode-btn');
modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.getAttribute('data-mode');

        const chatBox = document.getElementById('chat-box');
        let welcomeMsg = "";
        if (currentMode === 'general') {
            welcomeMsg = "أهلاً بك! أنا المساعد العام. اسألني أي حاجة.";
        } else if (currentMode === 'career') {
            welcomeMsg = "أهلاً بك! أنا مدرب التوظيف. احكيلي عن نفسك وايه التحديات اللي بتواجهك في سوق العمل؟";
        } else if (currentMode === 'learning') {
            welcomeMsg = "أهلاً بك! أنا مستشار التعلم. عايز تتعلم إيه وأنا هعملك خطة كاملة!";
        }
        chatBox.innerHTML = `<div class="msg bot">${welcomeMsg}</div>`;
    });
});
// 2. تسجيل الدخول والخروج
document.getElementById('login-btn').addEventListener('click', () => {
    auth.signInWithPopup(provider).catch(error => alert("خطأ في الدخول: " + error.message));
});

document.getElementById('logout-btn').addEventListener('click', () => auth.signOut());

auth.onAuthStateChanged((user) => {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userInfo = document.getElementById('user-info');

    if (user) {
        currentUser = user;
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        userInfo.style.display = 'block';
        document.getElementById('user-photo').src = user.photoURL || 'https://via.placeholder.com/40';
        document.getElementById('user-name').innerText = user.displayName || 'مستخدم';
        if (!currentChatId) {
            document.getElementById('chat-box').innerHTML = `<div class="msg bot">أهلاً بك! اختر محادثة من القائمة أو ابدأ محادثة جديدة.</div>`;
        }
    } else {
        currentUser = null;
        currentChatId = null;
        loginBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        userInfo.style.display = 'none';
        document.getElementById('history-list').innerHTML = '';
        document.getElementById('chat-box').innerHTML = `<div class="msg bot">أهلاً بك! سجل دخولك لحفظ محادثاتك.</div>`;
    }
})
// 3. إدارة المحادثات
document.getElementById('new-chat-btn').addEventListener('click', async function () {
    if (!currentUser) return alert("سجل دخولك الأول");
    const docRef = await db.collection('users').doc(currentUser.uid).collection('chats').add({
        title: "محادثة جديدة",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    loadMessages(docRef.id);
    loadUserChats();
});

function loadUserChats() {
    if (!currentUser) return;
    const historyList = document.getElementById('history-list');
    db.collection('users').doc(currentUser.uid).collection('chats')
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            historyList.innerHTML = '';
            if (snapshot.empty) {
                historyList.innerHTML = '<p style="color: #888; font-size: 12px; text-align: center; margin-top: 20px;">لا توجد محادثات بعد</p>';
                return;
            }
            snapshot.forEach((doc) => {
                const chatData = doc.data();
                const chatItem = document.createElement('div');
                chatItem.className = 'chat-history-item';
                if (doc.id === currentChatId) chatItem.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';

                const titleSpan = document.createElement('span');
                titleSpan.innerText = chatData.title || 'محادثة';
                titleSpan.onclick = () => loadMessages(doc.id);
                titleSpan.className = 'chat-title-text';

                const deleteBtn = document.createElement('span');
                deleteBtn.innerText = '🗑️';
                deleteBtn.className = 'delete-chat-btn';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    deleteChat(doc.id);
                };

                chatItem.appendChild(titleSpan);
                chatItem.appendChild(deleteBtn);
                historyList.appendChild(chatItem);
            });
        });
}

async function deleteChat(chatId) {
    if (!confirm("هل أنت متأكد إنك عايز تمسح المحادثة دي؟")) return;
    try {
        const messagesRef = db.collection('users').doc(currentUser.uid).collection('chats').doc(chatId).collection('messages');
        const messagesSnapshot = await messagesRef.get();
        const batch = db.batch();
        messagesSnapshot.forEach((doc) => { batch.delete(doc.ref); });
        await batch.commit();
        await db.collection('users').doc(currentUser.uid).collection('chats').doc(chatId).delete();

        if (currentChatId === chatId) {
            currentChatId = null;
            currentMessages = [];
            document.getElementById('chat-box').innerHTML = '<div class="msg bot">تم مسح المحادثة. ابدأ محادثة جديدة!</div>';
        }
    } catch (error) {
        console.error("Error deleting chat: ", error);
    }
}
// 4. تحميل الرسائل
function loadMessages(chatId) {
    currentChatId = chatId;
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML = '<div class="msg bot">جاري تحميل الرسائل...</div>';

    if (unsubscribeMessages) unsubscribeMessages();

    unsubscribeMessages = db.collection('users').doc(currentUser.uid).collection('chats').doc(chatId).collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            chatBox.innerHTML = '';
            currentMessages = [];

            if (snapshot.empty) {
                chatBox.innerHTML = '<div class="msg bot">المحادثة فاضية. ابدأ الكلام!</div>';
            }

            snapshot.forEach((doc) => {
                const msg = doc.data();
                currentMessages.push({ sender: msg.sender, text: msg.text });
                let formattedText = (typeof marked !== 'undefined') ? marked.parse(msg.text) : msg.text.replace(/\n/g, '<br>');

                if (msg.sender === 'user') {
                    chatBox.innerHTML += '<div class="msg user">' + formattedText + '</div>';
                } else {
                    let botHtml = '<div class="msg bot">' + formattedText;
                    if (msg.image) {
                        botHtml += '<br><img src="' + msg.image + '" style="max-width: 100%; border-radius: 8px; margin-top: 8px;">';
                        botHtml += '<br><button onclick="window.downloadImage(\'' + msg.image + '\')" class="download-btn">⬇️ تحميل الصورة</button>';
                    }
                    botHtml += '<button class="speak-btn" onclick="window.speakText(this)">🔊 استماع</button></div>';
                    chatBox.innerHTML += botHtml;
                }
            });
            chatBox.scrollTop = chatBox.scrollHeight;
        });
}

// 5. إرسال رسالة
async function sendMessage() {
    var input = document.getElementById('user-input');
    var chatBox = document.getElementById('chat-box');
    var typingIndicator = document.getElementById('typing-indicator');
    var text = input.value;
    if (!text || !currentUser) return;

    if (!currentChatId) {
        const docRef = await db.collection('users').doc(currentUser.uid).collection('chats').add({
            title: "محادثة جديدة",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        currentChatId = docRef.id;
        loadMessages(currentChatId);
    }

    input.value = '';

    db.collection('users').doc(currentUser.uid).collection('chats').doc(currentChatId).collection('messages').add({
        text: text,
        sender: 'user',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    typingIndicator.style.display = 'flex';
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        var response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                history: currentMessages,
                mode: currentMode
            })
        });
        var data = await response.json();

        typingIndicator.style.display = 'none';

        db.collection('users').doc(currentUser.uid).collection('chats').doc(currentChatId).collection('messages').add({
            text: data.reply,
            image: data.image || null,
            sender: 'bot',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
       if (data.pdfTitle) {
  var pdfWin = window.open('', '_blank');
  if (pdfWin) {
    pdfWin.document.write(
      '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>' +
        data.pdfTitle +
        '</title><style>body{font-family:Tahoma,Arial,sans-serif;padding:25px;line-height:1.8;white-space:pre-wrap;}</style></head><body><h2>' +
        data.pdfTitle +
        '</h2><div>' +
        (data.reply || '') +
        '</div></body></html>'
    );
    pdfWin.document.close();
    pdfWin.focus();
    pdfWin.print();
  }
}

        db.collection('users').doc(currentUser.uid).collection('chats').doc(currentChatId).get().then(doc => {
            if (doc.data().title === "محادثة جديدة") {
                db.collection('users').doc(currentUser.uid).collection('chats').doc(currentChatId).update({
                    title: text.substring(0, 20) + "..."
                });
            }
        });
    } catch (error) {
        typingIndicator.style.display = 'none';
        chatBox.innerHTML += '<div class="msg bot">معلش، السيرفر مش متاح دلوقتي.</div>';
    }
}document.getElementById('btn').addEventListener('click', sendMessage);
document.getElementById('user-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') sendMessage();
});
// 6. وظائف إضافية
window.downloadImage = async function (imageUrl) {
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = 'none';
        a.href = url;
        a.download = 'halla-image.jpg';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        alert("المتصفح منع التحميل، جرب كليك يمين وحفظ الصورة.");
    }
};

window.speakText = function (btn) {
    window.speechSynthesis.cancel();
    let msgDiv = btn.parentElement;
    let textToSpeak = msgDiv.innerText.replace('🔊 استماع', '').replace('⬇️ تحميل الصورة', '').trim();
    let utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'ar-SA';
    window.speechSynthesis.speak(utterance);
};

const micBtn = document.getElementById('mic-btn');
const userInput = document.getElementById('user-input');

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-EG';
    recognition.interimResults = false;

    micBtn.addEventListener('click', () => {
        recognition.start();
        micBtn.style.backgroundColor = '#e74c3c';
        micBtn.innerText = '🔴';
    });

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript;
        sendMessage();
    };

    recognition.onend = () => {
        micBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
        micBtn.innerText = '🎤';
    };
} else {
    micBtn.style.display = 'none';
}
// فتح وإغلاق قائمة المحادثات الجانبية
const menuDrawerBtn = document.getElementById('menu-drawer-btn');
const closeDrawerBtn = document.getElementById('close-drawer-btn');
const chatsDrawer = document.getElementById('chats-drawer');

if (menuDrawerBtn && chatsDrawer) {
    menuDrawerBtn.addEventListener('click', () => {
        const isOpen = chatsDrawer.style.display === 'block';
        chatsDrawer.style.display = isOpen ? 'none' : 'block';
    });
}

if (closeDrawerBtn && chatsDrawer) {
    closeDrawerBtn.addEventListener('click', () => {
        chatsDrawer.style.display = 'none';
    });
}
window.__hallaEscapePdfText = function (text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

window.exportReplyAsPDF = function (content, title) {
    const docTitle = title || 'Halla-Document';
    const safeTitle = window.__hallaEscapePdfText(docTitle);
    const safeContent = window.__hallaEscapePdfText(content);
    const isArabic = /[\u0600-\u06FF]/.test(String(content || '') + String(docTitle));

    const printWin = window.open('', '_blank', 'width=820,height=900');
    if (!printWin) {
        alert('يرجى السماح بالنوافذ المنبثقة لتصدير ملف PDF.');
        return;
    }

    const html =
        '<!DOCTYPE html>' +
        '<html lang="' + (isArabic ? 'ar' : 'en') + '" dir="' + (isArabic ? 'rtl' : 'ltr') + '">' +
        '<head>' +
        '<meta charset="UTF-8">' +
        '<title>' + safeTitle + '</title>' +
        '<style>' +
        'body{font-family:"Segoe UI",Tahoma,Arial,sans-serif;line-height:1.8;padding:36px;color:#1e293b;max-width:820px;margin:0 auto;}' +
        'h1{color:#0f172a;border-bottom:2px solid #38bdf8;padding-bottom:10px;font-size:22px;margin-top:0;}' +
        '.pdf-body{white-space:pre-wrap;font-size:15px;margin-top:20px;}' +
        '.pdf-footer{margin-top:36px;padding-top:12px;border-top:1px solid #cbd5e1;color:#64748b;font-size:12px;text-align:center;}' +
        '</style>' +
        '</head>' +
        '<body>' +
        '<h1>' + safeTitle + '</h1>' +
        '<div class="pdf-body">' + safeContent + '</div>' +
        '<div class="pdf-footer">تم الإنشاء بواسطة حلّها</div>' +
        '</body>' +
        '</html>';

    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();

    setTimeout(function () {
        try {
            printWin.focus();
            printWin.print();
        } catch (err) {
            console.error('PDF print error:', err);
        }
    }, 250);
};
window.hallaPdfStore = window.hallaPdfStore || {};

window.buildPdfCardHtml = function (pdfId, title) {
    const safeId = window.__hallaEscapePdfText(pdfId);
    const safeTitle = window.__hallaEscapePdfText(title || 'ملف PDF');

    return (
        '<div class="halla-pdf-card" style="' +
        'margin-top:10px;' +
        'padding:10px 14px;' +
        'border-radius:12px;' +
        'background:rgba(15,23,42,0.55);' +
        'border:1px solid rgba(148,163,184,0.22);' +
        'display:flex;' +
        'align-items:center;' +
        'justify-content:space-between;' +
        'gap:10px;' +
        'color:inherit;">' +
        '<div style="display:flex;align-items:center;gap:8px;min-width:0;">' +
        '<span style="color:#38bdf8;font-size:16px;flex-shrink:0;">📄</span>' +
        '<span style="font-size:13.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' +
        safeTitle +
        '</span>' +
        '</div>' +
        '<button type="button" class="halla-pdf-download-btn" data-pdf-id="' +
        safeId +
        '" style="' +
        'background:rgba(56,189,248,0.15);' +
        'color:#38bdf8;' +
        'border:1px solid rgba(56,189,248,0.45);' +
        'border-radius:8px;' +
        'padding:5px 11px;' +
        'font-family:inherit;' +
        'font-weight:700;' +
        'font-size:12.5px;' +
        'cursor:pointer;' +
        'display:inline-flex;' +
        'align-items:center;' +
        'gap:5px;' +
        'flex-shrink:0;">' +
        '<span>⬇</span>' +
        '<span>تنزيل</span>' +
        '</button>' +
        '</div>'
    );
};

if (!window.__hallaPdfDelegationBound) {
    window.__hallaPdfDelegationBound = true;
    document.addEventListener('click', function (e) {
        const btn = e.target.closest('.halla-pdf-download-btn');
        if (!btn) return;

        const pdfId = btn.getAttribute('data-pdf-id');
        const item = pdfId && window.hallaPdfStore ? window.hallaPdfStore[pdfId] : null;
        if (item && typeof window.exportReplyAsPDF === 'function') {
            window.exportReplyAsPDF(item.content, item.title);
        }
    });
}