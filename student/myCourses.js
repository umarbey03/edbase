import { db, auth } from '../js/firebase-config.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const filterSelect = document.getElementById('filterCourses');
const searchInput = document.getElementById('searchCoursesInput');
const coursesGrid = document.getElementById('myCourses');
const noCoursesText = document.getElementById('noCoursesText');

let studentCourses = [];

// 👤 Foydalanuvchini tekshirish
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "/auth.html?redirectUrl=/student/my-courses.html";
    return;
  }

  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  if (!currentUser || currentUser.role !== "student") {
    window.location.href = "/auth.html?redirectUrl=/student/my-courses.html";
    return;
  }

  try {
    const userRef = doc(db, 'users', user.uid); // ✅ Eslatma: "users" collection
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      noCoursesText.textContent = "Foydalanuvchi topilmadi.";
      noCoursesText.classList.remove('hidden');
      return;
    }

    const userData = userSnap.data();
    studentCourses = userData.enrolledCourses || [];

    renderCourses();
  } catch (err) {
    console.error("❌ Foydalanuvchi ma'lumotlarini olishda xatolik:", err);
    noCoursesText.textContent = "Xatolik yuz berdi.";
    noCoursesText.classList.remove('hidden');
  }
});

async function renderCourses() {
  coursesGrid.innerHTML = '';
  noCoursesText.classList.add('hidden');

  if (!studentCourses || studentCourses.length === 0) {
    noCoursesText.textContent = "Sizda hali birorta kurs mavjud emas.";
    noCoursesText.classList.remove('hidden');
    return;
  }

  const selectedFilter = filterSelect?.value || 'all';
  const searchText = searchInput?.value?.trim().toLowerCase() || "";

  let anyMatch = true;

  for (const courseId of studentCourses) {
    const courseRef = doc(db, 'courses', courseId);
    const courseSnap = await getDoc(courseRef);

    if (!courseSnap.exists()) continue;

    const courseData = courseSnap.data();
    const imgUrl = courseData.imgUrl || courseData.image;
    const title = courseData.title || "Noma'lum kurs";
    const authorName = courseData.authorName || "Muallif";
    const centerName = courseData.centerName || "Markaz";
    const level = courseData.level || "Boshlang‘ich";
    const language = courseData.language?.toUpperCase() || "UZ";
    const price = courseData.isFree ? "Bepul" : (courseData.price?.toLocaleString() + " so‘m");
    const enableCertificate = courseData.enableCertificate;

    const card = document.createElement('div');
    card.className = "bg-white rounded-xl shadow-md p-4 flex flex-col gap-3 hover:shadow-lg transition border";

    card.innerHTML = `
    <img src="${imgUrl}" alt="${title}" class="rounded-md h-40 w-full object-cover mb-2 shadow-sm" />

    <h3 class="text-lg font-bold text-gray-800 line-clamp-2">${title}</h3>

    <div class="text-sm text-gray-600">
      👨‍🏫 <span>${authorName}</span><br>
      🏫 <span>${centerName}</span>
    </div>

    <div class="flex items-center justify-between text-xs text-gray-500">
      <span>📘 ${level}</span>
      <span>🌐 ${language}</span>
    </div>

    <div class="text-sm font-semibold text-gray-800">
      💰 ${price}
    </div>

    ${enableCertificate
        ? `<span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded w-fit">📄 Sertifikat mavjud</span>`
        : `<span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded w-fit">Sertifikatsiz</span>`
      }

    <a href="./learn.html?courseId=${courseId}" 
       class="mt-2 inline-block bg-indigo-600 text-white text-sm px-4 py-2 rounded hover:bg-indigo-700 transition">
      ➡️ Davom etish
    </a>
  `;

    coursesGrid.appendChild(card);
  }

  // ✳️ Faqat agar hech bir kurs search yoki filter bo‘yicha chiqmasa
  if (!anyMatch) {
    noCoursesText.textContent = "Hech qanday mos kurs topilmadi.";
    noCoursesText.classList.remove('hidden');
  }
}

// 🔄 Filtrlash va qidirish eventlari
filterSelect?.addEventListener('change', renderCourses);
searchInput?.addEventListener('input', () => {
  clearTimeout(window._searchDelay);
  window._searchDelay = setTimeout(renderCourses, 300);
});
