const currentUser = JSON.parse(localStorage.getItem("currentUser"));

// Agar foydalanuvchi login qilmagan bo‘lsa → qaytaramiz
if (!currentUser || currentUser.role !== "student") {
  window.location.href = "/auth.html";
}

export const lessons = [
  {
    id: 1,
    title: "Kirish darsi",
    video: "https://www.w3schools.com/html/mov_bbb.mp4",
    description: "Bu kursning kirish darsi.",
    completed: false,
    hasQuiz: true
  },
  {
    id: 2,
    title: "Asosiy tushunchalar",
    video: "https://www.w3schools.com/html/movie.mp4",
    description: "Muhim terminlar bilan tanishamiz.",
    completed: false,
    hasQuiz: false
  },
];
