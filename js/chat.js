import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔐 API kalitni olish (Firebase'dan)
let apiKey = '';
const loadApiKey = async () => {
    try {
        const docRef = doc(db, 'settings', 'openrouterai');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            apiKey = docSnap.data().apiKey;
        } else {
            console.error("❌ API key topilmadi");
        }
    } catch (err) {
        console.error("❌ Firebase API key olishda xatolik:", err);
    }
};

// 🎯 UI elementlar
const chatToggleBtn = document.getElementById("openChatBtn");
const chatModal = document.getElementById("chatModal");
const closeChatBtn = document.getElementById("closeChatBtn");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");

// 📦 Chat oynasini boshqarish
document.addEventListener("DOMContentLoaded", () => {
    chatToggleBtn.addEventListener("click", () => {
        chatModal.classList.remove("hidden");
    });

    closeChatBtn.addEventListener("click", () => {
        chatModal.classList.add("hidden");
    });
});

// 💬 Yangi xabar ko‘rsatish
const appendMessage = (role, text) => {
    const msgDiv = document.createElement("div");
    msgDiv.className = role === 'user' ? 'text-right' : 'text-left';
    msgDiv.innerHTML = `
        <div class="${role === 'user'
            ? 'bg-blue-100 text-blue-900 ml-auto'
            : 'bg-gray-100 text-gray-800 mr-auto'}
            inline-block px-3 py-2 rounded-xl max-w-[80%] text-sm">
            ${text}
        </div>`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
};

// 🧠 AI'dan javob olish
const getAIReply = async (message) => {
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "openai/gpt-3.5-turbo",
                messages: [
                    { role: "system", content: "You are a helpful support assistant." },
                    { role: "user", content: message }
                ]
            })
        });

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "❌ Javobni olishda xatolik.";
    } catch (err) {
        console.error("❌ Javob olishda xatolik:", err);
        return "❌ Serverga ulanishda xatolik.";
    }
};

// 📤 Xabar yuborish formasi
chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;

    appendMessage('user', message);
    chatInput.value = "";
    appendMessage('bot', "⏳ Yozmoqda...");

    const reply = await getAIReply(message);
    chatMessages.lastChild.remove(); // remove loading
    appendMessage('bot', reply);
});

// 🚀 Boshlanishda API kalitni yukla
loadApiKey();
