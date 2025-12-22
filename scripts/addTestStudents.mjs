// Firebase'ga test talabalar qo'shish scripti
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDIwJPSEULiqg2PB64tPv8esAHCHPBlHmQ",
  authDomain: "education-pro1.firebaseapp.com",
  projectId: "education-pro1",
  storageBucket: "education-pro1.firebasestorage.app",
  messagingSenderId: "1087873877448",
  appId: "1:1087873877448:web:d4955231340208905b6cfd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Guruh ma'lumotlari
const GROUP_ID = "YpinxznExT9Pxp00Tr2T";
const GROUP_NAME = "45-24-ET";
const FACULTY_ID = "dvDi47vPHcwQwX9MUbIv";
const FACULTY_NAME = "Energetika";
const DEPARTMENT_ID = "snE4dWag3wuUVeWpGyMR";
const DEPARTMENT_NAME = "Elektr Taminoti";

// 10 ta test talaba
const students = [
  { name: "Aliyev Sardor", email: "sardor.aliyev@student.uz", phone: "+998901001001" },
  { name: "Karimova Dilnoza", email: "dilnoza.karimova@student.uz", phone: "+998901001002" },
  { name: "Rahimov Jasur", email: "jasur.rahimov@student.uz", phone: "+998901001003" },
  { name: "Toshmatova Madina", email: "madina.toshmatova@student.uz", phone: "+998901001004" },
  { name: "Ergashev Bekzod", email: "bekzod.ergashev@student.uz", phone: "+998901001005" },
  { name: "Xolmatova Nigora", email: "nigora.xolmatova@student.uz", phone: "+998901001006" },
  { name: "Sodiqov Amir", email: "amir.sodiqov@student.uz", phone: "+998901001007" },
  { name: "Yunusova Feruza", email: "feruza.yunusova@student.uz", phone: "+998901001008" },
  { name: "Qodirov Sherzod", email: "sherzod.qodirov@student.uz", phone: "+998901001009" },
  { name: "Nazarova Zarina", email: "zarina.nazarova@student.uz", phone: "+998901001010" }
];

async function addStudents() {
  console.log("🚀 Test talabalar qo'shish boshlandi...\n");
  
  const studentIds = [];
  const now = new Date().toISOString();

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const studentId = `test_student_${Date.now()}_${i}`;
    
    const studentData = {
      uid: studentId,
      email: student.email,
      displayName: student.name,
      photoURL: "/default-avatar.png",
      role: "student",
      phoneNumber: student.phone,
      createdAt: now,
      lastActive: now,
      isApproved: true,
      bio: "",
      address: "",
      facultyId: FACULTY_ID,
      facultyName: FACULTY_NAME,
      departmentId: DEPARTMENT_ID,
      departmentName: DEPARTMENT_NAME,
      groupId: GROUP_ID,
      groupName: GROUP_NAME
    };

    try {
      await setDoc(doc(db, "users", studentId), studentData);
      studentIds.push(studentId);
      console.log(`✅ ${i + 1}. ${student.name} - qo'shildi`);
    } catch (error) {
      console.error(`❌ ${student.name} - xatolik:`, error.message);
    }
  }

  // Talabalarni guruhga qo'shish
  if (studentIds.length > 0) {
    try {
      await updateDoc(doc(db, "groups", GROUP_ID), {
        students: arrayUnion(...studentIds)
      });
      console.log(`\n✅ ${studentIds.length} ta talaba "${GROUP_NAME}" guruhiga qo'shildi!`);
    } catch (error) {
      console.error("\n❌ Guruhga qo'shishda xatolik:", error.message);
    }
  }

  console.log("\n🎉 Tayyor!");
  process.exit(0);
}

addStudents();

