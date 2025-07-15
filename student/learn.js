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
    increment,
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

const lessonId = urlParams.get("lessonId"); // ❗ bu bo‘lishi shart
const courseTitle = document.getElementById("courseTitle");
const videoPlayer = document.getElementById("videoPlayer");
const lessonTitle = document.getElementById("lessonTitle");
const instructorInfo = document.getElementById("instructorInfo");
const moduleList = document.getElementById("moduleList");

let selectedLesson = null;

const nextLessonBtn = document.getElementById("nextLessonBtn");
const taskList = document.getElementById("taskList");

// 1️⃣ Tasklar ro‘yxati
const tasks = [
    { id: "task1", type: "open", question: "Ushbu darsdan olgan asosiy xulosangiz qanday?" },
    { id: "task2", type: "test", question: "Darsni kim o‘tmoqda?", options: ["O‘qituvchi", "Talaba", "Admin", "Bot"] },
    { id: "task3", type: "gap", question: "Ma'lumotlar [gap] orqali uzatiladi.", correctAnswer: "internet" },
    { id: "task4", type: "upload", question: "Fayl yuklang va izoh yozing" }
];

// 🧩 Toggle Next Lesson Btn
function toggleNextLessonBtn(isPassed) {
    if (!nextLessonBtn) return;
    nextLessonBtn.disabled = !isPassed;
    nextLessonBtn.classList.toggle("opacity-50", !isPassed);
    nextLessonBtn.classList.toggle("cursor-not-allowed", !isPassed);
    nextLessonBtn.title = isPassed ? "" : "Keyingi darsga o‘tish uchun kamida 85% vazifani bajaring.";
}

// 📦 Kurs yuklash
async function loadCourse() {
    const snap = await getDoc(doc(db, "courses", courseId));
    if (!snap.exists()) return alert("Kurs topilmadi");

    const course = snap.data();
    courseTitle.textContent = course.title;
    instructorInfo.textContent = `${course.instructorName || course.authorName} | ${course.centerName || course.lc}`;
    await renderModules(courseId, course);
}

// 🧩 Modullar va darslar
async function renderModules(courseId, course) {
    moduleList.innerHTML = "";

    const modulesRef = collection(db, "courses", courseId, "modules");
    const modulesSnap = await getDocs(modulesRef);

    if (!modulesSnap.empty) {
        for (const moduleDoc of modulesSnap.docs) {
            const moduleData = moduleDoc.data();
            const moduleId = moduleDoc.id;

            const header = document.createElement("div");
            header.className = "bg-gray-100 px-3 py-2 font-semibold cursor-pointer hover:bg-gray-200";
            header.textContent = moduleData.title;

            const content = document.createElement("ul");
            content.className = "hidden px-4 py-2 bg-white space-y-1";
            header.addEventListener("click", () => content.classList.toggle("hidden"));

            const lessonsRef = collection(db, "courses", courseId, "modules", moduleId, "lessons");
            const lessonsSnap = await getDocs(lessonsRef);
            const lessons = lessonsSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order || 0) - (b.order || 0));

            let canAccessNext = true;
            for (let index = 0; index < lessons.length; index++) {
                const lesson = lessons[index];
                const li = document.createElement("li");

                // Har bir dars uchun alohida assignmentlarni tekshirish
                const q = query(collection(db, "assignments"),
                    where("courseId", "==", courseId),
                    where("lessonId", "==", lesson.id),
                    where("userId", "==", currentUser.uid)
                );
                const assignmentSnap = await getDocs(q);
                const totalTasks = assignmentSnap.size;

                const percent = (totalTasks / 4) * 100; // 4 ta task deb hisoblangan
                const isPassed = percent >= 80;

                if (canAccessNext || index === 0) {
                    li.className = "text-blue-600 cursor-pointer hover:underline text-sm";
                    li.textContent = lesson.title + (isPassed ? " ✅" : "");
                    li.onclick = () => selectLesson(courseId, moduleId, lesson.id, lesson.title, lesson.description);
                } else {
                    li.className = "text-gray-400 cursor-not-allowed text-sm";
                    li.textContent = lesson.title + " 🔒";
                    li.onclick = () => showRestrictionModal(lesson.title);
                }

                canAccessNext = isPassed;
                content.appendChild(li);
            }

            const wrapper = document.createElement("div");
            wrapper.className = "border rounded overflow-hidden mb-3";
            wrapper.append(header, content);
            moduleList.appendChild(wrapper);
        }
    } else if (course.modules) {
        // 🔙 Eski formatni qo‘llab-quvvatlash
        course.modules.forEach((mod, modIndex) => {
            const header = document.createElement("div");
            header.className = "bg-gray-100 px-3 py-2 font-semibold cursor-pointer hover:bg-gray-200";
            header.textContent = mod.title || `Modul ${modIndex + 1}`;

            const content = document.createElement("ul");
            content.className = "hidden px-4 py-2 bg-white space-y-1";
            header.addEventListener("click", () => content.classList.toggle("hidden"));

            (mod.lessons || []).forEach((lesson, i) => {
                const lessonId = `${modIndex}_${i}`;
                const li = document.createElement("li");
                li.className = "text-blue-600 cursor-pointer hover:underline text-sm";
                li.textContent = lesson.title;
                li.onclick = () => selectLesson(courseId, `module_${modIndex}`, lessonId, lesson.title, lesson.description);
                content.appendChild(li);
            });

            const wrapper = document.createElement("div");
            wrapper.className = "border rounded overflow-hidden mb-3";
            wrapper.append(header, content);
            moduleList.appendChild(wrapper);
        });
    } else {
        moduleList.innerHTML = "<p class='text-red-600'>Modullar topilmadi</p>";
    }
}

// 🧮 Vazifalarni ko‘rsatish va yuborish
async function renderAllTasks(tasks, container) {
    container.innerHTML = "";
    container.classList.remove("hidden");

    for (const task of tasks) {
        const docId = `${courseId}_${lessonId}_${task.id}_${currentUser.uid}`;
        const taskRef = doc(db, "assignments", docId);
        const snap = await getDoc(taskRef);
        const existing = snap.exists() ? snap.data() : null;

        const wrapper = document.createElement("div");
        wrapper.className = "mb-4 p-4 border rounded bg-gray-50";
        wrapper.innerHTML = `<h4 class='font-bold mb-2'>${task.question}</h4>`;

        let input = null;
        if (task.type === "open" || task.type === "gap") {
            input = document.createElement(task.type === "open" ? "textarea" : "input");
            input.className = "w-full p-2 border rounded";
            input.value = existing?.answer || "";
            input.disabled = !!existing;
        }

        if (task.type === "test") {
            input = document.createElement("div");
            task.options.forEach(opt => {
                const label = document.createElement("label");
                label.className = "block";
                label.innerHTML = `<input type='radio' name='${task.id}' value='${opt}' class='mr-2' ${existing?.answer === opt ? "checked" : ""} ${existing ? "disabled" : ""}> ${opt}`;
                input.appendChild(label);
            });
        }

        if (task.type === "upload") {
            input = document.createElement("div");
            if (existing) {
                input.innerHTML = `<p>📎 Fayl: <a href='${existing.answer.fileURL}' class='text-blue-600 underline' target='_blank'>Ko‘rish</a></p><p>📝 Izoh: ${existing.answer.comment}</p>`;
            } else {
                input.innerHTML = `<input type='file' id='file_${task.id}' class='block mb-2'><textarea id='comment_${task.id}' class='w-full border p-2 rounded' placeholder='Izoh yozing...'></textarea>`;
            }
        }

        const btn = document.createElement("button");
        btn.textContent = existing ? "✅ Yuborilgan" : "Topshirish";
        btn.disabled = !!existing;
        btn.className = "mt-2 bg-blue-600 text-white px-4 py-1 rounded";

        btn.addEventListener("click", async () => {
            const data = {
                courseId, lessonId, taskId: task.id,
                userId: currentUser.uid,
                userName: currentUser.name || "Anonim",
                submittedAt: serverTimestamp()
            };

            if (task.type === "open" || task.type === "gap") {
                data.answer = input.value.trim();
                if (!data.answer) return alert("Javob yozing");
            }

            if (task.type === "test") {
                const selected = input.querySelector(`input[name='${task.id}']:checked`);
                if (!selected) return alert("Variant tanlang");
                data.answer = selected.value;
            }

            if (task.type === "upload") {
                const file = document.getElementById(`file_${task.id}`).files[0];
                const comment = document.getElementById(`comment_${task.id}`).value;
                if (!file) return alert("Fayl yuklang");

                const path = `assignments/${currentUser.uid}/${Date.now()}_${file.name}`;
                const ref = storageRef(storage, path);
                await uploadBytes(ref, file);
                const url = await getDownloadURL(ref);
                data.answer = { fileURL: url, comment };
            }

            await setDoc(taskRef, data);
            alert("✅ Vazifa saqlandi");
            renderAllTasks(tasks, container);
        });

        wrapper.appendChild(input);
        wrapper.appendChild(btn);
        container.appendChild(wrapper);
    }
}

// ✅ Darsni yakunlash
async function markLessonAsCompleted(userId, courseId, moduleId, lessonId) {
    const ref = doc(db, "users", userId, "lessonProgress", lessonId);
    const statsRef = doc(db, "users", userId, "stats", "progress");
    const snap = await getDoc(ref);
    if (snap.exists()) return;

    await setDoc(ref, { courseId, moduleId, lessonId, completed: true, watchedAt: serverTimestamp() });
    await setDoc(statsRef, { xp: increment(10), completedLessons: increment(1) }, { merge: true });
}

// 🔎 Dars yakunlanganmi?
async function checkLessonCompletion(courseId, lessonId, taskList, userId) {
    const q = query(collection(db, "assignments"),
        where("courseId", "==", courseId),
        where("lessonId", "==", lessonId),
        where("userId", "==", userId));
    const snap = await getDocs(q);
    const percent = (snap.size / taskList.length) * 100;
    return percent >= 85;
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

    renderAllTasks(tasks, taskList);
    checkLessonCompletion(courseId, lessonId, tasks, currentUser.uid).then(async isPassed => {
        toggleNextLessonBtn(isPassed);
        if (isPassed) await markLessonAsCompleted(currentUser.uid, courseId, moduleId, lessonId);
    });
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
    submitTaskBtn: "taskList",
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