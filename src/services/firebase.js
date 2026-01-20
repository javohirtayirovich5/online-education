import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

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

// Initialize services
export const auth = getAuth(app);

// Set persistence to localStorage (sessions persist across page refreshes)
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error('Error setting auth persistence:', error);
  });
}

export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;

