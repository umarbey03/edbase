import { db, auth } from '../js/firebase-config.js';
import {
    collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
    signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Elementlar
const tableBody = document.getElementById('students-table-body');
const logoutBtn = document.getElementById('logout-btn');

// 🔐 Auth tekshirish
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = '/auth.html?mode=login&redirectUrl=/instructor/students.html';
        return;
    }

    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser.role !== 'instructor') {
        alert("Faqat instructorlar uchun sahifa.");
        return;
    }

    try {
        // 📥 Loading placeholder
        tableBody.innerHTML = `
      <tr class="animate-pulse bg-gray-50">
        <td colspan="6" class="px-4 py-3">
          <div class="h-4 bg-gray-200 rounded w-full"></div>
        </td>
      </tr>
      <tr class="animate-pulse bg-gray-50">
        <td colspan="6" class="px-4 py-3">
          <div class="h-4 bg-gray-200 rounded w-4/5"></div>
        </td>
      </tr>
    `;

        // 🔹 1. Instructor kurslari
        const coursesSnap = await getDocs(query(
            collection(db, 'courses'),
            where('authorId', '==', user.uid)
        ));
        const instructorCourseIds = coursesSnap.docs.map(doc => doc.id);
        if (instructorCourseIds.length === 0) {
            tableBody.innerHTML = `
        <tr class="bg-gray-50">
          <td colspan="6" class="text-center text-gray-500 py-6">Sizda hali kurs mavjud emas</td>
        </tr>
      `;
            return;
        }

        // 🔹 2. Studentlar
        const usersSnap = await getDocs(query(
            collection(db, 'users'),
            where('role', '==', 'student')
        ));

        const students = [];

        usersSnap.forEach(doc => {
            const u = doc.data();
            const enrolled = u.purchasedCourses || [];

            const matchingCourses = enrolled.filter(courseId => instructorCourseIds.includes(courseId));
            if (matchingCourses.length > 0) {
                students.push({
                    name: u.name || 'Noma’lum',
                    email: u.email || '',
                    courseCount: matchingCourses.length,
                    createdAt: u.createdAt || '',
                    avatar: u.avatar || '',
                    uid: u.uid,
                });
            }
        });

        // 🔄 Jadvalni tozalaymiz
        tableBody.innerHTML = '';

        if (students.length === 0) {
            tableBody.innerHTML = `
        <tr class="bg-gray-50">
          <td colspan="6" class="text-center text-gray-500 py-6">O‘quvchilar hali mavjud emas</td>
        </tr>
      `;
            return;
        }

        // 📊 Ma’lumotlarni jadvalga joylash
        students
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .forEach((student, index) => {
                const row = `
          <tr class="hover:bg-gray-50">
            <td class="px-4 py-2">${index + 1}</td>
            <td class="px-4 py-2 flex items-center gap-2">
              <img src="${student.avatar}" class="w-8 h-8 rounded-full object-cover" />
              ${student.name}
            </td>
            <td class="px-4 py-2">${student.email}</td>
            <td class="px-4 py-2">${student.courseCount}</td>
            <td class="px-4 py-2">${new Date(student.createdAt).toLocaleDateString()}</td>
            <td class="px-4 py-2">
              <button class="text-blue-500 hover:underline" data-uid="${student.uid}">Batafsil</button>
            </td>
          </tr>
        `;
                tableBody.insertAdjacentHTML('beforeend', row);
            });

    } catch (err) {
        console.error("❌ Xatolik:", err);
        tableBody.innerHTML = `
      <tr class="bg-red-50">
        <td colspan="6" class="text-center text-red-500 py-6">Ma’lumotlarni yuklashda xatolik yuz berdi.</td>
      </tr>
    `;
    }
});

// 🔍 Modal elementlari
const studentModal = document.getElementById('student-modal');
const studentDetailContent = document.getElementById('student-detail-content');
const closeStudentModalBtn = document.getElementById('close-student-modal');

// 🔘 Batafsil tugmasi ishlovchisi
tableBody.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-uid]');
  if (!btn) return;

  const studentUid = btn.getAttribute('data-uid');
  if (!studentUid) return;

  try {
    // 1. O‘quvchi ma’lumotlarini olish
    const studentSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', studentUid)));
    if (studentSnap.empty) {
      studentDetailContent.innerHTML = `<p class="text-red-600">Ma’lumot topilmadi.</p>`;
      studentModal.classList.remove('hidden');
      return;
    }

    const userData = studentSnap.docs[0].data();

    // 2. Instructor kurslarini topish
    const instructorCoursesSnap = await getDocs(query(collection(db, 'courses'), where('authorId', '==', auth.currentUser.uid)));
    const instructorCourseMap = {};
    instructorCoursesSnap.forEach(doc => instructorCourseMap[doc.id] = doc.data());

    // 3. O‘quvchining instructor kurslarini aniqlash
    const purchased = userData.purchasedCourses || [];
    const matching = purchased.filter(id => instructorCourseMap[id]);

    const coursesHTML = matching.map(courseId => {
      const course = instructorCourseMap[courseId];
      return `
        <li class="mb-2">
          <strong>${course.title}</strong><br/>
          Narxi: ${course.price?.toLocaleString('uz-UZ') || 'Nomaʼlum'} so‘m<br/>
          Sotib olingan: ${new Date(userData.createdAt).toLocaleDateString('uz-UZ')}
        </li>
      `;
    }).join('');

    // 4. Modalga yuklash
    studentDetailContent.innerHTML = `
      <div class="flex gap-4 items-start">
        <img src="${userData.avatar || 'https://via.placeholder.com/64'}" class="w-20 h-20 rounded-full object-cover" />
        <div>
          <p><strong>Ism:</strong> ${userData.name}</p>
          <p><strong>Email:</strong> ${userData.email}</p>
          <p><strong>Ro‘yxatdan o‘tgan:</strong> ${new Date(userData.createdAt).toLocaleDateString('uz-UZ')}</p>
          <p><strong>Instruktor kurslaridan olganlari:</strong></p>
          <ul class="list-disc list-inside mt-2">
            ${coursesHTML || '<li>Hozircha yo‘q</li>'}
          </ul>
        </div>
      </div>
    `;

    studentModal.classList.remove('hidden');

  } catch (err) {
    console.error("Modalda xatolik:", err);
    studentDetailContent.innerHTML = `<p class="text-red-600">Ma’lumotlarni yuklashda xatolik.</p>`;
    studentModal.classList.remove('hidden');
  }
});

// ❌ Modal yopish
closeStudentModalBtn.addEventListener('click', () => {
    studentModal.classList.add('hidden');
    studentDetailContent.innerHTML = '';
});

// 🚪 Logout
logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    localStorage.removeItem('currentUser');
    window.location.href = '/auth.html?mode=login';
});
