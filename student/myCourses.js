import { db, auth } from './firebase-config.js';
import { doc, getDoc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const coursesGrid = document.getElementById('coursesGrid');
const noCoursesText = document.getElementById('noCoursesText');
const filterSelect = document.getElementById('filterCourses');
const searchInput = document.getElementById('searchCoursesInput');

let studentCourses = [];

auth.onAuthStateChanged(async (user) => {
  if (user) {
    const studentRef = doc(db, 'students', user.uid);
    const studentSnap = await getDoc(studentRef);

    if (studentSnap.exists()) {
      const enrolled = studentSnap.data().enrolledCourses || [];
      studentCourses = enrolled;
      renderCourses();
    }
  }
});

async function renderCourses() {
  coursesGrid.innerHTML = '';
  noCoursesText.classList.add('hidden');

  if (studentCourses.length === 0) {
    noCoursesText.classList.remove('hidden');
    return;
  }

  for (const course of studentCourses) {
    const courseRef = doc(db, 'courses', course.courseId);
    const courseSnap = await getDoc(courseRef);
    if (courseSnap.exists()) {
      const courseData = courseSnap.data();

      // Filter
      const selectedFilter = filterSelect.value;
      if (selectedFilter !== 'all' && course.status !== selectedFilter) continue;

      // Search
      const searchText = searchInput.value.toLowerCase();
      if (searchText && !courseData.title.toLowerCase().includes(searchText)) continue;

      // Progress %
      const percent = Math.floor((course.completedLessons / course.totalLessons) * 100);

      // HTML
      const card = document.createElement('div');
      card.className = "bg-white rounded shadow p-4 flex flex-col gap-2";

      card.innerHTML = `
        <img src="${courseData.coverImage || courseData.imgUrl}" alt="${courseData.title}" class="rounded h-40 w-full object-cover">
        <h3 class="text-lg font-semibold">${courseData.title}</h3>
        <div class="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
          <div class="bg-blue-500 h-2" style="width: ${percent}%"></div>
        </div>
        <p class="text-sm text-gray-500">${course.completedLessons} / ${course.totalLessons} dars</p>
        <span class="text-xs inline-block px-2 py-1 rounded-full ${
          course.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
        }">${course.status === 'completed' ? 'Tugallangan' : 'Davom etmoqda'}</span>
        <a href="/course/${course.courseId}/lesson/${course.lastViewed}" class="text-blue-600 hover:underline mt-1">
          ${course.status === 'completed' ? '🔖 Sertifikat' : '➡️ Davom etish'}
        </a>
      `;
      coursesGrid.appendChild(card);
    }
  }

  // Agar filtrlab hech narsa topilmasa
  if (coursesGrid.innerHTML.trim() === '') {
    noCoursesText.textContent = "Hech qanday mos kurs topilmadi.";
    noCoursesText.classList.remove('hidden');
  }
}

// 🔄 Eventlar
filterSelect.addEventListener('change', renderCourses);
searchInput.addEventListener('input', () => {
  clearTimeout(window._searchDelay);
  window._searchDelay = setTimeout(renderCourses, 300);
});
