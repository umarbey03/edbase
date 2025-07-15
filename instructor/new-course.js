
import { db, auth, storage } from '../js/firebase-config.js';
import {
    collection,
    addDoc,
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ❗ Referrer orqali noto'g'ri kelingan holatda edit ID ni tozalash
if (!document.referrer.includes('courses.html') && !document.referrer.includes('dashboard')) {
    sessionStorage.removeItem('editCourseId');
}

window.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById("new-course-form");
    const modulesContainer = document.getElementById("modules-container");
    const addModuleBtn = document.getElementById("add-module");
    const logoutBtn = document.getElementById("logout-btn");

    const courseId = sessionStorage.getItem('editCourseId');

    auth.onAuthStateChanged(async user => {
        if (!user) {
            window.location.href = '/auth.html?mode=login&redirectUrl=/instructor/new-course.html';
            return;
        }

        if (courseId) {
            const courseSnap = await getDoc(doc(db, 'courses', courseId));
            if (courseSnap.exists()) {
                const course = courseSnap.data();

                // Form qiymatlarini to'ldirish
                document.getElementById('course-title').value = course.title || '';
                document.getElementById('course-description').value = course.description || '';
                document.getElementById('course-category').value = course.category || '';
                document.getElementById('course-language').value = course.language || '';
                document.getElementById('course-level').value = course.level || '';
                document.getElementById('course-price').value = course.price || 0;
                document.getElementById('course-free').checked = course.isFree || false;
                document.getElementById('enable-certificate').checked = course.enableCertificate || false;

                if (course.imgUrl) {
                    const imgPreview = document.createElement('img');
                    imgPreview.src = course.imgUrl;
                    imgPreview.alt = "Kurs rasmi";
                    imgPreview.className = "w-full h-40 object-cover rounded mb-3";

                    const courseImgInput = document.getElementById("course-img");
                    courseImgInput.insertAdjacentElement("beforebegin", imgPreview);
                    document.getElementById("course-img-url").value = course.imgUrl;
                }
                // Modullarni chiqarish
                modulesContainer.innerHTML = '';
                course.modules.forEach(mod => addModule(mod));
            }
        }
    });

    logoutBtn.addEventListener('click', async () => {
        await signOut(auth);
        localStorage.removeItem('currentUser');
        window.location.href = '/auth.html?mode=login';
    });

    addModuleBtn.addEventListener("click", () => addModule());

    function addModule(moduleData = null) {
        const moduleEl = document.createElement('div');
        moduleEl.className = 'module border p-4 rounded-lg space-y-2';
        moduleEl.innerHTML = `
      <input type="text" placeholder="Modul nomi" value="${moduleData?.title || ''}" class="module-title w-full border px-3 py-2 rounded" required />
      <div class="lessons-container space-y-2"></div>
      <button type="button" class="add-lesson bg-blue-500 text-white px-3 py-1 rounded">+ Dars qo‘shish</button>
      <button type="button" class="delete-module text-red-500 hover:underline">O‘chirish</button>
    `;
        modulesContainer.appendChild(moduleEl);

        const lessonsContainer = moduleEl.querySelector('.lessons-container');
        moduleEl.querySelector('.add-lesson').addEventListener('click', () => addLesson(lessonsContainer));
        moduleEl.querySelector('.delete-module').addEventListener('click', () => moduleEl.remove());

        if (moduleData) {
            moduleData.lessons.forEach(lesson => addLesson(lessonsContainer, lesson));
        }
    }

    function addLesson(container, lessonData = {}) {
        const lessonEl = document.createElement('div');
        lessonEl.className = 'lesson flex flex-col gap-2 border p-2 rounded';
        lessonEl.innerHTML = `
      <div class="flex gap-2">
        <input type="text" value="${lessonData.title || ''}" placeholder="Dars nomi" class="lesson-title w-1/3 border px-3 py-2 rounded" required />
        <input type="number" value="${lessonData.duration || ''}" placeholder="Uzunligi (soniya)" class="lesson-duration w-1/4 border px-3 py-2 rounded" />
        <select class="lesson-task-type w-1/4 border px-3 py-2 rounded">
          <option value="" disabled ${lessonData.taskType ? '' : 'selected'}>Topshiriq turi</option>
          <option value="open" ${lessonData.taskType === 'open' ? 'selected' : ''}>Ochiq</option>
          <option value="test" ${lessonData.taskType === 'test' ? 'selected' : ''}>Test</option>
          <option value="gap" ${lessonData.taskType === 'gap' ? 'selected' : ''}>Gap to‘ldirish</option>
          <option value="file" ${lessonData.taskType === 'file' ? 'selected' : ''}>Fayl + izoh</option>
        </select>
        <button type="button" class="delete-lesson text-red-500">O‘chirish</button>
      </div>
      <div class="task-section">${getTaskSection(lessonData.taskType, lessonData.taskDesc || '')}</div>
      <input type="file" class="lesson-video w-full border px-3 py-2 rounded" accept="video/mp4" />
    `;

        lessonEl.querySelector('.delete-lesson').addEventListener('click', () => lessonEl.remove());
        lessonEl.querySelector('.lesson-task-type').addEventListener('change', (e) => {
            lessonEl.querySelector('.task-section').innerHTML = getTaskSection(e.target.value);
        });

        container.appendChild(lessonEl);
    }

    function getTaskSection(type, desc = '') {
        if (!type) return '';
        if (type === 'test') {
            return `
        <input type="text" placeholder="Savol" class="task-question w-full border px-3 py-2 rounded mb-2" value="${desc}" />
        <input type="text" placeholder="A javobi" class="task-a w-full border px-3 py-1 rounded" />
        <input type="text" placeholder="B javobi" class="task-b w-full border px-3 py-1 rounded" />
        <input type="text" placeholder="C javobi" class="task-c w-full border px-3 py-1 rounded" />
        <input type="text" placeholder="D javobi" class="task-d w-full border px-3 py-1 rounded" />
      `;
        }
        return `<textarea placeholder="Izoh yoki topshiriq matni" class="lesson-task-desc w-full border px-3 py-2 rounded">${desc}</textarea>`;
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        const courseId = sessionStorage.getItem('editCourseId');
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        const isDraft = e.submitter.id === 'save-draft';

        let previewVideoUrl = '';
        const previewVideo = document.getElementById("preview-video").files[0];
        if (previewVideo) {
            const videoRef = ref(storage, `previews/${user.uid}/${Date.now()}_${previewVideo.name}`);
            await uploadBytes(videoRef, previewVideo);
            previewVideoUrl = await getDownloadURL(videoRef);
        }

        let imgUrl = '';
        const courseImg = document.getElementById("course-img").files[0];
        const courseImgUrlInput = document.getElementById("course-img-url").value.trim();

        if (courseImg) {
            // fayldan yuklaymiz
            const imgRef = ref(storage, `course_images/${user.uid}/${Date.now()}_${courseImg.name}`);
            await uploadBytes(imgRef, courseImg);
            imgUrl = await getDownloadURL(imgRef);
        } else if (courseImgUrlInput) {
            // URL dan foydalanamiz
            imgUrl = courseImgUrlInput;
        }

        const modules = [];
        document.querySelectorAll(".module").forEach(modEl => {
            const modTitle = modEl.querySelector(".module-title").value;
            const lessons = [];
            modEl.querySelectorAll(".lesson").forEach(lessonEl => {
                const title = lessonEl.querySelector(".lesson-title").value;
                const duration = parseInt(lessonEl.querySelector(".lesson-duration").value) || 0;
                const taskType = lessonEl.querySelector(".lesson-task-type").value;
                const taskDesc = lessonEl.querySelector(".lesson-task-desc, .task-question")?.value || '';
                const videoFile = lessonEl.querySelector(".lesson-video").files[0];
                lessons.push({ title, duration, taskType, taskDesc, videoFile });
            });
            modules.push({ title: modTitle, lessons });
        });

        for (let mod of modules) {
            for (let lesson of mod.lessons) {
                if (lesson.videoFile) {
                    const videoRef = ref(storage, `lessons/${user.uid}/${Date.now()}_${lesson.videoFile.name}`);
                    await uploadBytes(videoRef, lesson.videoFile);
                    lesson.videoUrl = await getDownloadURL(videoRef);
                } else {
                    lesson.videoUrl = '';
                }
                delete lesson.videoFile;
            }
        }

        const courseData = {
            title: document.getElementById("course-title").value,
            description: document.getElementById("course-description").value,
            category: document.getElementById("course-category").value,
            language: document.getElementById("course-language").value,
            level: document.getElementById("course-level").value,
            price: parseInt(document.getElementById("course-price").value) || 0,
            isFree: document.getElementById("course-free").checked,
            enableCertificate: document.getElementById("enable-certificate").checked,
            previewVideoUrl,
            authorId: user.uid,
            authorName: currentUser.name || '',
            updatedAt: new Date().toISOString(),
            status: isDraft ? 'draft' : 'under_review',
            modules,
            imgUrl
        };

        try {
            if (courseId) {
                await updateDoc(doc(db, "courses", courseId), courseData);
                sessionStorage.removeItem('editCourseId');
            } else {
                courseData.createdAt = new Date().toISOString();
                courseData.enrollmentCount = 0;
                courseData.averageRating = 0;
                courseData.ratingCount = 0;
                await addDoc(collection(db, "courses"), courseData);
            }

            alert(isDraft ? "Qoralama saqlandi" : "Kurs yuborildi!");
            window.location.href = "/instructor/courses.html";
        } catch (err) {
            console.error("Xatolik:", err);
            alert("Xatolik yuz berdi: " + err.message);
        }
    });
});
