const currentUser = JSON.parse(localStorage.getItem("currentUser"));

// Agar foydalanuvchi login qilmagan bo‘lsa → qaytaramiz
if (!currentUser || currentUser.role !== "student") {
  window.location.href = "/auth.html";
}

export function getCurrentUser() {
  const user = localStorage.getItem("currentUser");
  return user ? JSON.parse(user) : null;
}
