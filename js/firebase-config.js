import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDuyWf7W-1G6NrahASCqv2sI1vAdXIozso",
  authDomain: "edbase-uz.firebaseapp.com",
  projectId: "edbase-uz",
  storageBucket: "edbase-uz.appspot.com", // storageBucket to'g'ri bo'lishi kerak, sizda noto'g'ri edi
  messagingSenderId: "808836322979",
  appId: "1:808836322979:web:bfb53e05925fc8ab145116",
  measurementId: "G-VHJBVZM1HZ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };
