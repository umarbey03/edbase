import { getCurrentUser } from "./storage.js";
import { mockCourses } from "./mockCourses.js";

const user = getCurrentUser();
if (!user || user.role !== "student") {
  window.location.href = "/auth.html";
}

// 👋 Salomlashish
document.getElementById("studentName").textContent = `Salom, ${user.name || "Talaba"}`;
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("user");
  window.location.href = "/auth.html";
});

// 📊 Statistikalar
function renderStats(courses) {
  document.getElementById("activeCount").textContent = courses.filter(c => c.status === "active").length;
  document.getElementById("completedCount").textContent = courses.filter(c => c.status === "completed").length;
  document.getElementById("certificateCount").textContent = courses.filter(c => c.certificate).length;
}

// 🎥 Kurs kartasi
function createCourseCard(course, type = "recent") {
  const card = document.createElement("div");
  card.className = "rounded-xl shadow p-4 hover:shadow-lg transition " +
    (type === "recent" ? "bg-white" : "border border-indigo-100 bg-indigo-50");

  const commonInfo = `
    <img src="https://static.vecteezy.com/system/resources/previews/003/266/875/large_2x/isometric-3d-online-exam-or-course-concept-with-books-free-vector.jpg" class="w-full h-32 object-cover rounded mb-3" alt="${course.name}" />
    <h3 class="text-lg font-bold mb-1">${course.name}</h3>
    <p class="text-sm text-gray-600 mb-1">Modul: ${course.module}</p>
    <p class="text-xs text-gray-500 mb-2">Davomiylik: ${course.duration || "1 oy"} | ⭐️ ${course.rating || 4.5}</p>
  `;

  if (type === "recent") {
    card.innerHTML = commonInfo + `
      <div class="flex justify-between text-sm mb-1">
        <span>Progress:</span>
        <span>${course.progress}%</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div class="bg-indigo-600 h-2 rounded-full" style="width: ${course.progress}%"></div>
      </div>
      <a href="course.html?id=${course.id}" class="block text-center bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition">Davom ettirish</a>
    `;
  } else if (type === "recommended") {
    card.innerHTML = commonInfo + `
      <a href="course.html?id=${course.id}" class="block text-center bg-white text-indigo-700 border border-indigo-600 py-2 rounded hover:bg-indigo-100 transition">Boshlash</a>
    `;
  }

  return card;
}

// 🧠 Kurslar ro‘yxatini chiqarish
function renderCourses(courses, containerId, type = "recent") {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  courses.forEach(course => container.appendChild(createCourseCard(course, type)));
}

localStorage.setItem("previousPage", "dashboard");

// 🔄 Render qilish
renderStats(mockCourses);
renderCourses(mockCourses.slice(0, 3), "recentCourses", "recent");
renderCourses(mockCourses.slice(3, 6), "recommendedCourses", "recommended");
