import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const courseContainer = document.getElementById("courseContainer");

// 🔹 URLdan ID olish
const urlParams = new URLSearchParams(window.location.search);
const courseId = urlParams.get("id");

async function loadCourse() {
  try {
    const docRef = doc(db, "courses", courseId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      courseContainer.innerHTML = "<p class='text-center text-red-500'>Kurs topilmadi.</p>";
      return;
    }

    const course = docSnap.data();

    courseContainer.innerHTML = `
      <div class="bg-white p-6 rounded-xl shadow-md">
        <img src="${course.image}" alt="${course.title}" class="w-full h-64 object-cover rounded mb-6" />
        <h1 class="text-3xl font-bold mb-2">${course.title}</h1>
        <p class="text-gray-700 mb-2">👨‍🏫 ${course.instructorName}</p>
        <p class="text-gray-800 font-semibold mb-2">💰 ${course.price}</p>
        <p class="text-yellow-500 mb-4">⭐️ ${course.rating ?? "–"}</p>
        
        <h2 class="text-xl font-semibold mt-6 mb-2">Kurs ta'rifi:</h2>
        <p class="text-gray-700 mb-6">${course.description ?? "Hozircha tavsif yo‘q."}</p>

        <h2 class="text-xl font-semibold mb-2">Modullar:</h2>
        <ul class="list-disc ml-6 text-gray-600 mb-8">
          ${Array.isArray(course.modules) ? course.modules.map(m => `<li>${m}</li>`).join("") : "<li>Modullar mavjud emas</li>"}
        </ul>

        <div class="flex gap-4">
          <a href="auth.html" class="bg-indigo-600 text-white px-5 py-2 rounded hover:bg-indigo-700 transition">Kursni boshlash</a>
          <a href="auth.html?mode=register&redirectUrl=/courses/${courseId}" class="bg-gray-200 text-gray-800 px-5 py-2 rounded hover:bg-gray-300 transition">Ro‘yxatdan o‘tish va o‘rganishni boshlash</a>
        </div>
      </div>
    `;
  } catch (err) {
    console.error("Kursni yuklashda xatolik:", err);
    courseContainer.innerHTML = "<p class='text-center text-red-500'>Xatolik yuz berdi.</p>";
  }
}

loadCourse();
