import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION_NAME = 'departments';

export const departmentService = {
  // Barcha yo'nalishlarni olish
  async getAllDepartments() {
    try {
      const snapshot = await getDocs(collection(db, COLLECTION_NAME));
      const departments = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      return { success: true, data: departments };
    } catch (error) {
      console.error('Get departments error:', error);
      return { success: false, error: error.message };
    }
  },

  // Fakultet bo'yicha yo'nalishlarni olish
  async getDepartmentsByFaculty(facultyId) {
    try {
      const snapshot = await getDocs(collection(db, COLLECTION_NAME));
      const departments = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(d => d.facultyId === facultyId && d.isActive !== false)
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      return { success: true, data: departments };
    } catch (error) {
      console.error('Get departments by faculty error:', error);
      return { success: false, error: error.message };
    }
  },

  // Aktiv yo'nalishlarni olish
  async getActiveDepartments() {
    try {
      const snapshot = await getDocs(collection(db, COLLECTION_NAME));
      const departments = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(d => d.isActive !== false)
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      return { success: true, data: departments };
    } catch (error) {
      console.error('Get active departments error:', error);
      return { success: false, error: error.message };
    }
  },

  // Bitta yo'nalishni olish
  async getDepartmentById(departmentId) {
    try {
      const docRef = doc(db, COLLECTION_NAME, departmentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
      }
      return { success: false, error: 'Yo\'nalish topilmadi' };
    } catch (error) {
      console.error('Get department error:', error);
      return { success: false, error: error.message };
    }
  },

  // Yangi yo'nalish yaratish
  async createDepartment(departmentData) {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...departmentData,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Create department error:', error);
      return { success: false, error: error.message };
    }
  },

  // Yo'nalishni yangilash
  async updateDepartment(departmentId, updates) {
    try {
      const docRef = doc(db, COLLECTION_NAME, departmentId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Update department error:', error);
      return { success: false, error: error.message };
    }
  },

  // Yo'nalishni o'chirish
  async deleteDepartment(departmentId) {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, departmentId));
      return { success: true };
    } catch (error) {
      console.error('Delete department error:', error);
      return { success: false, error: error.message };
    }
  }
};
