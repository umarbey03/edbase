import { db } from '../js/firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔐 Load API keys from Firestore
let apiKeys = {
    openai: null,
    openrouter: null,
    gemini: null
};

const loadApiKeys = async () => {
    try {
        const services = ['openai', 'openrouter', 'gemini'];
        for (const service of services) {
            const docRef = doc(db, 'settings', service);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const key = docSnap.data().apiKey;
                if (key && typeof key === 'string' && key.trim() !== '') {
                    apiKeys[service] = key.trim();
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
const subjectSelect = document.getElementById("subjectSelect");
const chatModeBtn = document.getElementById("chatModeBtn");
const quizModeBtn = document.getElementById("quizModeBtn");
const chatInterface = document.getElementById("chatInterface");
const quizInterface = document.getElementById("quizInterface");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const quizForm = document.getElementById("quizForm");
const quizInput = document.getElementById("quizInput");
const quizMessages = document.getElementById("quizMessages");

// 📦 State management
let currentMode = 'chat';
let quizState = {
    questionsAsked: 0,
    answers: [],
    currentQuestion: null
};

// 💬 Display message
const appendMessage = (container, role, text, aiName = null) => {
    if (!container) {
        // console.error("❌ Message container not found");
        return;
    }
    const msgDiv = document.createElement("div");
    msgDiv.className = role === 'user' ? 'text-right' : 'text-left';
    const aiPrefix = aiName ? `<span class="font-semibold block text-indigo-600">[${aiName}] </span>` : '';
    msgDiv.innerHTML = `
        <div class="${role === 'user'
            ? 'bg-blue-100 text-blue-900 ml-auto'
            : 'bg-gray-100 text-gray-800 mr-auto'}
            inline-block px-3 py-2 rounded-xl max-w-[80%] text-sm message-text">
            ${aiPrefix}${text}
        </div>`;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
};

// 🧠 Get AI response
async function getAIReply(prompt, isQuiz = false, subject = 'programming') {
    const subjects = {
        programming: "dasturlash (masalan, Python, JavaScript, Java)",
        cybersecurity: "kiberxavfsizlik (masalan, tarmoq xavfsizligi, etik xakerlik)",
        'it-infrastructure': "IT infratuzilmasi (masalan, serverlar, bulutli hisoblash)",
        'software-development': "dasturiy ta’minot ishlab chiqish (masalan, Agile, DevOps)"
    };
    
    const systemPrompt = isQuiz
        ? `You are an expert in ${subjects[subject]}. Generate one challenging but answerable question related to ${subjects[subject]} for a student to answer in written form. Only provide the question, no explanations.`
        : `You are an expert in ${subjects[subject]}. Provide a brief answer (1-2 sentences) to questions related to ${subjects[subject]}. For detailed answers, prompt the user to use the student panel at https://edbase.uz/register, including an HTML button: <button onclick="window.location.href='https://edbase.uz/register'" class="bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600">Auth</button>. If the question is outside ${subjects[subject]}, politely decline and ask for a relevant question.`;

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

// 📝 Analyze quiz answers
async function analyzeAnswers(subject) {
    const subjects = {
        programming: "dasturlash",
        cybersecurity: "kiberxavfsizlik",
        'it-infrastructure': "IT infratuzilmasi",
        'software-development': "dasturiy ta’minot ishlab chiqish"
    };
    
    const prompt = `You are an expert in ${subjects[subject]}. Analyze the following student answers to 5 questions about ${subjects[subject]} and provide detailed feedback. Highlight strengths, weaknesses, and suggest areas for improvement. Here are the questions and answers:\n\n${quizState.answers.map((qa, i) => `Question ${i + 1}: ${qa.question}\nAnswer: ${qa.answer}`).join('\n\n')}`;
    
    const { reply, aiName } = await getAIReply(prompt, false, subject);
    return { feedback: reply, aiName };
}

// 📦 Initialize page
document.addEventListener("DOMContentLoaded", async () => {
    const apiKeysLoaded = await loadApiKeys();
    if (!apiKeysLoaded) {
        appendMessage(chatMessages, 'bot', "❌ API kalitlari yuklanmadi. Administrator bilan bog'laning.");
        appendMessage(quizMessages, 'bot', "❌ API kalitlari yuklanmadi. Administrator bilan bog'laning.");
        if (chatForm) chatForm.querySelector('button').disabled = true;
        if (quizForm) quizForm.querySelector('button').disabled = true;
    }

    // 🔄 Mode switching
    chatModeBtn.addEventListener("click", () => {
        currentMode = 'chat';
        chatInterface.classList.remove("hidden");
        quizInterface.classList.add("hidden");
        chatModeBtn.classList.add("bg-indigo-600", "text-white");
        chatModeBtn.classList.remove("bg-white", "text-indigo-600", "border", "border-indigo-600");
        quizModeBtn.classList.add("bg-white", "text-indigo-600", "border", "border-indigo-600");
        quizModeBtn.classList.remove("bg-indigo-600", "text-white");
        quizState = { questionsAsked: 0, answers: [], currentQuestion: null };
    });

    quizModeBtn.addEventListener("click", () => {
        currentMode = 'quiz';
        chatInterface.classList.add("hidden");
        quizInterface.classList.remove("hidden");
        quizModeBtn.classList.add("bg-indigo-600", "text-white");
        quizModeBtn.classList.remove("bg-white", "text-indigo-600", "border", "border-indigo-600");
        chatModeBtn.classList.add("bg-white", "text-indigo-600", "border", "border-indigo-600");
        chatModeBtn.classList.remove("bg-indigo-600", "text-white");
        quizState = { questionsAsked: 0, answers: [], currentQuestion: null };
        startQuiz();
    });

    // 📤 Chat form submission
    if (chatForm) {
        chatForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const message = chatInput?.value.trim();
            if (!message) return;

            appendMessage(chatMessages, 'user', message);
            chatInput.value = "";
            appendMessage(chatMessages, 'bot', "⏳ Yozmoqda...");

            const subject = subjectSelect.value;
            const { reply, aiName } = await getAIReply(message, false, subject);
            chatMessages.lastChild.remove();
            appendMessage(chatMessages, 'bot', reply, aiName);
        });
    }

    // 📤 Quiz form submission
    if (quizForm) {
        quizForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const answer = quizInput?.value.trim();
            if (!answer) return;

            appendMessage(quizMessages, 'user', answer);
            quizInput.value = "";
            quizState.answers.push({ question: quizState.currentQuestion, answer });
            quizState.questionsAsked++;

            if (quizState.questionsAsked % 5 === 0) {
                appendMessage(quizMessages, 'bot', "⏳ Javoblaringiz tahlil qilinmoqda...");
                const { feedback, aiName } = await analyzeAnswers(subjectSelect.value);
                quizMessages.lastChild.remove();
                appendMessage(quizMessages, 'bot', feedback, aiName);
            }

            startQuiz();
        });
    }

    // 🚀 Start quiz
    async function startQuiz() {
        const subject = subjectSelect.value;
        appendMessage(quizMessages, 'bot', "⏳ Savol tayyorlanmoqda...");
        const { reply, aiName } = await getAIReply("Generate a question", true, subject);
        quizMessages.lastChild.remove();
        quizState.currentQuestion = reply;
        appendMessage(quizMessages, 'bot', reply, aiName);
    }
});