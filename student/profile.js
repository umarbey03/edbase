import { db, auth } from '../js/firebase-config.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const profileForm = document.getElementById('profileForm');
const profilePicInput = document.getElementById('profilePic');
const profilePicPreview = document.getElementById('profilePicPreview');
const logoutBtn = document.getElementById('logoutBtn');
const userName = document.getElementById('userName');

// 🔐 Foydalanuvchini kutamiz
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "/auth.html?redirectUrl=/settings.html";
        return;
    }

    const currentUser = user;

    // Navbar ismni chiqarish
    const userSnap = await getDoc(doc(db, "users", currentUser.uid));
    const userData = userSnap.exists() ? userSnap.data() : {};
    userName.textContent = userData.name || "Foydalanuvchi";

    // Profil ma'lumotlarini yuklash
    document.getElementById('name').value = userData.name || "";
    document.getElementById('email').value = currentUser.email || "";
    document.getElementById('phone').value = userData.phone || "";

    if (userData.profilePicUrl) {
        profilePicPreview.src = userData.profilePicUrl;
        profilePicPreview.classList.remove('hidden');
    }

    // 🔄 Formani yuborish
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('name').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const password = document.getElementById('password').value.trim();

        const updates = { name, phone };

        try {
            if (profilePicInput.files.length > 0) {
                const file = profilePicInput.files[0];
                const storageRef = ref(storage, `profilePics/${currentUser.uid}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                updates.profilePicUrl = url;
            }

            await updateDoc(doc(db, "users", currentUser.uid), updates);

            if (password) {
                const oldPassword = prompt("Eski parolingizni kiriting:");
                if (!oldPassword) throw new Error("Eski parol kiritilmadi");

                const credential = EmailAuthProvider.credential(currentUser.email, oldPassword);
                await reauthenticateWithCredential(currentUser, credential);
                await updatePassword(currentUser, password);
            }

            alert("Profil muvaffaqiyatli yangilandi!");
            document.getElementById('password').value = "";
        } catch (error) {
            console.error(error);
            alert("Xatolik yuz berdi: " + error.message);
        }
    });

    // Profil rasmi ko‘rsatish
    profilePicInput.addEventListener('change', () => {
        const file = profilePicInput.files[0];
        if (file) {
            profilePicPreview.src = URL.createObjectURL(file);
            profilePicPreview.classList.remove('hidden');
        }
    });

    // 🔒 Logout
    logoutBtn.addEventListener('click', () => {
        auth.signOut().then(() => {
            localStorage.removeItem('currentUser');
            window.location.href = "/auth.html";
        });
    });
});
