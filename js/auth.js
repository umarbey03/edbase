// 🔐 Statik foydalanuvchilar
const users = [
  {
    email: "student@mail.com",
    password: "123456",
    role: "student",
    name: "Ali Talaba",
    dashboard: "/student/dashboard.html"
  },
  {
    email: "instructor@mail.com",
    password: "123456",
    role: "instructor",
    name: "Ustoz Diyor",
    dashboard: "/instructor/dashboard.html"
  },
  {
    email: "lc@mail.com",
    password: "123456",
    role: "lc",
    name: "EduCenter",
    dashboard: "/lc/dashboard.html"
  },
  {
    email: "employer@mail.com",
    password: "123456",
    role: "employer",
    name: "IT Park HR",
    dashboard: "/employer/dashboard.html"
  }
];

// 🔁 URL parametrlar
const urlParams = new URLSearchParams(window.location.search);
const modeParam = urlParams.get("mode");
const forcedRole = urlParams.get("role");
const redirectUrl = urlParams.get("redirectUrl");

let isRegister = modeParam === "register";

// 📦 DOM elementlar
const authForm = document.getElementById("authForm");
const formTitle = document.getElementById("formTitle");
const switchText = document.getElementById("switchText");
const switchBtn = document.getElementById("switchBtn");
const roleSelect = document.getElementById("roleSelect");

const fullNameGroup = document.getElementById("fullNameGroup");
const confirmPasswordGroup = document.getElementById("confirmPasswordGroup");
const roleGroup = document.getElementById("roleGroup");

// ❗️ Xato xabar uchun element
const errorBox = document.createElement("p");
errorBox.className = "text-sm text-red-600 mt-2";
errorBox.style.display = "none";
authForm.appendChild(errorBox);

// 🔁 Formani holatga moslab yangilash
function updateFormView() {
  if (isRegister) {
    formTitle.textContent = "Ro‘yxatdan o‘tish";
    switchText.textContent = "Hisobingiz bormi?";
    switchBtn.textContent = "Kirish";
    fullNameGroup.classList.remove("hidden");
    confirmPasswordGroup.classList.remove("hidden");

    if (!forcedRole) {
      roleGroup.classList.remove("hidden");
    } else {
      roleGroup.classList.add("hidden");
      roleSelect.value = forcedRole;
    }
  } else {
    formTitle.textContent = "Kirish";
    switchText.textContent = "Ro‘yxatdan o‘tmaganmisiz?";
    switchBtn.textContent = "Ro‘yxatdan o‘tish";
    fullNameGroup.classList.add("hidden");
    confirmPasswordGroup.classList.add("hidden");
    roleGroup.classList.add("hidden");
  }

  errorBox.style.display = "none"; // har safar form o‘zgarsa xatolik yo‘qoladi
}

// 🔄 Rejim almashtirish tugmasi
function toggleMode() {
  isRegister = !isRegister;
  updateFormView();
}

// ❗️ Xatolik chiqaruvchi funksiya
function showError(message) {
  errorBox.textContent = message;
  errorBox.style.display = "block";
}

// ✅ Formani yuborish
function handleSubmit(e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;

  if (isRegister) {
    const fullName = document.getElementById("fullName").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value;
    const role = forcedRole || roleSelect.value;

    if (!fullName || !email || !password || password !== confirmPassword) {
      showError("Ma’lumotlar to‘liq emas yoki parollar mos emas!");
      return;
    }

    const newUser = {
      email,
      password,
      name: fullName,
      role,
      dashboard: `/${role}/dashboard.html`
    };

    console.log("[REGISTER]", newUser);
    localStorage.setItem("currentUser", JSON.stringify(newUser));
    window.location.href = redirectUrl || newUser.dashboard;

  } else {
    const foundUser = users.find(
      (user) => user.email === email && user.password === password
    );

    if (!foundUser) {
      showError("Email yoki parol noto‘g‘ri!");
      return;
    }

    localStorage.setItem("currentUser", JSON.stringify(foundUser));
    window.location.href = redirectUrl || foundUser.dashboard;
  }
}

// 🎯 Formani submitga bog‘lash
authForm.addEventListener("submit", handleSubmit);

// 🔄 Dastlabki ko‘rinishni belgilash
updateFormView();
