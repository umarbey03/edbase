import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔐 Load API keys from Firestore
let apiKeys = {
    openai: null,
    openrouter: null,
    gemini: null
};

document.getElementById("chatModal").classList = "fixed bottom-20 right-6 w-80 h-[45vh] bg-white border border-gray-300 rounded-xl shadow-lg hidden flex flex-col overflow-hidden z-50"
document.getElementById("chatModal").innerHTML = `
<!-- Header -->
        <div
            class="bg-gradient-to-r from-blue-600 to-indigo-500 text-white px-4 py-3 flex justify-between items-center">
            <h3 class="text-sm font-semibold">🤖 EdBase Support Bot</h3>
            <button id="closeChatBtn" class="text-white text-xl leading-none hover:text-gray-200">×</button>
        </div>

        <!-- Chat Body -->
        <div id="chatMessages"
            class="flex-1 p-4 space-y-2 overflow-y-auto text-sm text-gray-800 scroll-smooth chat-container">
            <div class="text-gray-500 italic">Xush kelibsiz! Savollaringizni shu yerga yozing 👇</div>
            <div class="text-gray-500 italic">OpenAI, OpenRouter va Gemini AI’lardan javob olinadi.</div>
        </div>

        <!-- Input Area -->
        <form id="chatForm" class="flex items-center border-t border-gray-200">
            <input type="text" id="chatInput" placeholder="Savolingizni yozing..."
                class="flex-1 p-3 text-sm outline-none placeholder-gray-400" autocomplete="off" />
            <button type="submit" class="bg-[#045d8f] text-white px-3 py-2 rounded-lg text-sm hover:bg-[#03486f]">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path
                        d="M9.5 13.5l-.4 4.1c.6 0 .9-.2 1.3-.6l2-1.9 4.1 3c.8.4 1.3.2 1.5-.7l2.7-12.6c.3-1.2-.4-1.7-1.3-1.4L2.9 10.9c-1.2.4-1.2 1.2-.2 1.5l4.5 1.4L18.1 7.2c.4-.2.8 0 .6.3L9.5 13.5z" />
                </svg>
            </button>
        </form>
`
const loadApiKeys = async () => {
    try {
        const services = ['openai', 'openrouterai', 'gemini'];
        for (const service of services) {
            const docRef = doc(db, 'settings', service);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const key = docSnap.data().apiKey;
                if (key && typeof key === 'string' && key.trim() !== '') {
                    apiKeys[service] = key.trim();
                    // console.log(`✅ ${service} key loaded: ${key.substring(0, 5)}...`);
                } else {
                    // console.error(`❌ ${service} key is invalid or empty`);
                }
            } else {
                // console.error(`❌ Firestore document 'settings/${service}' not found`);
            }
        }
        return Object.values(apiKeys).some(key => key !== null);
    } catch (err) {
        // console.error("❌ Error loading Firebase API keys:", err);
        return false;
    }
};

// 🎯 UI elements
const chatToggleBtn = document.getElementById("openChatBtn");
const chatModal = document.getElementById("chatModal");
const closeChatBtn = document.getElementById("closeChatBtn");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");

// 📦 Chat modal management
document.addEventListener("DOMContentLoaded", async () => {
    const apiKeysLoaded = await loadApiKeys();
    if (!apiKeysLoaded) {
        appendMessage('bot', "❌ API kalitlari yuklanmadi. Administrator bilan bog'laning.");
        if (chatForm) chatForm.querySelector('button').disabled = true;
    }

    if (chatToggleBtn) {
        chatToggleBtn.addEventListener("click", () => {
            if (chatModal) chatModal.classList.remove("hidden");
        });
    }

    if (closeChatBtn) {
        closeChatBtn.addEventListener("click", () => {
            if (chatModal) chatModal.classList.add("hidden");
        });
    }
});

// 💬 Display new message
const appendMessage = (role, text, aiName = null) => {
    if (!chatMessages) {
        // console.error("❌ chatMessages elementi topilmadi");
        return;
    }
    const msgDiv = document.createElement("div");
    msgDiv.className = role === 'user' ? 'text-right' : 'text-left';
    const aiPrefix = aiName ? `<span class="font-semibold text-indigo-600">[${aiName}] </span>` : '';
    msgDiv.innerHTML = `
        <div class="${role === 'user'
            ? 'bg-blue-100 text-blue-900 ml-auto'
            : 'bg-gray-100 text-gray-800 mr-auto'}
            inline-block px-3 py-2 rounded-xl max-w-[80%] text-sm message-text">
            ${aiPrefix}${text}
        </div>`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
};

// 🧠 Get AI response with IT domain restriction and registration prompt
async function getAIReply(prompt) {
    const systemPrompt = `You are an expert in IT (Information Technology). Provide a brief answer (1-2 sentences) to IT-related questions (e.g., programming, software development, cybersecurity, IT infrastructure). For detailed answers, prompt the user to register and use the student panel at https://edbase.uz/auth.html, including an HTML button: <button onclick="window.location.href='/auth.html?mode=register'" class="bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600">More</button>. If the question is outside IT, politely decline and ask for an IT-related question.`;

    const services = [
        {
            name: 'OpenAI',
            key: apiKeys.openai,
            url: 'https://api.openai.com/v1/chat/completions',
            headers: () => ({
                "Authorization": `Bearer ${apiKeys.openai}`,
                "Content-Type": "application/json"
            }),
            body: () => ({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ],
                stream: false
            }),
            parseResponse: (data) => data.choices[0].message.content
        },
        {
            name: 'OpenRouter',
            key: apiKeys.openrouter,
            url: 'https://openrouter.ai/api/v1/chat/completions',
            headers: () => ({
                "Authorization": `Bearer ${apiKeys.openrouter}`,
                "Content-Type": "application/json",
                "HTTP-Referer": window.location.href || "https://edbase.uz",
                "X-Title": "Chat Application"
            }),
            body: () => ({
                model: "openai/gpt-3.5-turbo",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ],
                stream: false
            }),
            parseResponse: (data) => data.choices[0].message.content
        },
        {
            name: 'Gemini',
            key: apiKeys.gemini,
            url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKeys.gemini}`,
            headers: () => ({
                "Content-Type": "application/json"
            }),
            body: () => ({
                contents: [
                    {
                        parts: [
                            { text: `${systemPrompt}\n\nUser: ${prompt}` }
                        ]
                    }
                ]
            }),
            parseResponse: (data) => data.candidates[0].content.parts[0].text
        }
    ];

    for (const service of services) {
        if (!service.key) {
            // console.warn(`❌ ${service.name} key not available, skipping`);
            continue;
        }

        try {
            const response = await fetch(service.url, {
                method: "POST",
                headers: service.headers(),
                body: JSON.stringify(service.body())
            });

            if (!response.ok) {
                const errorData = await response.json();
                // console.error(`❌ ${service.name} error:`, JSON.stringify(errorData, null, 2));
                continue;
            }

            const data = await response.json();
            const reply = service.parseResponse(data);
            // console.log(`✅ ${service.name} response received`);
            return { reply, aiName: service.name };
        } catch (error) {
            // console.error(`❌ ${service.name} network error:`, error);
            continue;
        }
    }

    return { reply: "❌ No AI responded. Contact the administrator.", aiName: null };
}

// 📤 Message submission form
if (chatForm) {
    chatForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const message = chatInput?.value.trim();
        if (!message) return;

        appendMessage('user', message);
        chatInput.value = "";
        appendMessage('bot', "⏳ Yozmoqda...");

        const { reply, aiName } = await getAIReply(message);
        chatMessages.lastChild.remove();
        appendMessage('bot', reply, aiName);
    });
}