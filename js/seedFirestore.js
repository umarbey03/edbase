// // 🔹 Firestore ma'lumotlarini yaratish va to'ldirish uchun chuqurlashtirilgan skript
// import { db } from './firebase-config.js';
// import { collection, setDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// // 🔸 Kurs ID
// const courseId = "course1";

// // 🔹 Module → Lessons → Segments → Tasks generatsiya
// async function seedCourseStructure() {
//   try {
//     for (let m = 1; m <= 5; m++) {
//       const moduleId = `module${m}`;
//       const moduleRef = doc(db, "courses", courseId, "modules", moduleId);

//       await setDoc(moduleRef, {
//         title: `Modul ${m}`,
//         order: m
//       });

//       for (let l = 1; l <= 10; l++) {
//         const lessonId = `lesson${l}`;
//         const lessonRef = doc(moduleRef, "lessons", lessonId);

//         await setDoc(lessonRef, {
//           title: `Dars ${l}`,
//           order: l
//         });

//         const segmentCount = Math.floor(Math.random() * 4) + 1;
//         for (let s = 1; s <= segmentCount; s++) {
//           const segmentId = `segment${s}`;
//           const segmentRef = doc(lessonRef, "segments", segmentId);

//           await setDoc(segmentRef, {
//             title: `Qism ${s}`,
//             order: s
//           });

//           const taskCount = Math.floor(Math.random() * 5) + 1;
//           for (let t = 1; t <= taskCount; t++) {
//             const taskId = `task${t}`;
//             const taskRef = doc(segmentRef, "tasks", taskId);

//             await setDoc(taskRef, {
//               title: `Vazifa ${t}`,
//               description: `Bu avtomatik yaratilgan vazifa.`,
//               type: "multiple-choice",
//               points: 10,
//               difficulty: "easy",
//               order: t
//             });
//           }
//         }
//       }
//     }

//     console.log("✅ course1 uchun modul > dars > qism > vazifalar yozildi.");
//   } catch (err) {
//     console.error("❌ Xatolik yuz berdi:", err);
//   }
// }

// seedCourseStructure();


// // 🔹 Firestore ma'lumotlarini yaratish va to'ldirish uchun skript
// import { db } from './firebase-config.js';
// import { collection, setDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// const progresses = [
//     {
//         uid: "Wivql7CCyDfyR9SEx11cx0BLXVi1",
//         courseId: "course1",
//         completedLessons: [1, 2],
//         lastAccess: new Date().toISOString()
//     },
// ];

// const feedbacks = [
//     {
//         uid: "Wivql7CCyDfyR9SEx11cx0BLXVi1",
//         courseId: "course1",
//         rating: 5,
//         comment: "Ajoyib tushuntirildi!",
//         createdAt: new Date().toISOString()
//     },
// ];

// const certificates = [
//     {
//         uid: "Wivql7CCyDfyR9SEx11cx0BLXVi1",
//         courseId: "course1",
//         issuedAt: new Date().toISOString(),
//         certificateUrl: "https://example.com/certificates/laylo-course2.pdf"
//     }
// ];

// // 🔸 Kurslar
// const sampleCourses = [
//     {
//         id: "course1",
//         title: "Kompyuter Savodxonligi",
//         image: "https://i.pinimg.com/originals/29/73/72/297372fc2f2ad89d1e1fba5bbbb43b4b.jpg",
//         instructorId: "instr1",
//         instructorName: "Izzatillo Ubaydullayev",
//         centerName: "EdBase Learning Platform",
//         lc: "lc1",
//         price: "299,000 UZS",
//         rating: 4.7,
//         category: "it",
//         description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.",
//         previewVideo: "https://via.placeholder.com/800x400",
//         modules: [
//             {
//                 title: "1. Kirish",
//                 lessons: ["Dars 1", "Dars 2"]
//             },
//             {
//                 title: "2. Asosiy qism",
//                 lessons: ["Dars 1", "Dars 2"]
//             }
//         ],
//         reviews: [
//             { name: "Javohir", comment: "Juda zo‘r darslar!" },
//             { name: "Ziyoda", comment: "Yangi boshlovchilar uchun mos." }
//         ],
//         popular: true
//     },
// ];

// // 🔸 Instructorlar / Learning Centerlar
// const instructors = [
//     {
//         id: "lc1",
//         name: "EdBase Learning Platform",
//         type: "lc",
//         image: "/photos/lc/codeacademy.jpg",
//         feedbacks: {
//             u1: { rating: 4.5 },
//             u2: { rating: 5.0 }
//         }
//     }
// ];

// async function seedFirestore() {
//     try {
//         for (const course of sampleCourses) {
//             await setDoc(doc(db, "courses", course.id), course);
//         }

//         for (const instr of instructors) {
//             await setDoc(doc(db, "instructors", instr.id), instr);
//         }

//         for (const prog of progresses) {
//             await setDoc(doc(db, "progress", `${prog.uid}_${prog.courseId}`), prog);
//         }

//         for (const fb of feedbacks) {
//             await setDoc(doc(db, "feedbacks", `${fb.uid}_${fb.courseId}`), fb);
//         }

//         for (const cert of certificates) {
//             await setDoc(doc(db, "certificates", `${cert.uid}_${cert.courseId}`), cert);
//         }

//         console.log("✅ Ma'lumotlar Firestore bazasiga muvaffaqiyatli yozildi");
//     } catch (err) {
//         console.error("❌ Xatolik yuz berdi:", err);
//     }
// }

// seedFirestore();