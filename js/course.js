import { db } from './firebase-config.js';
import {
  doc, getDoc, updateDoc, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const currentUser = JSON.parse(localStorage.getItem("currentUser"));
const urlParams = new URLSearchParams(window.location.search);
const courseId = urlParams.get("id");
const courseContainer = document.getElementById("courseContainer");
let courseData = null;
async function loadCourse() {
  try {
    const docRef = doc(db, "courses", courseId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      courseContainer.innerHTML = `<p class='text-center text-red-500'>Kurs topilmadi.</p>`;
      return;
    }

    const course = docSnap.data();
    // ➕ BONUS: global variable sifatida saqlaymiz:
    courseData = course;
    // Modullarni accordion ko‘rinishida chizish
    const renderModules = (modules) => {
      if (!Array.isArray(modules)) return "<p>Modullar topilmadi</p>";
      return modules.map((mod, i) => `
        <div class="border rounded-lg overflow-hidden mb-2">
          <button class="w-full text-left px-4 py-3 font-semibold bg-gray-100 hover:bg-gray-200 transition" onclick="this.nextElementSibling.classList.toggle('hidden')">
            ${mod.title}
          </button>
          <div class="px-6 py-3 bg-white hidden">
            <ul class="list-disc ml-5 text-gray-700">
              ${mod.lessons.map(lesson => `<li><a href='/auth.html' class='text-indigo-600 hover:underline'>${lesson}</a></li>`).join("")}
            </ul>
          </div>
        </div>
      `).join("");
    };

    // Fikrlar
    const renderReviews = (reviews) => {
      if (!Array.isArray(reviews) || reviews.length === 0) return "<p>Fikrlar mavjud emas</p>";
      return reviews.slice(0, 3).map(r => `
        <div class="bg-gray-50 border rounded p-4">
          <p class="font-semibold text-gray-800">${r.name}</p>
          <p class="text-gray-600 text-sm mt-1">${r.comment}</p>
        </div>
      `).join("");
    };

    // Kursni chizish
    courseContainer.innerHTML = `
      <section class="grid md:grid-cols-2 gap-8 items-start">
        <div>          
          ${course.previewVideo ? `<video controls class="rounded-lg w-full">
            <source src="${course.previewVideo}" type="video/mp4">
            Brauzeringiz video oynani qo‘llab-quvvatlamaydi
          </video>` : ""}
        </div>
        <div>
          <h1 class="text-3xl font-bold mb-2">${course.title}</h1>
          <p class="text-sm text-gray-600 mb-1">👨‍🏫 <a href="instructor.html?id=${course.lc}" class="text-indigo-600 hover:underline">${course.instructorName}</a> — ${course.centerName}</p>
          <p class="text-yellow-500 mb-1">⭐️ ${course.rating ?? "–"}</p>
          <p class="text-xl font-semibold text-gray-800 mb-4">💰 ${course.price}</p>
          <div id="actionButtons">${renderActionButtons(course)}</div>
        </div>
      </section>

      <section class="mt-10">
        <h2 class="text-2xl font-semibold mb-4">📘 Kurs ta'rifi</h2>
        <p class="text-gray-700 leading-relaxed">${course.description ?? "Hozircha tavsif yo‘q."}</p>
      </section>

      <section class="mt-10">
        <h2 class="text-2xl font-semibold mb-4">📦 Kurs tarkibi</h2>
        ${renderModules(course.modules)}
      </section>

      <section class="mt-10">
        <h2 class="text-2xl font-semibold mb-4">💬 Foydalanuvchi fikrlari</h2>
        <div class="grid md:grid-cols-3 gap-4">
          ${renderReviews(course.reviews)}
        </div>
      </section>
    `;
  } catch (err) {
    console.error("Kursni yuklashda xatolik:", err);
    courseContainer.innerHTML = `<p class='text-center text-red-500'>Xatolik yuz berdi.</p>`;
  }
}

function renderActionButtons(course) {
  const hasPurchased = currentUser?.purchasedCourses?.includes(courseId);
  const hasEnrolled = currentUser?.enrolledCourses?.includes(courseId);

  if (!currentUser) {
    return `
      <div class="flex gap-4">
        <a href="/auth.html?redirectUrl=/course.html?id=${courseId}" class="bg-indigo-600 text-white px-5 py-2 rounded hover:bg-indigo-700 transition">Kursni boshlash</a>
        <a href="/auth.html?mode=register&redirectUrl=/course.html?id=${courseId}" class="bg-gray-200 text-gray-800 px-5 py-2 rounded hover:bg-gray-300 transition">Ro‘yxatdan o‘tish</a>
      </div>`;
  }

  if (hasEnrolled || hasPurchased) {
    return `<a href="/student/learn.html?courseId=${courseId}" class="bg-green-600 text-white px-5 py-2 rounded hover:bg-green-700">▶️ Boshlash</a>`;
  }

  return `<button onclick="buyCourse()" class="bg-indigo-600 text-white px-5 py-2 rounded hover:bg-indigo-700">💳 Sotib olish – ${course.price}</button>`;
}

window.buyCourse = async function () {
  if (!currentUser?.uid) return alert("Iltimos, tizimga kiring.");

  try {
    const userRef = doc(db, "users", currentUser.uid);
    await updateDoc(userRef, {
      purchasedCourses: arrayUnion(courseId),
      enrolledCourses: arrayUnion(courseId)
    });

    // ✅ LocalStorage userni yangilaymiz
    const updatedUser = {
      ...currentUser,
      purchasedCourses: [...(currentUser.purchasedCourses || []), courseId],
      enrolledCourses: [...(currentUser.enrolledCourses || []), courseId]
    };
    localStorage.setItem("currentUser", JSON.stringify(updatedUser));

    // ✅ Button joyini yangilaymiz
    const buttonBox = document.getElementById("actionButtons");
    buttonBox.innerHTML = renderActionButtons({ ...courseData, id: courseId });

    alert("✅ Kurs sotib olindi!");
  } catch (err) {
    console.error("❌ Sotib olishda xatolik:", err);
    alert("Xatolik yuz berdi. Iltimos, keyinroq urinib ko‘ring.");
  }
};

loadCourse();