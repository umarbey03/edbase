import { db } from "./firebase-config.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// DOM
let allCourses = [];

const courseList = document.getElementById("courseList");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const priceFilter = document.getElementById("priceFilter");

// 🔄 Kurslarni yuklash (faqat published bo'lganlar)
async function loadCourses() {
  try {
    const q = query(collection(db, "courses"), where("status", "==", "published"));
    const snapshot = await getDocs(q);
    allCourses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    applyFilters(); // Default: hammasi ko‘rinadi
  } catch (error) {
    console.error("Kurslarni yuklashda xatolik:", error);
  }
}

// 🧮 Kurslar filtrini ishlatish
function applyFilters() {
  let filtered = [...allCourses];

  const searchQuery = searchInput.value.toLowerCase().trim();
  const category = categoryFilter.value;
  const price = priceFilter.value;

  if (searchQuery) {
    filtered = filtered.filter(course =>
      course.title?.toLowerCase().includes(searchQuery)
    );
  }

  if (category) {
    filtered = filtered.filter(course => course.category === category);
  }

  if (price === "free") {
    filtered = filtered.filter(course =>
      course.price == 0 || course.price?.toString().toLowerCase().includes("bepul")
    );
  } else if (price === "paid") {
    filtered = filtered.filter(course =>
      course.price > 0 && !course.price?.toString().toLowerCase().includes("bepul")
    );
  }

  renderCourses(filtered);
}

// 🖼 Kurslarni chizish
function renderCourses(courses) {
  courseList.innerHTML = "";

  if (courses.length === 0) {
    courseList.innerHTML = `<p class="text-center col-span-full text-gray-500">Kurslar topilmadi.</p>`;
    return;
  }

  courses.forEach(course => {
    const courseCard = document.createElement("div");
    courseCard.className = "bg-white p-4 rounded-xl shadow hover:shadow-lg transition";

    const price = course.price == 0 ? "Bepul" : `${course.price.toLocaleString()} so‘m`;

    courseCard.innerHTML = `
      <img src="${course.image || course.imgUrl || 'https://via.placeholder.com/400x200'}"
           alt="${course.title}" class="rounded-md mb-4 w-full h-40 object-cover" />
      <h3 class="text-lg font-semibold mb-1">${course.title}</h3>
      <p class="text-sm text-gray-700 mb-1">👨‍🏫 Mentor: <span class="font-medium">${course.instructorName || course.authorName || "Noma'lum"}</span></p>
      <p class="text-sm text-gray-700 mb-1">🏫 O‘quv markaz: <span class="font-medium">${course.centerName || '–'}</span></p>
      <p class="text-sm text-gray-700 mb-1">💰 <span class="font-medium">${price}</span></p>
      <p class="text-sm text-yellow-500 mb-3">⭐️ ${course.rating ?? "–"}</p>
      <a href="course.html?id=${course.id}" class="inline-block text-sm bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition">
        Batafsil
      </a>
    `;
    courseList.appendChild(courseCard);
  });
}

// 🔁 Listenerlar
searchInput?.addEventListener("input", applyFilters);
categoryFilter?.addEventListener("change", applyFilters);
priceFilter?.addEventListener("change", applyFilters);

// 🚀 Boshlanishida chaqiramiz
document.addEventListener("DOMContentLoaded", loadCourses);

// 👨‍🏫 Instruktorlar / LC ko‘rsatish
async function showInstructorsByCategory(selectedCategory) {
  const courseSnap = await getDocs(collection(db, "courses"));
  const filteredCourses = courseSnap.docs.filter(doc => doc.data().category === selectedCategory);

  const authorIds = [...new Set(filteredCourses.map(doc => doc.data().lc))]; // lc = Learning Center ID

  const instructorSnap = await getDocs(collection(db, "instructors")); // collection nomi: instructors
  const instructors = instructorSnap.docs
    .filter(doc => authorIds.includes(doc.id))
    .map(doc => ({ id: doc.id, ...doc.data() }));

  renderInstructorCards(instructors);
}

// 🎨 Instruktor kartalarini chizish
function renderInstructorCards(instructors) {
  courseList.innerHTML = "";

  if (instructors.length === 0) {
    courseList.innerHTML = `<p class="text-center col-span-full text-gray-500">Instruktorlar topilmadi.</p>`;
    return;
  }

  instructors.forEach(instr => {
    // 🧮 Ratinglarni hisoblash
    let avgRating = "–";
    if (instr.feedbacks) {
      const ratings = Object.values(instr.feedbacks)
        .map(fb => fb.rating)
        .filter(r => typeof r === "number");

      if (ratings.length > 0) {
        const sum = ratings.reduce((acc, r) => acc + r, 0);
        avgRating = (sum / ratings.length).toFixed(1);
      }
    }

    const card = document.createElement("div");
    card.className = "bg-white p-6 rounded-xl shadow hover:shadow-lg transition text-center";
    card.innerHTML = `
      <img src="${instr.image || 'default-avatar.png'}" class="rounded-full w-24 h-24 object-cover mx-auto mb-4 border" />
      <h3 class="text-xl font-bold mb-1">${instr.name}</h3>
      <p class="text-sm text-gray-600 mb-1">${instr.type === 'lc' ? 'O‘quv markaz' : 'Instruktor'}</p>
      <p class="text-sm text-yellow-500 mb-3">⭐️ Reyting: ${avgRating}</p>
      <a href="courses.html?lc=${instr.id}" class="text-sm inline-block bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition">Kurslarini ko‘rish</a>
    `;
    courseList.appendChild(card);
  });
}

// 🔁 View rejim tanlash
viewMode.addEventListener("change", () => {
  const selected = viewMode.value;
  const selectedCategory = categoryFilter.value;

  if (selected === "courses") {
    applyFilters();
  } else if (selected === "instructors") {
    if (!selectedCategory) {
      alert("Iltimos, avval kategoriya tanlang.");
      categoryFilter.focus();
      return;
    }
    showInstructorsByCategory(selectedCategory);
  }
});


// 🟢 Ishga tushirish
loadCourses();
window.applyFilters = applyFilters;
