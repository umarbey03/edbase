// 📦 Firestore & Firebase config import
import { db, auth, storage } from '../js/firebase-config.js';
import {
  collection, addDoc, updateDoc, doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

window.addEventListener("DOMContentLoaded", async () => {
  const saveDraftBtn = document.getElementById("save-draft");
  const submitReviewBtn = document.getElementById("submit-review");
  const accordionHeader = document.querySelector(".accordion-header");

  const currentUser = JSON.parse(localStorage.getItem('currentUser'));

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = "/auth.html?mode=login&redirectUrl=/instructor/new-course.html";
      return;
    }

    accordionHeader?.addEventListener("click", (e) => {
      e.preventDefault();
      const body = document.querySelector(".accordion-body");
      body.classList.toggle("hidden");
    });

    const addModuleBtn = document.getElementById("add-module");
    addModuleBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      addModule();
    });

    const handleSubmit = async (status) => {
      try {
        const courseData = await buildCourseData(user, currentUser, status);
        await saveCourse(courseData);
      } catch (err) {
        console.error("Kurs yaratishda xatolik:", err);
        alert("Xatolik yuz berdi: " + err.message);
      }
    }

    saveDraftBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      handleSubmit("draft");
    });

    submitReviewBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      handleSubmit("under_review");
    });

    const editId = sessionStorage.getItem('editCourseId');
    if (editId) {
      const courseDoc = await getDoc(doc(db, "courses", editId));
      const data = courseDoc.data();

      const formFields = [
        ["course-title", data.title],
        ["course-description", data.description],
        ["course-category", data.category],
        ["course-language", data.language],
        ["course-level", data.level],
        ["course-price", data.price],
        ["course-img-url", data.imgUrl],
        ["author-name", data.authorName],
        ["center-name", data.centerName]
      ];

      formFields.forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.value = value || "";
      });

      const certEl = document.getElementById("enable-certificate");
      const freeEl = document.getElementById("course-free");
      if (certEl) certEl.checked = !!data.enableCertificate;
      if (freeEl) freeEl.checked = !!data.isFree;

      data.modules.forEach(module => addModule(module));
    }
  });
});

function addModule(data = null) {
  const moduleDiv = document.createElement('div');
  moduleDiv.className = 'module bg-white p-5 rounded-2xl shadow-md border border-gray-200 space-y-3 relative';

  const detailsEl = document.createElement('details');
  detailsEl.open = true;
  detailsEl.classList.add('group');

  const summary = document.createElement('summary');
  summary.className = 'flex justify-between items-center cursor-pointer select-none font-medium text-lg';

  const inputWrapper = document.createElement('div');
  inputWrapper.className = 'w-full flex gap-3 items-center';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = '🔩 Modul nomi';
  input.value = data?.title || '';
  input.className = 'module-title w-full border-2 border-blue-200 focus:border-blue-500 px-4 py-2 rounded-xl text-lg font-medium';
  input.required = true;

  // Prevent summary from toggling when typing
  input.addEventListener('keydown', (e) => e.stopPropagation());
  input.addEventListener('click', (e) => e.stopPropagation());

  inputWrapper.appendChild(input);
  summary.appendChild(inputWrapper);
  detailsEl.appendChild(summary);

  const lessonsContainer = document.createElement('div');
  lessonsContainer.className = 'lessons-container space-y-4 mt-4';
  detailsEl.appendChild(lessonsContainer);

  const actionButtons = document.createElement('div');
  actionButtons.className = 'flex items-center gap-3 justify-between mt-2';
  actionButtons.innerHTML = `
    <button type="button" class="add-lesson bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg">
      ➕ Dars qo‘shish
    </button>
    <button type="button" class="delete-module text-red-500 text-sm hover:underline">
      🗑️ Modulni o‘chirish
    </button>
  `;
  detailsEl.appendChild(actionButtons);

  actionButtons.querySelector('.add-lesson')?.addEventListener('click', () => addLesson(lessonsContainer));
  actionButtons.querySelector('.delete-module')?.addEventListener('click', () => moduleDiv.remove());

  if (data?.lessons) {
    data.lessons.forEach(lesson => addLesson(lessonsContainer, lesson));
  }

  moduleDiv.appendChild(detailsEl);
  document.getElementById('modules-container')?.appendChild(moduleDiv);
}

function addLesson(container, lessonData = {}) {
  const lessonEl = document.createElement('div');
  lessonEl.className = 'lesson flex flex-col gap-2 border p-3 rounded-xl bg-gray-50';
  lessonEl.innerHTML = `
    <div class="flex flex-wrap gap-3 items-center">
      <input type="text" placeholder="Dars nomi" value="${lessonData.title || ''}" class="lesson-title w-1/3 border px-3 py-2 rounded" required />
      <input type="number" placeholder="Uzunligi (soniya)" value="${lessonData.duration || ''}" class="lesson-duration w-1/4 border px-3 py-2 rounded" />
      <select class="lesson-task-type w-1/4 border px-3 py-2 rounded">
        <option value="" disabled ${lessonData.taskType ? '' : 'selected'}>Topshiriq turi</option>
        <option value="open" ${lessonData.taskType === 'open' ? 'selected' : ''}>Ochiq</option>
        <option value="test" ${lessonData.taskType === 'test' ? 'selected' : ''}>Test</option>
        <option value="gap" ${lessonData.taskType === 'gap' ? 'selected' : ''}>Gap to‘ldirish</option>
        <option value="file" ${lessonData.taskType === 'file' ? 'selected' : ''}>Fayl + izoh</option>
      </select>
      <button type="button" class="delete-lesson text-red-500 text-sm">🗑️ O‘chirish</button>
    </div>
    <div class="task-section mt-2">${getTaskSection(lessonData.taskType, lessonData.taskDesc || '')}</div>
    <input type="file" accept="video/mp4" class="lesson-video w-full border px-3 py-2 rounded" />
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

async function buildCourseData(user, currentUser, status) {
  const getVal = (id) => document.getElementById(id)?.value?.trim() || "";
  const getEl = (id) => document.getElementById(id);

  let imgUrl = "";
  const courseImg = getEl("course-img")?.files?.[0];
  const imgUrlInput = getVal("course-img-url");

  if (courseImg) {
    const imgRef = ref(storage, `course_images/${user.uid}/${Date.now()}_${courseImg.name}`);
    await uploadBytes(imgRef, courseImg);
    imgUrl = await getDownloadURL(imgRef);
  } else if (imgUrlInput) {
    imgUrl = imgUrlInput;
  }

  let previewVideoUrl = "";
  const previewVideo = getEl("preview-video")?.files?.[0];

  if (previewVideo) {
    const videoRef = ref(storage, `preview_videos/${user.uid}/${Date.now()}_${previewVideo.name}`);
    await uploadBytes(videoRef, previewVideo);
    previewVideoUrl = await getDownloadURL(videoRef);
  }

  const modules = [];
  document.querySelectorAll(".module").forEach((modEl) => {
    const modTitle = modEl.querySelector(".module-title")?.value?.trim() || "";
    const lessons = [];

    modEl.querySelectorAll(".lesson").forEach((lessonEl) => {
      const title = lessonEl.querySelector(".lesson-title")?.value?.trim() || "";
      const duration = parseInt(lessonEl.querySelector(".lesson-duration")?.value || "0");
      const taskType = lessonEl.querySelector(".lesson-task-type")?.value || "";
      const taskDesc = lessonEl.querySelector(".lesson-task-desc, .task-question")?.value?.trim() || "";
      const videoFile = lessonEl.querySelector(".lesson-video")?.files?.[0];

      lessons.push({ title, duration, taskType, taskDesc, videoFile });
    });

    modules.push({ title: modTitle, lessons });
  });

  for (const module of modules) {
    for (const lesson of module.lessons) {
      if (lesson.videoFile) {
        const videoRef = ref(storage, `lesson_videos/${user.uid}/${Date.now()}_${lesson.videoFile.name}`);
        await uploadBytes(videoRef, lesson.videoFile);
        lesson.videoUrl = await getDownloadURL(videoRef);
      } else {
        lesson.videoUrl = "";
      }
      delete lesson.videoFile;
    }
  }

  return {
    title: getVal("course-title"),
    description: getVal("course-description"),
    category: getVal("course-category"),
    language: getVal("course-language"),
    level: getVal("course-level"),
    price: parseInt(getVal("course-price")) || 0,
    isFree: getEl("course-free")?.checked || false,
    enableCertificate: getEl("enable-certificate")?.checked || false,
    imgUrl,
    previewVideoUrl,
    modules,
    authorId: user.uid,
    authorName: getVal("author-name") || currentUser?.name || "",
    centerName: getVal("center-name") || currentUser?.centerName || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status,
    enrollmentCount: 0,
    averageRating: 0,
    ratingCount: 0,
  };
}

async function saveCourse(courseData) {
  const courseId = sessionStorage.getItem('editCourseId');

  if (courseId) {
    await updateDoc(doc(db, "courses", courseId), {
      ...courseData,
      updatedAt: new Date().toISOString(),
    });
    sessionStorage.removeItem('editCourseId');
  } else {
    await addDoc(collection(db, "courses"), courseData);
  }

  alert(courseData.status === "draft" ? "Qoralama saqlandi" : "Ko‘rib chiqishga yuborildi!");
  window.location.href = "/instructor/courses.html";
}

