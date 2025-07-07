// ✅ auth.js (Firebase bilan to‘liq dinamik, pro versiyasi)

import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔄 URL parametrlar
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
const errorBox = document.getElementById("errorBox");

const fullNameGroup = document.getElementById("fullNameGroup");
const confirmPasswordGroup = document.getElementById("confirmPasswordGroup");
const roleGroup = document.getElementById("roleGroup");
const roleSelect = document.getElementById("roleSelect");

// 🧠 Ko‘rinishni yangilash
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
      roleSelect.value = forcedRole;
      roleGroup.classList.add("hidden");
    }
  } else {
    formTitle.textContent = "Kirish";
    switchText.textContent = "Ro‘yxatdan o‘tmaganmisiz?";
    switchBtn.textContent = "Ro‘yxatdan o‘tish";
    fullNameGroup.classList.add("hidden");
    confirmPasswordGroup.classList.add("hidden");
    roleGroup.classList.add("hidden");
  }

  errorBox.classList.add("hidden");
}

// 🔁 Toggle holat
switchBtn.addEventListener("click", () => {
  isRegister = !isRegister;
  updateFormView();
});

// ❗️ Xatolik ko‘rsatish
function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove("hidden");
}

// ✅ Formani yuborish
authForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;

  if (isRegister) {
    const fullName = document.getElementById("fullName").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value;
    const role = forcedRole || roleSelect.value;

    if (!fullName || !email || !password || !confirmPassword)
      return showError("Barcha maydonlarni to‘ldiring.");
    if (password !== confirmPassword)
      return showError("Parollar mos emas.");

    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;

      // Firestorega saqlash
      await setDoc(doc(db, "users", uid), {
        uid,
        name: fullName,
        email,
        role,
        createdAt: new Date().toISOString()
      });

      localStorage.setItem("currentUser", JSON.stringify({
        uid: userCred.user.uid,       // 🔥 SHU QATOR MUHIM!
        email,
        name: fullName,
        role
      }));
      window.location.href = redirectUrl || `/${role}/dashboard.html`;
    } catch (err) {
      console.error("[REGISTER ERROR]", err);
      showError("Ro‘yxatdan o‘tishda xatolik: " + err.message);
    }

  } else {
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;

      // 🔄 Foydalanuvchi ma’lumotlarini olish
      const userSnap = await getDoc(doc(db, "users", uid));
      if (!userSnap.exists()) return showError("Foydalanuvchi topilmadi!");

      const userData = userSnap.data();
      localStorage.setItem("currentUser", JSON.stringify(userData));
      window.location.href = redirectUrl || `/${userData.role}/dashboard.html`;
    } catch (err) {
      console.error("[LOGIN ERROR]", err);
      showError("Kirishda xatolik: Email yoki parol noto‘g‘ri.");
    }
  }
});

// ▶️ Boshlanishda formani yangilash
updateFormView();
