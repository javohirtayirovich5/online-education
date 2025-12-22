/**
 * Firebase Admin yaratish script
 * 
 * Foydalanish:
 * 1. Terminalda: node scripts/createAdmin.js
 * 2. Email va parolni kiriting
 * 3. Admin yaratiladi
 */

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import readline from 'readline';

// Firebase konfiguratsiya
const firebaseConfig = {
  apiKey: "AIzaSyDIwJPSEULiqg2PB64tPv8esAHCHPBlHmQ",
  authDomain: "education-pro1.firebaseapp.com",
  projectId: "education-pro1",
  storageBucket: "education-pro1.firebasestorage.app",
  messagingSenderId: "1087873877448",
  appId: "1:1087873877448:web:d4955231340208905b6cfd",
  measurementId: "G-1PGC8MR2BK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdmin() {
  try {
    console.log('\n=== Firebase Admin Yaratish ===\n');
    
    // Ma'lumotlarni so'rash
    const email = await question('Email manzil: ');
    const password = await question('Parol (kamida 6 belgi): ');
    const displayName = await question('To\'liq ism: ');
    
    if (!email || !password || !displayName) {
      console.error('Barcha maydonlar majburiy!');
      rl.close();
      return;
    }
    
    if (password.length < 6) {
      console.error('Parol kamida 6 belgidan iborat bo\'lishi kerak!');
      rl.close();
      return;
    }
    
    console.log('\nAdmin yaratilmoqda...\n');
    
    // 1. Firebase Authentication da foydalanuvchi yaratish
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log('✓ Firebase Authentication da foydalanuvchi yaratildi');
    
    // 2. Firestore da admin ma'lumotlarini saqlash
    const userDoc = {
      uid: user.uid,
      email: email,
      displayName: displayName,
      role: 'admin',
      phoneNumber: '',
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      isApproved: true, // Admin avtomatik tasdiqlangan
      bio: '',
      address: ''
    };
    
    await setDoc(doc(db, 'users', user.uid), userDoc);
    
    console.log('✓ Firestore da admin ma\'lumotlari saqlandi');
    console.log('\n✅ Admin muvaffaqiyatli yaratildi!');
    console.log(`\nEmail: ${email}`);
    console.log(`UID: ${user.uid}`);
    console.log(`\nEndi bu email va parol bilan tizimga kirishingiz mumkin.\n`);
    
  } catch (error) {
    console.error('\n❌ Xatolik:', error.message);
    
    if (error.code === 'auth/email-already-in-use') {
      console.error('\nBu email allaqachon ro\'yxatdan o\'tgan.');
      console.error('Agar bu foydalanuvchini admin qilmoqchi bo\'lsangiz, Firestore da role ni "admin" ga o\'zgartiring.');
    }
  } finally {
    rl.close();
    process.exit(0);
  }
}

// Script ni ishga tushirish
createAdmin();

