import { db } from '/js/firebase-config.js';
import {
    doc,
    getDoc,
    getDocs,
    collection,
    query
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 👤 Foydalanuvchini olish
const currentUser = JSON.parse(localStorage.getItem("currentUser"));
if (!currentUser || currentUser.role !== "student") {
    window.location.href = "/auth.html?redirectUrl=/student/dashboard.html";
}

// 🔧 DOM elementlar
const userName = document.getElementById("userName");
const logoutBtn = document.getElementById("logoutBtn");
const myCoursesBox = document.getElementById("myCourses");
const recommendedBox = document.getElementById("recommendedCourses");

userName.textContent = currentUser.name || "Foydalanuvchi";

// 🔓 Logout
logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("currentUser");
    window.location.href = "/auth.html";
});

// 📚 Mening kurslarimni yuklash
async function loadMyCourses(uid) {
    try {
        const userSnap = await getDoc(doc(db, "users", uid));
        const userData = userSnap.data();

        const courseContainer = document.getElementById("myCourses");
        courseContainer.innerHTML = "";

        const enrolled = Array.isArray(userData?.enrolledCourses) ? userData.enrolledCourses : [];

        if (enrolled.length === 0) {
            courseContainer.innerHTML = `<p class="col-span-full text-gray-500">Sizda hali kurslar mavjud emas.</p>`;
            return;
        }

        // 🧮 Umumiy statistika o'zgaruvchilari
        let totalLessonsAll = 0;
        let completedLessonsAll = 0;
        let lastLessonTitle = "—";
        let lastLessonTitleDate = null;

        for (const courseId of enrolled) {
            if (!courseId || typeof courseId !== "string") continue;

            const courseRef = doc(db, "courses", courseId);
            const courseSnap = await getDoc(courseRef);
            if (!courseSnap.exists()) {
                console.warn(`⚠️ Kurs topilmadi: ${courseId}`);
                continue;
            }

            const course = courseSnap.data();
            let totalLessons = 0;
            let completedLessons = 0;
            let lastWatchedTitle = "Boshlanmagan";
            let lastWatchedAt = null;

            if (Array.isArray(course.modules)) {
                for (const module of course.modules) {
                    const lessons = module.lessons || [];
                    totalLessons += lessons.length;
                    totalLessonsAll += lessons.length;

                    for (const lesson of lessons) {
                        if (!lesson?.id) continue; // 🔐 ID bo‘lmasa skip

                        const progressRef = doc(db, "users", uid, "lessonProgress", lesson.id);
                        const progressSnap = await getDoc(progressRef);

                        if (progressSnap.exists()) {
                            completedLessons++;
                            completedLessonsAll++;

                            const watchedAt = progressSnap.data().watchedAt?.toDate?.();

                            // Kurs ichidagi eng so‘nggi dars
                            if (!lastWatchedAt || (watchedAt && watchedAt > lastWatchedAt)) {
                                lastWatchedAt = watchedAt;
                                lastWatchedTitle = lesson.title;
                            }

                            // Umumiy eng so‘nggi dars
                            if (!lastLessonTitleDate || (watchedAt && watchedAt > lastLessonTitleDate)) {
                                lastLessonTitleDate = watchedAt;
                                lastLessonTitle = lesson.title;
                            }
                        }
                    }
                }
            }

            const progressPercent = totalLessons ? Math.floor((completedLessons / totalLessons) * 100) : 0;

            // 🧩 Kurs kartasi
            const card = document.createElement("div");
            card.className = "bg-white p-4 rounded shadow border hover:shadow-md transition";

            card.innerHTML = `
                <img src="${course.image || course.imgUrl}" alt="${course.title}" class="w-full h-40 object-cover rounded mb-3" />
                <h3 class="text-lg font-bold text-gray-800 mb-1">${course.title}</h3>
                <p class="text-sm text-gray-600 mb-1">👨‍🏫 ${course.instructorName || course.authorName}</p>
                <p class="text-sm text-gray-500 mb-2">💰 ${course.price}</p>

                <div class="mb-2">
                    <div class="w-full bg-gray-200 h-2 rounded-full">
                        <div class="h-2 bg-indigo-500 rounded-full" style="width: ${progressPercent}%;"></div>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">${completedLessons}/${totalLessons} dars (${progressPercent}%)</p>
                </div>

                <p class="text-xs text-gray-500 mb-2">▶️ Oxirgi dars: ${lastWatchedTitle}</p>

                <a href="learn.html?courseId=${courseId}" class="inline-block mt-2 bg-indigo-600 text-white px-4 py-2 text-sm rounded hover:bg-indigo-700 transition">
                    Davom etish
                </a>
            `;

            courseContainer.appendChild(card);
        }

        // 🧾 Statistika bo‘limini to‘ldirish (agar mavjud bo‘lsa)
        if (document.getElementById("statCourses")) {
            document.getElementById("statCourses").textContent = enrolled.length;
            // document.getElementById("statLessons").textContent = completedLessonsAll;
            // document.getElementById("statLastLesson").textContent = lastLessonTitle || "—";
            const progress = totalLessonsAll ? Math.floor((completedLessonsAll / totalLessonsAll) * 100) : 0;
            document.getElementById("statProgress").textContent = `${progress}%`;
        }

    } catch (err) {
        console.error("❌ Mening kurslarimni yuklashda xatolik:", err);
        document.getElementById("myCourses").innerHTML = `<p class="col-span-full text-red-500">Kurslarni yuklashda xatolik yuz berdi.</p>`;
    }
}

// 🧠 Tavsiya etilgan kurslar
async function loadRecommendedCourses() {
    try {
        const q = query(collection(db, "courses"));
        const snap = await getDocs(q);
        const allCourses = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 🔍 User o‘qiyotgan (enrolled yoki purchased) kurslar filtrlanadi
        const blockedCourses = new Set([
            ...(currentUser.enrolledCourses || []),
            ...(currentUser.purchasedCourses || [])
        ]);

        const filtered = allCourses.filter(c => !blockedCourses.has(c.id));
        const random = filtered.sort(() => 0.5 - Math.random()).slice(0, 3);

        renderCourses(random, recommendedBox);
    } catch (err) {
        console.error("❌ Tavsiya kurslarda xatolik:", err);
        recommendedBox.innerHTML = `<p class="col-span-full text-red-600">Xatolik yuz berdi.</p>`;
    }
}

// 🎨 Kurs kartasi chizish
function renderCourses(courses, container) {
    container.innerHTML = "";

    // if (!courses || courses.length === 0) {
    //     container.innerHTML = `<p class="col-span-full text-gray-500">Hech narsa topilmadi.</p>`;
    //     return;
    // }

    courses.forEach(course => {
        const div = document.createElement("div");
        div.className = "bg-white p-4 rounded shadow hover:shadow-md transition";
        div.innerHTML = `
            <img src="${course.image || course.imgUrl}" alt="${course.title}" class="rounded mb-3 w-full h-40 object-cover" />
            <h3 class="font-semibold text-lg">${course.title}</h3>
            <p class="text-sm text-gray-700">👨‍🏫 ${course.instructorName || course.authorName}</p>
            <p class="text-sm text-gray-500">${course.price}</p>
            <a href="/course.html?id=${course.id}" class="inline-block mt-3 bg-indigo-600 text-white px-4 py-2 text-sm rounded hover:bg-indigo-700">Ko‘rish</a>
        `;
        container.appendChild(div);
    });

    // CTA card qo‘shish
    const ctaDiv = document.createElement("div");
    ctaDiv.className = `
    bg-gradient-to-r from-indigo-700 to-indigo-500 
    p-6 rounded-lg shadow-lg 
    flex flex-col justify-center items-center 
    hover:shadow-xl hover:scale-105 transition-transform duration-300 cursor-pointer
    text-center
    text-white
    col-span-full md:col-span-1
`;
    ctaDiv.innerHTML = `
    <h3 class="text-2xl font-bold mb-3">O‘z kursingizni boshlang</h3>
    <p class="mb-5 max-w-xs">Yangi kurs yaratish yoki o‘qishni boshlash uchun shu yerni bosing</p>
    <a href="/create-course.html" class="bg-white text-indigo-700 px-5 py-2 rounded-full font-semibold hover:bg-gray-100 transition">Kurs yaratish</a>
`;
    container.appendChild(ctaDiv);

}

async function loadStats(uid) {
    try {
        const statSnap = await getDoc(doc(db, "users", uid, "stats", "progress"));
        if (!statSnap.exists()) {
            console.log("Statistika mavjud emas");
            return;
        }
        const stats = statSnap.data();
        console.log("Stats loaded:", stats);

        const xp = stats.xp || 0;
        const level = Math.floor(Math.sqrt(xp / 10));
        const badges = stats.badges || [];

        document.getElementById("statXP").textContent = `${xp} XP`;
        document.getElementById("statLevel").textContent = `Level ${level}`;

        // Yangi qo'shimcha: bajarilgan darslar soni va oxirgi dars
        document.getElementById("statLessons").textContent = stats.completedLessons || 0;
        document.getElementById("statLastLesson").textContent = stats.lastCompletedLesson || "—";

        const badgeBox = document.getElementById("statBadges");
        badgeBox.innerHTML = "";

        for (const badge of badges) {
            const badgeIcon = document.createElement("span");
            badgeIcon.className = "inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm";
            badgeIcon.textContent = badgeLabel(badge);
            badgeBox.appendChild(badgeIcon);
        }

    } catch (err) {
        console.error("❌ Statistikani yuklashda xatolik:", err);
    }
}

function badgeLabel(code) {
    const map = {
        courseMaster: "🥇 Kurs Masteri",
        quizChampion: "🧠 Test Chempioni",
        streakStar: "🔥 Ketma-ketlik yulduzi",
        fastFinisher: "⏰ Tez Yakunlovchi"
    };
    return map[code] || code;
}

// ▶️ Ishga tushirish
loadMyCourses(currentUser.uid);
loadRecommendedCourses();

document.addEventListener("DOMContentLoaded", () => {
    loadStats(currentUser.uid);
});