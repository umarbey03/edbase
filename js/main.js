// main.js
import { db } from './firebase-config.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { blogPosts } from './blogData.js';

const categoryColors = {
  IT: 'indigo',
  Languages: 'green',
  Business: 'yellow',
  Design: 'purple',
  STEM: 'blue',
  Other: 'gray'
};

async function loadCategories() {
  const container = document.getElementById("categoryList");

  try {
    const snapshot = await getDocs(collection(db, "categories"));
    // console.log("categories :", snapshot);

    if (snapshot.empty) {
      container.innerHTML = "<p class='text-center text-gray-500 col-span-3'>Kategoriyalar topilmadi.</p>";
      return;
    }

    let html = '';
    snapshot.forEach(doc => {
      const cat = doc.data();
      const color = categoryColors[cat.name] || 'gray';

      html += `
  <a href="/courses.html?category=${encodeURIComponent(cat.name)}"
     class="group block bg-${color}-50 hover:bg-${color}-100 p-6 rounded-xl shadow transition transform hover:-translate-y-1">
    
    <div class="flex justify-between items-start">
      <h3 class="text-lg font-semibold text-${color}-700">
        ${cat.icon} ${cat.name}
      </h3>
      <svg class="w-5 h-5 text-${color}-400 group-hover:text-${color}-600 transition" fill="none" stroke="currentColor"
           stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </div>
    
    <p class="text-sm text-gray-600 mt-2">${cat.description}</p>
  </a>
`;

    });

    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = "<p class='text-center text-red-500'>Xatolik yuz berdi.</p>";
    console.error("Kategoriya yuklashda xatolik:", error);
  }
}

async function loadPopularCourses() {
  const container = document.getElementById("popularCourses");

  try {
    const q = query(
      collection(db, "courses"),
      where("popular", "==", true),
      where("status", "==", "published")
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      container.innerHTML = "<p class='col-span-3 text-center text-gray-500'>Ommabop kurslar topilmadi.</p>";
      return;
    }

    container.innerHTML = "";
    querySnapshot.forEach(doc => {
      const course = doc.data();
      const priceText = course.price === 0 ? "Bepul" : `${course.price.toLocaleString()} so‘m`;
      const ratingStars = "⭐️".repeat(Math.round(course.avarageRating || 0));

      container.innerHTML += `
        <div class="bg-white p-4 rounded-xl shadow hover:shadow-lg transition">
          <img src="${course.imgUrl || 'https://via.placeholder.com/400x200'}"
               alt="${course.title}"
               class="rounded-md mb-4 w-full h-40 object-cover" />
          <h3 class="text-lg font-semibold mb-1">${course.title}</h3>
          <div class="text-sm text-gray-600 my-2">
      👨‍🏫 <span>${course.authorName}</span><br>
      🏫 <span>${course.centerName}</span>
    </div>

    <div class="flex items-center justify-between text-xs text-gray-500 my-2 font-medium">
      <span>📘 ${course.level}</span>
      <span>🌐 ${course.language}</span>
    </div>
          <p class="text-sm text-gray-700 mb-2">💰 <span class="font-medium">${priceText}</span></p>
          ${course.enableCertificate
        ? `<span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded w-fit">📄 Sertifikat mavjud</span>`
        : `<span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded w-fit">Sertifikatsiz</span>`
      }
          <p class="text-sm text-yellow-500 my-4">⭐️ ${ratingStars} (${course.averageRating || 0})</p>
          <a href="/course.html?id=${doc.id}"
             class="inline-block text-sm bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition">
            Batafsil
          </a>
        </div>
      `;
    });

  } catch (err) {
    container.innerHTML = "<p class='col-span-3 text-center text-red-500'>Xatolik yuz berdi.</p>";
    console.error("Firestore error:", err);
  }
}

const container = document.getElementById("landingBlogPreview");

blogPosts.slice(0, 3).forEach(post => {
  const card = `
    <div class="bg-white rounded-2xl shadow hover:shadow-lg transition overflow-hidden">
      <img src="${post.image}" alt="${post.title}" class="w-full h-40 object-cover">
      <div class="p-5">
        <h3 class="font-semibold text-lg mb-2 text-gray-800">${post.title}</h3>
        <p class="text-sm text-gray-600 mb-4">${post.description}</p>
        <a href="blog-post.html?id=${post.id}" class="text-indigo-600 text-sm font-semibold hover:underline">Batafsil →</a>
      </div>
    </div>
  `;
  container.insertAdjacentHTML("beforeend", card);
});

document.addEventListener("DOMContentLoaded", () => {
  loadCategories();
  loadPopularCourses();
});
