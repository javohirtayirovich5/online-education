import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION_NAME = 'faculties';

export const facultyService = {
  // Barcha fakultetlarni olish
  async getAllFaculties() {
    try {
      const snapshot = await getDocs(collection(db, COLLECTION_NAME));
      const faculties = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      return { success: true, data: faculties };
    } catch (error) {
      console.error('Get faculties error:', error);
      return { success: false, error: error.message };
    }
  },

  // Faqat aktiv fakultetlarni olish
  async getActiveFaculties() {
    try {
      const snapshot = await getDocs(collection(db, COLLECTION_NAME));
      const faculties = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(f => f.isActive !== false) // isActive undefined yoki true bo'lsa
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      return { success: true, data: faculties };
    } catch (error) {
      console.error('Get active faculties error:', error);
      return { success: false, error: error.message };
    }
  },

  // Bitta fakultetni olish
  async getFacultyById(facultyId) {
    try {
      const docRef = doc(db, COLLECTION_NAME, facultyId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
      }
      return { success: false, error: 'Fakultet topilmadi' };
    } catch (error) {
      console.error('Get faculty error:', error);
      return { success: false, error: error.message };
    }
  },

  // Yangi fakultet yaratish
  async createFaculty(facultyData) {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...facultyData,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Create faculty error:', error);
      return { success: false, error: error.message };
    }
  },

  // Fakultetni yangilash
  async updateFaculty(facultyId, updates) {
    try {
      const docRef = doc(db, COLLECTION_NAME, facultyId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Update faculty error:', error);
      return { success: false, error: error.message };
    }
  },

  // Fakultetni o'chirish
  async deleteFaculty(facultyId) {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, facultyId));
      return { success: true };
    } catch (error) {
      console.error('Delete faculty error:', error);
      return { success: false, error: error.message };
    }
  }
};

