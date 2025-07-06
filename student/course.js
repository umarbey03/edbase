import { lessons } from './lessons.js';

const video = document.getElementById("lessonVideo");
const videoSrc = document.getElementById("videoSource");
const lessonTitle = document.getElementById("lessonTitle");
const lessonDescription = document.getElementById("lessonDescription");
const lessonList = document.getElementById("lessonList");
const markCompleted = document.getElementById("markCompleted");
const completeCourse = document.getElementById("completeCourse");
const reviewForm = document.getElementById("reviewForm");

let currentLessonIndex = 0;

// Foydalanuvchi nomi
const user = JSON.parse(localStorage.getItem("currentUser"));
document.getElementById("studentName").textContent = user?.name || "Talaba";

// Darslarni render qilish
function renderLessons() {
    lessonList.innerHTML = "";
    lessons.forEach((lesson, index) => {
        const li = document.createElement("li");
        li.textContent = lesson.title + (lesson.completed ? " ✅" : "");
        li.className = "cursor-pointer hover:underline" + (index === currentLessonIndex ? " font-bold" : "");
        li.onclick = () => loadLesson(index);
        lessonList.appendChild(li);
    });
}

// Tugallash
markCompleted.onclick = () => {
    lessons[currentLessonIndex].completed = true;
    renderLessons();
    checkAllCompleted();
};

// Hammasi tugaganligini tekshirish
function checkAllCompleted() {
    const allDone = lessons.every(l => l.completed);
    completeCourse.classList.toggle("hidden", !allDone);
}

// Sharh toggle
document.getElementById("leaveReviewBtn").onclick = () => {
    reviewForm.classList.toggle("hidden");
};

// Sharh yuborish
document.getElementById("submitReview").onclick = () => {
    const rating = document.getElementById("rating").value;
    const reviewText = document.getElementById("reviewText").value.trim();
    if (reviewText.length < 3) return alert("Iltimos, sharh kiriting.");
    console.log("Review submitted:", { rating, reviewText });
    alert("Sharhingiz yuborildi!");
    reviewForm.classList.add("hidden");
};

const startQuiz = document.getElementById("startQuiz");

function loadLesson(index) {
    currentLessonIndex = index;
    const lesson = lessons[index];
    videoSrc.src = lesson.video;
    video.load();
    lessonTitle.textContent = lesson.title;
    lessonDescription.textContent = lesson.description;

    // Test bor yoki yo‘qligiga qarab tugmani ko‘rsatamiz
    startQuiz.classList.toggle("hidden", !lesson.hasQuiz);

    renderLessons();
}

startQuiz.onclick = () => {
    const lesson = lessons[currentLessonIndex];
    alert(`📘 "${lesson.title}" darsiga oid test boshlanmoqda...`);
    // Bu yerga keyin quiz modal yoki alohida sahifaga yo‘naltirish qo‘shamiz
};

import { mockCourses } from "./mockCourses.js";
const courseId = new URLSearchParams(window.location.search).get("id");

const currentCourse = mockCourses.find(c => c.id === courseId);
const courseName = currentCourse ? currentCourse.name : "Noma'lum kurs";
document.getElementById("courseName").textContent = `📘 ${courseName}`;

// Boshlanish
loadLesson(0);
renderLessons();
