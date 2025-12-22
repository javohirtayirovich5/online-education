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
  arrayUnion,
  arrayRemove,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION_NAME = 'subjects';

export const subjectService = {
  // Barcha fanlarni olish
  async getAllSubjects() {
    try {
      const snapshot = await getDocs(collection(db, COLLECTION_NAME));
      const subjects = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return { success: true, data: subjects };
    } catch (error) {
      console.error('Get subjects error:', error);
      return { success: false, error: error.message };
    }
  },

  // Yo'nalish bo'yicha fanlarni olish
  async getSubjectsByDepartment(departmentId) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME), 
        where('departmentId', '==', departmentId)
      );
      const snapshot = await getDocs(q);
      const subjects = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(s => s.isActive)
        .sort((a, b) => a.name.localeCompare(b.name));
      return { success: true, data: subjects };
    } catch (error) {
      console.error('Get subjects by department error:', error);
      return { success: false, error: error.message };
    }
  },

  // O'qituvchi fanlarini olish
  async getSubjectsByTeacher(teacherId) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME), 
        where('teacherId', '==', teacherId)
      );
      const snapshot = await getDocs(q);
      const subjects = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(s => s.isActive)
        .sort((a, b) => a.name.localeCompare(b.name));
      return { success: true, data: subjects };
    } catch (error) {
      console.error('Get subjects by teacher error:', error);
      return { success: false, error: error.message };
    }
  },

  // Guruh uchun fanlarni olish
  async getSubjectsByGroup(groupId) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME), 
        where('groupIds', 'array-contains', groupId)
      );
      const snapshot = await getDocs(q);
      const subjects = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(s => s.isActive)
        .sort((a, b) => a.name.localeCompare(b.name));
      return { success: true, data: subjects };
    } catch (error) {
      console.error('Get subjects by group error:', error);
      return { success: false, error: error.message };
    }
  },

  // Aktiv fanlarni olish
  async getActiveSubjects() {
    try {
      const snapshot = await getDocs(collection(db, COLLECTION_NAME));
      const subjects = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(s => s.isActive !== false) // isActive undefined yoki true bo'lsa
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      return { success: true, data: subjects };
    } catch (error) {
      console.error('Get active subjects error:', error);
      return { success: false, error: error.message };
    }
  },

  // Bitta fanni olish
  async getSubjectById(subjectId) {
    try {
      const docRef = doc(db, COLLECTION_NAME, subjectId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
      }
      return { success: false, error: 'Fan topilmadi' };
    } catch (error) {
      console.error('Get subject error:', error);
      return { success: false, error: error.message };
    }
  },

  // Yangi fan yaratish
  async createSubject(subjectData) {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...subjectData,
        groupIds: subjectData.groupIds || [],
        lessonsCount: 0,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Create subject error:', error);
      return { success: false, error: error.message };
    }
  },

  // Fanni yangilash
  async updateSubject(subjectId, updates) {
    try {
      const docRef = doc(db, COLLECTION_NAME, subjectId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Update subject error:', error);
      return { success: false, error: error.message };
    }
  },

  // Fanga guruh qo'shish
  async addGroupToSubject(subjectId, groupId) {
    try {
      const docRef = doc(db, COLLECTION_NAME, subjectId);
      await updateDoc(docRef, {
        groupIds: arrayUnion(groupId),
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Add group to subject error:', error);
      return { success: false, error: error.message };
    }
  },

  // Fandan guruhni olib tashlash
  async removeGroupFromSubject(subjectId, groupId) {
    try {
      const docRef = doc(db, COLLECTION_NAME, subjectId);
      await updateDoc(docRef, {
        groupIds: arrayRemove(groupId),
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Remove group from subject error:', error);
      return { success: false, error: error.message };
    }
  },

  // Fanni o'chirish
  async deleteSubject(subjectId) {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, subjectId));
      return { success: true };
    } catch (error) {
      console.error('Delete subject error:', error);
      return { success: false, error: error.message };
    }
  }
};

