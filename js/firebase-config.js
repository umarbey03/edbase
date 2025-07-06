// 📁 /js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔐 Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDuyWf7W-1G6NrahASCqv2sI1vAdXIozso",
  authDomain: "edbase-uz.firebaseapp.com",
  projectId: "edbase-uz",
  storageBucket: "edbase-uz.firebasestorage.app",
  messagingSenderId: "808836322979",
  appId: "1:808836322979:web:bfb53e05925fc8ab145116",
  measurementId: "G-VHJBVZM1HZ"
};

// 🔧 Firebase initialize
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ✅ Shu qator muhim:
export { db };
