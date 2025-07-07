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

        for (const courseId of enrolled) {
            if (!courseId || typeof courseId !== "string") continue; // ✅ noto‘g‘ri id bo‘lsa o'tkazib yubor

            const courseRef = doc(db, "courses", courseId);
            const courseSnap = await getDoc(courseRef);

            if (!courseSnap.exists()) {
                console.warn(`⚠️ Kurs topilmadi: ${courseId}`);
                continue;
            }

            const course = courseSnap.data();

            // 🔢 Dummy progress
            const totalLessons = course.modules?.flatMap(m => m.lessons || []).length || 0;
            const completedLessons = Math.floor(Math.random() * totalLessons); // bu keyinchalik dynamic bo‘ladi
            const progressPercent = totalLessons ? Math.floor((completedLessons / totalLessons) * 100) : 0;
            const lastLesson = course.modules?.[0]?.lessons?.[0] || "Boshlanmagan";

            const card = document.createElement("div");
            card.className = "bg-white p-4 rounded shadow border hover:shadow-md transition";

            card.innerHTML = `
        <img src="${course.image}" alt="${course.title}" class="w-full h-40 object-cover rounded mb-3" />
        <h3 class="text-lg font-bold text-gray-800 mb-1">${course.title}</h3>
        <p class="text-sm text-gray-600 mb-1">👨‍🏫 ${course.instructorName}</p>
        <p class="text-sm text-gray-500 mb-2">💰 ${course.price}</p>

        <div class="mb-2">
          <div class="w-full bg-gray-200 h-2 rounded-full">
            <div class="h-2 bg-indigo-500 rounded-full" style="width: ${progressPercent}%;"></div>
          </div>
          <p class="text-xs text-gray-500 mt-1">${completedLessons}/${totalLessons} dars (${progressPercent}%)</p>
        </div>

        <p class="text-xs text-gray-500 mb-2">▶️ Oxirgi dars: ${lastLesson}</p>

        <a href="learn.html?courseId=${courseId}" class="inline-block mt-2 bg-indigo-600 text-white px-4 py-2 text-sm rounded hover:bg-indigo-700 transition">
          Davom etish
        </a>
      `;

            courseContainer.appendChild(card);
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

    if (!courses || courses.length === 0) {
        container.innerHTML = `<p class="col-span-full text-gray-500">Hech narsa topilmadi.</p>`;
        return;
    }

    courses.forEach(course => {
        const div = document.createElement("div");
        div.className = "bg-white p-4 rounded shadow hover:shadow-md transition";
        div.innerHTML = `
      <img src="${course.image}" alt="${course.title}" class="rounded mb-3 w-full h-40 object-cover" />
      <h3 class="font-semibold text-lg">${course.title}</h3>
      <p class="text-sm text-gray-700">👨‍🏫 ${course.instructorName}</p>
      <p class="text-sm text-gray-500">${course.price}</p>
      <a href="/course.html?id=${course.id}" class="inline-block mt-3 bg-indigo-600 text-white px-4 py-2 text-sm rounded hover:bg-indigo-700">Ko‘rish</a>
    `;
        container.appendChild(div);
    });
}

// ▶️ Ishga tushirish
loadMyCourses(currentUser.uid);
loadRecommendedCourses();
