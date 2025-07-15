import { db, auth } from '../js/firebase-config.js';
import {
    collection,
    query,
    where,
    getDocs,
    onSnapshot,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// 🔐 Foydalanuvchi holatini tekshirish
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = '/auth.html?mode=login&redirectUrl=/instructor/dashboard.html';
        return;
    }

    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser.role !== 'instructor' && currentUser.role !== 'learningCenter') {
        window.location.href = '/auth.html?mode=login&redirectUrl=/instructor/dashboard.html';
        return;
    }

    const greetingName = currentUser.name || 'Foydalanuvchi';
    document.getElementById('user-greeting').textContent = `Assalomu alaykum, ${greetingName}`;
    loadDashboardData(user.uid);
});

// 🚪 Chiqish
document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        await signOut(auth);
        localStorage.removeItem('currentUser');
        window.location.href = '/auth.html?mode=login';
    } catch (error) {
        console.error('Chiqishda xato:', error);
        alert('Chiqishda xatolik yuz berdi!');
    }
});

let chartInstance;

// 📊 Dashboard statistikasi
async function loadDashboardData(instructorId) {
    try {
        // 1. Kurslar soni
        const coursesQuery = query(collection(db, 'courses'), where('authorId', '==', instructorId));
        const courseSnap = await getDocs(coursesQuery);
        document.getElementById('courses-count').textContent = courseSnap.size;

        const coursesContainer = document.getElementById('active-courses');
        coursesContainer.innerHTML = '';
        courseSnap.forEach(doc => {
            const course = doc.data();
            const courseCard = `
                <div class="border p-4 rounded-lg" data-id="${doc.id}">
                    <h3 class="font-semibold">${course.title}</h3>
                    <p class="text-sm text-gray-500">Status: ${course.status || 'Noma’lum'}</p>
                    <button class="edit-course text-blue-500 hover:underline mt-2">Tahrirlash</button>
                </div>`;
            coursesContainer.insertAdjacentHTML('beforeend', courseCard);
        });

        // 2. O‘quvchilar soni va So‘nggi o‘quvchilar
        const usersSnap = await getDocs(query(
            collection(db, 'users'),
            where('role', '==', 'student')
        ));

        const instructorCourseIds = courseSnap.docs.map(d => d.id);
        const courseMap = {}; // {id: title}
        courseSnap.forEach(doc => {
            courseMap[doc.id] = doc.data().title || 'Noma’lum';
        });

        const recentStudents = [];
        let studentCount = 0;

        usersSnap.forEach(doc => {
            const u = doc.data();
            const purchased = u.purchasedCourses || [];

            const matchedCourses = purchased.filter(cid => instructorCourseIds.includes(cid));
            if (matchedCourses.length > 0) {
                studentCount++;
                recentStudents.push({
                    name: u.name || 'Noma’lum',
                    email: u.email || '',
                    joined: u.createdAt || '',
                    courses: matchedCourses
                });
            }
        });

        document.getElementById('students-count').textContent = studentCount;

        // 5 nafarini ko‘rsatamiz
        const table = document.getElementById('recent-students');
        table.innerHTML = '';
        recentStudents
            .sort((a, b) => new Date(b.joined) - new Date(a.joined))
            .slice(0, 5)
            .forEach(student => {
                const courseTitles = student.courses.map(cid => courseMap[cid] || '---').join(', ');
                const row = `
                    <tr>
                        <td class="py-2">${student.name}</td>
                        <td>${courseTitles}</td>
                        <td>${student.joined ? new Date(student.joined).toLocaleDateString('uz-UZ') : '-'}</td>
                    </tr>`;
                table.insertAdjacentHTML('beforeend', row);
            });

        // 3. Bugungi kirim
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const transactionsQuery = query(
            collection(db, 'transactions'),
            where('instructorId', '==', instructorId),
            where('date', '>=', today.toISOString())
        );
        onSnapshot(transactionsQuery, (snapshot) => {
            let total = 0;
            snapshot.forEach(doc => {
                total += doc.data().amount || 0;
            });
            document.getElementById('today-income').textContent = `${total.toLocaleString('uz-UZ')} so‘m`;
        });

        // Grafikni chizamiz
        renderStudentsPerCourseChart(instructorId);
    } catch (err) {
        console.error("Dashboard yuklashda xatolik:", err);
        alert("Ma'lumotlarni yuklashda xato yuz berdi!");
    }
}

// 📈 Kurslar bo‘yicha grafik
async function renderStudentsPerCourseChart(instructorId) {
    const usersSnap = await getDocs(query(
        collection(db, 'users'),
        where('role', '==', 'student')
    ));
    const courseSnap = await getDocs(query(
        collection(db, 'courses'),
        where('authorId', '==', instructorId)
    ));

    const courseMap = {};  // {id: title}
    const counts = {};     // {title: count}

    courseSnap.forEach(doc => {
        const id = doc.id;
        const title = doc.data().title || 'Noma’lum';
        courseMap[id] = title;
        counts[title] = 0;
    });

    usersSnap.forEach(doc => {
        const u = doc.data();
        const purchased = u.purchasedCourses || [];
        purchased.forEach(cid => {
            if (courseMap[cid]) {
                const title = courseMap[cid];
                counts[title]++;
            }
        });
    });

    const labels = Object.keys(counts);
    const data = Object.values(counts);

    if (chartInstance) chartInstance.destroy();

    const ctx = document.getElementById('studentsPerCourseChart').getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'O‘quvchilar soni',
                data,
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.parsed.y} o‘quvchi`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 }
                }
            }
        }
    });
}

// 🖊 Tahrirlash tugmasi ishlovchisi
document.getElementById('active-courses').addEventListener('click', (e) => {
    if (e.target.classList.contains('edit-course')) {
        const courseId = e.target.closest('[data-id]').dataset.id;
        if (courseId) {
            // localStorage.setItem('editCourseId', courseId);
            sessionStorage.setItem('editCourseId', courseId);
            window.location.href = '/instructor/new-course.html';
        }
    }
});
