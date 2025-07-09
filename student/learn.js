// 📁 /js/learn.js
import { db } from '../js/firebase-config.js';
import {
    doc,
    getDoc,
    addDoc,
    collection,
    serverTimestamp,
    query,
    where,
    orderBy,
    onSnapshot,
    setDoc,
    getDocs,
    increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔒 Check user
const currentUser = JSON.parse(localStorage.getItem("currentUser"));
if (!currentUser || currentUser.role !== "student") {
    window.location.href = "/auth.html?redirectUrl=" + encodeURIComponent(window.location.pathname + window.location.search);
}

// 🔧 DOM
const urlParams = new URLSearchParams(window.location.search);
const courseId = urlParams.get("courseId");
console.log("courseId :", urlParams);


const courseTitle = document.getElementById("courseTitle");
const videoPlayer = document.getElementById("videoPlayer");
const lessonTitle = document.getElementById("lessonTitle");
const instructorInfo = document.getElementById("instructorInfo");
const moduleList = document.getElementById("moduleList");

let selectedLesson = null;

// 📦 Load course and render
async function loadCourse() {
    try {
        const courseSnap = await getDoc(doc(db, "courses", courseId));
        if (!courseSnap.exists()) throw new Error("Kurs topilmadi");
        const course = courseSnap.data();

        courseTitle.textContent = course.title;
        instructorInfo.textContent = `${course.instructorName} | ${course.centerName}`;

        await renderModules(courseId); // 🔁 Firestore’dan modullarni yuklaydi
    } catch (err) {
        console.error("❌ Kurs yuklashda xatolik:", err);
    }
}

async function renderModules(courseId) {
    const modulesRef = collection(db, "courses", courseId, "modules");
    const modulesSnap = await getDocs(modulesRef);

    moduleList.innerHTML = "";

    for (const moduleDoc of modulesSnap.docs) {
        const moduleData = moduleDoc.data();
        const moduleId = moduleDoc.id;

        const wrapper = document.createElement("div");
        wrapper.className = "border rounded overflow-hidden";

        const header = document.createElement("div");
        header.className = "bg-gray-100 px-3 py-2 font-semibold cursor-pointer hover:bg-gray-200";
        header.textContent = moduleData.title;

        const content = document.createElement("ul");
        content.className = "hidden px-4 py-2 bg-white space-y-1";

        header.addEventListener("click", () => {
            content.classList.toggle("hidden");
        });

        const lessonsRef = collection(db, "courses", courseId, "modules", moduleId, "lessons");
        const lessonsSnap = await getDocs(lessonsRef);

        const sortedLessons = lessonsSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => (a.order || 0) - (b.order || 0));

        let canAccessNext = true;

        for (const [index, lesson] of sortedLessons.entries()) {
            const lessonId = lesson.id;
            const assignmentId = `${courseId}_${lessonId}_${currentUser.uid}`;
            const assignmentRef = doc(db, "assignments", assignmentId);
            const assignmentSnap = await getDoc(assignmentRef);

            const isSubmitted = assignmentSnap.exists();

            const li = document.createElement("li");

            if (canAccessNext) {
                li.className = "text-blue-600 cursor-pointer hover:underline text-sm";
                li.innerHTML = `${lesson.title} ${isSubmitted ? '✅' : ''}`;
                li.addEventListener("click", () => {
                    // Faqat ruxsat bo‘lsa, ochiladi
                    selectLesson(courseId, moduleId, lessonId, lesson.title, lesson.description);
                });
            } else {
                li.className = "text-gray-400 cursor-not-allowed text-sm";
                li.innerHTML = `${lesson.title} 🔒`;
                li.addEventListener("click", () => {
                    showRestrictionModal(lesson.title);
                });
            }

            if (!isSubmitted) canAccessNext = false;

            content.appendChild(li);
        }

        wrapper.appendChild(header);
        wrapper.appendChild(content);
        moduleList.appendChild(wrapper);
    }
}

// 🎯 Select lesson
function selectLesson(courseId, moduleId, lessonId, lessonTitleText, lessonDescription = "") {
    selectedLesson = lessonId;
    lessonTitle.textContent = lessonTitleText;
    lessonContent.innerHTML = `<p>${lessonDescription || "Dars tavsifi mavjud emas."}</p>`;

    // 🎥 Video va placeholder
    const video = document.getElementById("videoPlayer");
    const placeholder = document.getElementById("videoPlaceholder");
    video.classList.remove("hidden");
    placeholder.classList.add("hidden");

    // ✅ Tugmalar va tavsifni ko‘rsatish
    document.getElementById("lessonActions").classList.remove("hidden");
    document.getElementById("lessonDescriptionSection").classList.remove("hidden");

    video.src = "https://www.w3schools.com/html/mov_bbb.mp4";

    // ✅ Darsni tugallangan deb belgilash
    if (currentUser?.uid) {
        markLessonAsCompleted(currentUser.uid, courseId, moduleId, lessonId);
    }

    loadAssignment(courseId, lessonId);
    listenToAssistChats();
}

// Ranglar palitrasi (xohlaganingizcha kengaytiring)
const userColors = [
    "#f87171", // red-400
    "#60a5fa", // blue-400
    "#34d399", // green-400
    "#fbbf24", // yellow-400
    "#a78bfa", // purple-400
    "#f472b6", // pink-400
    "#38bdf8", // sky-400
    "#facc15", // amber-400
];

// Simple hash funksiyasi stringdan index olish uchun
function hashStringToIndex(str, max) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0; // 32-bit integer
    }
    return Math.abs(hash) % max;
}

// 🔘 Muhokama ochish tugmasi
document.getElementById("openChatBtn").addEventListener("click", () => {
    document.getElementById("discussionBox").classList.toggle("hidden");
});

// 📌 Izoh yuborish
document.getElementById("sendCommentBtn").addEventListener("click", async () => {
    const input = document.getElementById("commentInput");
    const commentText = input.value.trim();

    if (!commentText) return;

    try {
        await addDoc(collection(db, "comments"), {
            courseId: courseId,
            userId: currentUser?.uid || "anon",
            userName: currentUser?.name || "Anonim",
            text: commentText,
            createdAt: serverTimestamp()
        });
        input.value = "";
    } catch (err) {
        console.error("❌ Izoh yuborishda xatolik:", err);
    }
});

// 🆕 Izohlarni yuklash (real time) — rangli cardlar bilan
function listenForComments(courseId) {
    const commentRef = query(
        collection(db, "comments"),
        orderBy("createdAt", "desc")
    );

    onSnapshot(commentRef, (snapshot) => {
        const commentsBox = document.getElementById("commentsList");
        commentsBox.innerHTML = "";
        commentsBox.className = "space-y-3 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-400 border rounded p-3 bg-gray-50";

        snapshot.docs
            .filter(doc => doc.data().courseId === courseId)
            .forEach(doc => {
                const c = doc.data();
                const colorIndex = hashStringToIndex(c.userId || c.userName || "anon", userColors.length);
                const userColor = userColors[colorIndex];

                const div = document.createElement("div");
                div.className = "border p-3 rounded shadow-sm bg-white hover:shadow-md transition-shadow duration-200";
                // div.style.borderColor = userColor;

                const createdAt = c.createdAt?.toDate ? c.createdAt.toDate() : null;
                const timeStr = createdAt ? createdAt.toLocaleString() : "";

                div.innerHTML = `
          <p class="font-semibold text-sm mb-1" style="color: ${userColor}">
            ${c.userName}
            <span class="text-xs text-gray-400 ml-2">${timeStr}</span>
          </p>
          <p class="text-gray-900 text-sm">${c.text}</p>
        `;

                commentsBox.appendChild(div);
            });
    });
}

// ⭐ Baholash tugmasi bosilganda ko‘rsatamiz
document.getElementById("rateLessonBtn").addEventListener("click", () => {
    const box = document.getElementById("ratingBox");
    box.classList.toggle("hidden");

    if (!box.classList.contains("hidden")) {
        loadRating(courseId, selectedLesson); // ✅ faqat ochilganda yuklash
    }
});

function renderStars(selected = 0, readonly = false) {
    const container = document.getElementById("starRating");
    container.innerHTML = "";

    for (let i = 1; i <= 5; i++) {
        const star = document.createElement("span");
        star.textContent = "★";
        star.className = `cursor-pointer text-2xl transition ${i <= selected ? "text-yellow-400" : "text-gray-300"}`;

        if (!readonly) {
            star.addEventListener("click", () => {
                renderStars(i); // Yangilab bo‘yash
            });
        }

        container.appendChild(star);
    }
}

async function loadRating(courseId, lessonId) {
    const userId = currentUser.uid;
    const ratingRef = doc(db, "ratings", `${courseId}_${lessonId}`, "stars", userId);
    const snap = await getDoc(ratingRef);

    const reasonSelect = document.getElementById("ratingReason");

    if (snap.exists()) {
        const data = snap.data();
        renderStars(data.rating, true); // ⭐ Bahoni yulduzlarda ko‘rsat

        // 🔁 Sababni select ichida tanlangan holatga qo‘yamiz
        if (reasonSelect && data.reason) {
            reasonSelect.value = data.reason;
            reasonSelect.disabled = true; // 🔒 User sababni o‘zgartira olmasin
        }
    } else {
        renderStars(); // ✳️ Hali baholanmagan
        if (reasonSelect) {
            reasonSelect.value = "";
            reasonSelect.disabled = false;
        }
    }

    // 📊 O‘rtacha bahoni yuklash
    const avgText = document.getElementById("avgRating");
    const starsColRef = collection(db, "ratings", `${courseId}_${lessonId}`, "stars");
    onSnapshot(starsColRef, snapshot => {
        const ratings = snapshot.docs.map(d => d.data().rating);
        if (ratings.length === 0) return avgText.textContent = "Hali reyting yo‘q";
        const avg = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
        avgText.textContent = `📊 O'rtacha reyting: ${avg} / 5 (${ratings.length} ta ovoz)`;
    });
}

document.getElementById("submitRatingBtn").addEventListener("click", () => {
    const selected = document.querySelectorAll("#starRating .text-yellow-400").length;
    if (!selected) return alert("Iltimos, yulduz bahosini bosing!");

    submitRating(selected);
});

async function submitRating(stars) {
    const reason = document.getElementById("ratingReason").value;
    if (!reason) return alert("Iltimos, sababni tanlang!");

    const courseId = new URLSearchParams(window.location.search).get("courseId");
    const lessonId = selectedLesson;
    const userId = currentUser.uid;

    const ratingRef = doc(db, "ratings", `${courseId}_${lessonId}`, "stars", userId);
    await setDoc(ratingRef, {
        rating: stars,
        reason: reason,
        userId: userId,
        lesson: lessonId,
        createdAt: serverTimestamp()
    });

    renderStars(stars, true); // 🔒 Baho berildi, bloklanadi
    alert("✅ Baho muvaffaqiyatli yuborildi!");
}

function generateRandomAssignment() {
    const prompts = {
        1: "Ushbu darsdan olgan asosiy xulosangiz qanday?",
        2: "Misol keltiring: bu darsdagi asosiy tushunchani hayotda qanday qo‘llaysiz?",
        3: "Sizga bu mavzu bo‘yicha qanday savollar tug‘ildi?",
        4: "Dars mazmunini 3 jumlada umumlashtiring.",
        5: "Bu dars sizning ilgari bilganlaringizga qanday bog‘liq?"
    };

    const lorem = [
        "Bu mavzu juda foydali bo‘ldi, chunki unda asosiy tushunchalar aniq ko‘rsatildi.",
        "Misol uchun, bu bilimni amaliyotda ishlatish mumkin.",
        "Menda quyidagi savollar tug‘ildi: ...",
        "Bu mavzuni ilgari ko‘rmagan edim, ammo endi aniqroq tushundim.",
        "Ushbu dars boshqa mavzular bilan bog‘liqligi orqali yaxshiroq yodda qoladi."
    ];

    const randKey = Math.floor(Math.random() * 5) + 1;
    const question = prompts[randKey];
    const answer = lorem[Math.floor(Math.random() * lorem.length)];

    return { question, answer };
}

document.getElementById("submitTaskBtn").addEventListener("click", () => {
    const box = document.getElementById("assignmentBox");
    box.classList.toggle("hidden");
});

function loadAssignment(courseId, lessonName) {
    const { question, answer } = generateRandomAssignment();

    document.getElementById("assignmentQuestion").textContent = question;

    // Agar foydalanuvchi ilgari topshirgan bo‘lsa — Firestore dan tekshirish
    const assignmentRef = doc(db, "assignments", `${courseId}_${lessonName}_${currentUser.uid}`);
    getDoc(assignmentRef).then(snap => {
        const textarea = document.getElementById("assignmentAnswer");
        const statusText = document.getElementById("assignmentStatus");

        if (snap.exists()) {
            textarea.value = snap.data().answer;
            textarea.disabled = true;
            statusText.classList.remove("hidden");
            document.getElementById("submitAssignmentBtn").disabled = true;
        } else {
            textarea.value = answer; // random oldindan to‘ldirish
            textarea.disabled = false;
            statusText.classList.add("hidden");
            document.getElementById("submitAssignmentBtn").disabled = false;
        }
    });
}

document.getElementById("submitAssignmentBtn").addEventListener("click", async () => {
    const answer = document.getElementById("assignmentAnswer").value.trim();
    if (!answer) return alert("Javobingizni yozing.");

    try {
        await setDoc(doc(db, "assignments", `${courseId}_${selectedLesson}_${currentUser.uid}`), {
            courseId,
            lessonName: selectedLesson,
            userId: currentUser.uid,
            userName: currentUser.name,
            answer,
            submittedAt: serverTimestamp()
        });

        document.getElementById("assignmentAnswer").disabled = true;
        document.getElementById("submitAssignmentBtn").disabled = true;
        document.getElementById("assignmentStatus").classList.remove("hidden");

    } catch (err) {
        console.error("❌ Vazifa topshirishda xatolik:", err);
    }
});

document.getElementById("askAssistBtn").addEventListener("click", () => {
    document.getElementById("assistBox").classList.toggle("hidden");
});

document.getElementById("sendAssistBtn").addEventListener("click", async () => {
    const text = document.getElementById("assistInput").value.trim();
    if (!text) return;

    try {
        await addDoc(collection(db, "assistChats"), {
            courseId,
            lessonName: selectedLesson,
            userId: currentUser.uid,
            userName: currentUser.name,
            text,
            sender: "student",
            createdAt: serverTimestamp()
        });

        document.getElementById("assistInput").value = "";
    } catch (err) {
        console.error("❌ Assistga yuborishda xatolik:", err);
    }
});

function listenToAssistChats() {
    const q = query(
        collection(db, "assistChats"),
        where("courseId", "==", courseId),
        where("lessonName", "==", selectedLesson),
        where("userId", "==", currentUser.uid),
        orderBy("createdAt", "asc")
    );

    onSnapshot(q, (snapshot) => {
        const box = document.getElementById("assistMessages");
        box.innerHTML = "";

        snapshot.forEach(doc => {
            const msg = doc.data();
            const div = document.createElement("div");
            div.className = `p-2 rounded ${msg.sender === 'student' ? 'bg-indigo-100 text-right' : 'bg-green-100 text-left'}`;
            div.innerHTML = `<p>${msg.text}</p><span class="text-xs text-gray-500">${msg.sender}</span>`;
            box.appendChild(div);
        });

        box.scrollTop = box.scrollHeight;
    });
}

const toggleSections = {
    submitTaskBtn: "assignmentBox",
    rateLessonBtn: "ratingBox",
    askAssistBtn: "assistBox",
    openChatBtn: "discussionBox"
};

Object.entries(toggleSections).forEach(([btnId, boxId]) => {
    const btn = document.getElementById(btnId);
    const box = document.getElementById(boxId);

    btn.addEventListener("click", () => {
        // Barcha boxlarni yop
        Object.values(toggleSections).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add("hidden");
        });

        // Faqat tanlangan boxni och
        if (box) box.classList.remove("hidden");
    });
});

async function markLessonAsCompleted(userId, courseId, moduleId, lessonId) {
    const progressRef = doc(db, "users", userId, "lessonProgress", lessonId);
    const statsRef = doc(db, "users", userId, "stats", "progress");

    const progressSnap = await getDoc(progressRef);
    const alreadyCompleted = progressSnap.exists();

    if (!alreadyCompleted) {
        // ✅ Darsni tugallangan deb belgilash
        await setDoc(progressRef, {
            courseId,
            moduleId,
            lessonId,
            completed: true,
            watchedAt: serverTimestamp()
        });

        // ✅ XP va completedLessons ni inkrement qilish
        try {
            await setDoc(statsRef, {
                xp: increment(10),
                completedLessons: increment(1)
            }, { merge: true });
        } catch (err) {
            console.error("❌ Statistika yangilashda xatolik:", err);
        }
    }
}

function showRestrictionModal(lessonName = "") {
    const modal = document.getElementById("restrictionModal");
    const message = modal.querySelector("h2");
    if (message) {
        message.textContent = `⛔ Siz "${lessonName}"ga o‘ta olmaysiz. Iltimos, avvalgi darsni to‘liq yakunlang.`;
    }
    modal.classList.remove("hidden");
}

document.getElementById("closeRestrictionModal").addEventListener("click", () => {
    document.getElementById("restrictionModal").classList.add("hidden");
});

// 🎯 Kurs yuklangach chaqiriladi
listenForComments(courseId);

loadCourse();