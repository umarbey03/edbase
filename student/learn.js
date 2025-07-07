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
    setDoc
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

        renderModules(course.modules);
        if (course.modules?.length) selectLesson(course.modules[0].lessons?.[0] || "");
    } catch (err) {
        console.error("❌ Kurs yuklashda xatolik:", err);
    }
}

// 🧩 Render module list
function renderModules(modules = []) {
    moduleList.innerHTML = "";

    modules.forEach((mod, i) => {
        const wrapper = document.createElement("div");
        wrapper.className = "mb-4";

        const modTitle = document.createElement("h3");
        modTitle.className = "font-bold text-gray-800";
        modTitle.textContent = mod.title;

        const ul = document.createElement("ul");
        mod.lessons.forEach(lesson => {
            const li = document.createElement("li");
            li.className = "text-indigo-600 cursor-pointer hover:underline text-sm my-1";
            li.textContent = lesson;
            li.addEventListener("click", () => selectLesson(lesson));
            ul.appendChild(li);
        });

        wrapper.appendChild(modTitle);
        wrapper.appendChild(ul);
        moduleList.appendChild(wrapper);
    });
}

// 🎯 Select lesson
function selectLesson(lessonName) {
    selectedLesson = lessonName;
    lessonTitle.textContent = lessonName;
    videoPlayer.src = "https://www.w3schools.com/html/mov_bbb.mp4"; // Demo video, realda o‘zgartiriladi
    loadAssignment(courseId, lessonName);
}

document.getElementById("askAssistBtn").addEventListener("click", () => {
    alert("🆘 Yordamchi tizim ishlanmoqda. Tez orada aktiv bo‘ladi!");
});

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

// 📥 Izohlarni yuklash (real time)
function listenForComments(courseId) {
    const commentRef = query(
        collection(db, "comments"),
        orderBy("createdAt", "desc")
    );

    onSnapshot(commentRef, (snapshot) => {
        const commentsBox = document.getElementById("commentsList");
        commentsBox.innerHTML = "";

        snapshot.docs
            .filter(doc => doc.data().courseId === courseId)
            .forEach(doc => {
                const c = doc.data();
                const div = document.createElement("div");
                div.className = "border p-2 rounded bg-white";
                div.innerHTML = `
          <p class="font-semibold text-sm">${c.userName}</p>
          <p class="text-sm text-gray-700">${c.text}</p>
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

function renderStars(selected = 0) {
    const container = document.getElementById("starRating");
    container.innerHTML = "";

    for (let i = 1; i <= 5; i++) {
        const star = document.createElement("span");
        star.textContent = "★";
        star.className = i <= selected ? "text-yellow-400" : "text-gray-300";

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



// 🎯 Kurs yuklangach chaqiriladi
listenForComments(courseId);


loadCourse();
