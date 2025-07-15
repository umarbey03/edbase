// blog-post.js
import { blogPosts } from './blogData.js';

// URLdan ID olish
const urlParams = new URLSearchParams(window.location.search);
const blogId = parseInt(urlParams.get("id"));

const blog = blogPosts.find(item => item.id === blogId);
const container = document.getElementById("blogContent");

if (!blog) {
  container.innerHTML = `<p class="text-red-500">Maqola topilmadi.</p>`;
} else {
  container.innerHTML = `
    <img src="${blog.image}" alt="${blog.title}" class="rounded-xl shadow w-full h-64 object-cover mb-6">
    <h1 class="text-3xl font-bold text-gray-800">${blog.title}</h1>
    <div class="text-gray-700 leading-relaxed text-lg">
      ${blog.fullText}
    </div>
  `;
}
