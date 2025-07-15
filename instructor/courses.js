// 📁 /js/courses.js
import { db, auth } from '../js/firebase-config.js';
import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    doc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

window.addEventListener('DOMContentLoaded', () => {
    const coursesList = document.getElementById('courses-list');
    const noCoursesMessage = document.getElementById('no-courses');
    const loader = document.getElementById('loader');
    const statusFilter = document.getElementById('status-filter');
    const showCoursesBtn = document.getElementById('show-courses');
    const logoutBtn = document.getElementById('logout-btn');

    if (!coursesList || !noCoursesMessage || !loader || !statusFilter || !showCoursesBtn || !logoutBtn) {
        console.error('❌ Baʼzi elementlar topilmadi');
        return;
    }

    auth.onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = '/auth.html?mode=login&redirectUrl=/instructor/courses.html';
            return;
        }

        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (currentUser.role !== 'instructor' && currentUser.role !== 'learningCenter') {
            window.location.href = '/auth.html?mode=login&redirectUrl=/instructor/courses.html';
            return;
        }

        loadCourses(user.uid);
    });

    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            localStorage.removeItem('currentUser');
            window.location.href = '/auth.html?mode=login';
        } catch (error) {
            console.error('Chiqishda xato:', error);
            alert('Chiqishda xatolik yuz berdi: ' + error.message);
        }
    });

    function loadCourses(instructorId) {
        const loadCoursesWithFilter = () => {
            loader.classList.remove('hidden');
            coursesList.classList.add('hidden');
            noCoursesMessage.classList.add('hidden');

            let qRef = query(collection(db, 'courses'), where('authorId', '==', instructorId));
            const status = statusFilter.value;
            if (status !== 'all') {
                qRef = query(qRef, where('status', '==', status));
            }

            onSnapshot(qRef, (snapshot) => {
                loader.classList.add('hidden');
                coursesList.classList.remove('hidden');
                coursesList.innerHTML = '';
                noCoursesMessage.classList.add('hidden');

                if (snapshot.empty) {
                    noCoursesMessage.classList.remove('hidden');
                    return;
                }

                snapshot.forEach(docSnap => {
                    const course = docSnap.data();
                    const courseCard = `
<div class="bg-white p-4 rounded-lg shadow">
  ${course.imgUrl ? `<img src="${course.imgUrl}" alt="Kurs rasmi" class="w-full h-40 object-cover rounded mb-3">` : ''}
  <h3 class="font-semibold text-lg">${course.title || 'Nomsiz kurs'}</h3>
  <p class="text-sm text-gray-500">Status: ${course.status || 'Nomalum'}</p>
  <p class="text-sm text-gray-500">Narxi: ${course.isFree ? 'Bepul' : (course.price ? course.price.toLocaleString('uz-UZ') + ' so‘m' : 'Belgilanmagan')}</p>
  <p class="text-sm text-gray-500">Yozilganlar: ${course.enrollmentCount || 0}</p>
  <p class="text-sm text-gray-500">O‘rtacha reyting: ${course.averageRating ? course.averageRating.toFixed(1) : '0'} (${course.ratingCount || 0} baho)</p>
  <div class="mt-4 flex space-x-2">
    <a href="#" class="edit-course text-blue-500 hover:underline" data-id="${docSnap.id}">Tahrirlash</a>
    <a href="#" class="text-blue-500 hover:underline analytics-btn" data-id="${docSnap.id}">Statistika</a>
    <a href="/instructor/students?course=${docSnap.id}" class="text-blue-500 hover:underline">O‘quvchilar</a>
  </div>
</div>`;
                    coursesList.insertAdjacentHTML('beforeend', courseCard);
                });
            }, (error) => {
                loader.classList.add('hidden');
                coursesList.classList.remove('hidden');
                console.error('❌ Firestore snapshot xatosi:', error);
                alert('Kurslarni yuklashda xatolik: ' + error.message);
            });
        };

        showCoursesBtn.addEventListener('click', loadCoursesWithFilter);
        loadCoursesWithFilter();
    }

    document.getElementById('courses-list').addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit-course')) {
            e.preventDefault();
            const courseId = e.target.dataset.id;
            if (courseId) {
                sessionStorage.setItem('editCourseId', courseId);
                window.location.href = '/instructor/new-course.html';
            }
        } else if (e.target.classList.contains('analytics-btn')) {
            e.preventDefault();
            const courseId = e.target.dataset.id;
            if (courseId) {
                showAnalytics(courseId);
            }
        }
    });

    async function showAnalytics(courseId) {
        const modal = document.getElementById('analytics-modal');
        const contentDiv = document.getElementById('analytics-content');

        modal.classList.remove('hidden');
        contentDiv.innerHTML = '<p>Yuklanmoqda...</p>';

        const courseDoc = await getDoc(doc(db, "courses", courseId));
        const course = courseDoc.data();

        const enrollmentsSnap = await getDocs(query(collection(db, "enrollments"), where("courseId", "==", courseId)));
        const assignmentsSnap = await getDocs(query(collection(db, "assignments"), where("courseId", "==", courseId)));

        const enrolledCount = enrollmentsSnap.docs.length;
        const totalRevenue = course.isFree ? 0 : (course.price || 0) * enrolledCount;

        const progressMap = new Map();
        assignmentsSnap.forEach(doc => {
            const { userId } = doc.data();
            progressMap.set(userId, (progressMap.get(userId) || 0) + 1);
        });
        const avgProgress = progressMap.size ? Math.round([...progressMap.values()].reduce((a, b) => a + b, 0) / (progressMap.size * 4) * 100) : 0;

        let studentRows = '';
        for (let docSnap of enrollmentsSnap.docs) {
            const { userId, enrolledAt, pricePaid } = docSnap.data();
            const userSnap = await getDoc(doc(db, "users", userId));
            const user = userSnap.exists() ? userSnap.data() : { displayName: "Noma'lum", email: "-" };
            studentRows += `
<tr class="border-t">
  <td class="px-2 py-1">${user.displayName || user.email}</td>
  <td class="px-2 py-1">${new Date(enrolledAt?.toDate?.() || Date.now()).toLocaleDateString()}</td>
  <td class="px-2 py-1 text-right">${(pricePaid || course.price || 0).toLocaleString('uz-UZ')} so‘m</td>
</tr>`;
        }

        contentDiv.innerHTML = `
<div class="space-y-2 text-sm text-gray-700">
  <p><strong>Kurs nomi:</strong> ${course.title}</p>
  <p><strong>Ro'yxatdan o'tganlar:</strong> ${enrolledCount} ta foydalanuvchi</p>
  <p><strong>Umumiy tushum:</strong> ${totalRevenue.toLocaleString('uz-UZ')} so‘m</p>
  <p><strong>O‘rtacha progress:</strong> ${avgProgress}%</p>
  <p><strong>O‘rtacha baho:</strong> ⭐ ${course.averageRating?.toFixed(1) || 0} (${course.ratingCount || 0} baho)</p>
  <p><strong>Yaratilgan sana:</strong> ${new Date(course.createdAt?.toDate?.() || Date.now()).toLocaleDateString()}</p>
</div>

<div class="mt-4">
  <h4 class="font-semibold mb-2">📋 O‘quvchilar ro‘yxati</h4>
  <div class="overflow-auto max-h-60">
    <table class="min-w-full text-sm border">
      <thead class="bg-gray-100">
        <tr>
          <th class="px-2 py-1 text-left">Ism / Email</th>
          <th class="px-2 py-1 text-left">Sana</th>
          <th class="px-2 py-1 text-right">To‘lov</th>
        </tr>
      </thead>
      <tbody>${studentRows}</tbody>
    </table>
  </div>
</div>`;
        document.getElementById("close-analytics").addEventListener("click", () => {
            modal.classList.add('hidden');
        });
    }
});