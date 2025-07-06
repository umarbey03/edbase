import { getCurrentUser } from "./storage.js";
import { mockCourses } from "./mockCourses.js";

const user = getCurrentUser();
if (!user || user.role !== "student") {
  window.location.href = "/auth.html";
}

// 👋 Salomlashish
document.getElementById("studentName").textContent = `Salom, ${user.name}`;

// 🔢 Statistikalar
const active = mockCourses.filter(c => c.status === "active").length;
const completed = mockCourses.filter(c => c.status === "completed").length;
const certified = mockCourses.filter(c => c.certificate === true).length;

document.getElementById("activeCount").textContent = active;
document.getElementById("completedCount").textContent = completed;
document.getElementById("certificateCount").textContent = certified;

// 🧠 Oxirgi kurslar
const recentCourses = mockCourses.slice(0, 3);
const container = document.getElementById("recentCourses");

recentCourses.forEach(course => {
  const card = document.createElement("div");
  card.className = "bg-white rounded-xl shadow p-4";

  card.innerHTML = `
    <h3 class="text-lg font-bold mb-2">${course.name}</h3>
    <p class="text-sm text-gray-600 mb-2">Modul: ${course.module}</p>
    <div class="w-full bg-gray-200 rounded-full h-2 mb-4">
      <div class="bg-indigo-600 h-2 rounded-full" style="width: ${course.progress}%"></div>
    </div>
    <a href="course.html?id=${course.id}" class="block text-center bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition">Davom ettirish</a>
  `;

  container.appendChild(card);
});
