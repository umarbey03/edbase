// blog.js
import { blogPosts } from './blogData.js';

const container = document.getElementById("blogContainer");

blogPosts.forEach(post => {
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
