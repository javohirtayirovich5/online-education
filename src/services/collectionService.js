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
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from './firebase';
import { storageService } from './storageService';

const COLLECTIONS_NAME = 'resourceCollections';

export const collectionService = {
  // O'qituvchining to'plamlarini olish
  async getCollectionsByTeacher(teacherId) {
    try {
      const q = query(
        collection(db, COLLECTIONS_NAME),
        where('teacherId', '==', teacherId)
      );
      const snapshot = await getDocs(q);
      const collections = snapshot.docs
        .map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }))
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return bTime - aTime; // Yangi bo'yicha (eng yangi birinchi)
        });
      return { success: true, data: collections };
    } catch (error) {
      console.error('Get collections by teacher error:', error);
      return { success: false, error: error.message };
    }
  },

  // Bitta to'plamni olish
  async getCollectionById(collectionId) {
    try {
      const docRef = doc(db, COLLECTIONS_NAME, collectionId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
      }
      return { success: false, error: 'To\'plam topilmadi' };
    } catch (error) {
      console.error('Get collection error:', error);
      return { success: false, error: error.message };
    }
  },

  // Yangi to'plam yaratish
  async createCollection(collectionData, previewImage) {
    try {
      let previewImageUrl = '';

      // Rasmni yuklash
      if (previewImage) {
        const fileName = previewImage.name;
        const basePath = `collections/${collectionData.teacherId}`;
        const filePath = `${basePath}/${Date.now()}_${fileName}`;
        const uploadResult = await storageService.uploadFile(previewImage, filePath);
        
        if (!uploadResult.success) {
          return { success: false, error: uploadResult.error || 'Rasm yuklashda xatolik' };
        }
        
        previewImageUrl = uploadResult.url;
      }

      const docRef = await addDoc(collection(db, COLLECTIONS_NAME), {
        teacherId: collectionData.teacherId,
        teacherName: collectionData.teacherName || '',
        title: collectionData.title,
        description: collectionData.description || '',
        previewImage: previewImageUrl,
        files: [], // Bu yerda fayl IDs yoki metadata saqlanadi
        groupId: collectionData.groupId || null,
        groupName: collectionData.groupName || '',
        subjectId: collectionData.subjectId || null,
        subjectName: collectionData.subjectName || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Create collection error:', error);
      return { success: false, error: error.message };
    }
  },

  // To'plamni yangilash
  async updateCollection(collectionId, updates, previewImage) {
    try {
      const updateData = { ...updates, updatedAt: serverTimestamp() };
      
      // Agar yangi preview rasm yuklansa
      if (previewImage) {
        const fileName = previewImage.name;
        const collection_doc = await this.getCollectionById(collectionId);
        
        if (collection_doc.success) {
          const basePath = `collections/${collection_doc.data.teacherId}`;
          const filePath = `${basePath}/${Date.now()}_${fileName}`;
          const uploadResult = await storageService.uploadFile(previewImage, filePath);
          
          if (!uploadResult.success) {
            return { success: false, error: uploadResult.error || 'Rasm yuklashda xatolik' };
          }
          
          updateData.previewImage = uploadResult.url;
        }
      }
      
      const docRef = doc(db, COLLECTIONS_NAME, collectionId);
      await updateDoc(docRef, updateData);
      return { success: true };
    } catch (error) {
      console.error('Update collection error:', error);
      return { success: false, error: error.message };
    }
  },

  // To'plamga fayl qo'shish
  async addFileToCollection(collectionId, fileData) {
    try {
      const docRef = doc(db, COLLECTIONS_NAME, collectionId);
      await updateDoc(docRef, {
        files: arrayUnion(fileData),
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Add file to collection error:', error);
      return { success: false, error: error.message };
    }
  },

  // To'plamdan fayl o'chirish
  async removeFileFromCollection(collectionId, fileData) {
    try {
      const docRef = doc(db, COLLECTIONS_NAME, collectionId);
      await updateDoc(docRef, {
        files: arrayRemove(fileData),
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Remove file from collection error:', error);
      return { success: false, error: error.message };
    }
  },

  // To'plamning fayl sonini yangilash
  async updateFileInCollection(collectionId, oldFileData, newFileData) {
    try {
      const docRef = doc(db, COLLECTIONS_NAME, collectionId);
      await updateDoc(docRef, {
        files: arrayRemove(oldFileData),
        updatedAt: serverTimestamp()
      });
      await updateDoc(docRef, {
        files: arrayUnion(newFileData),
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Update file in collection error:', error);
      return { success: false, error: error.message };
    }
  },

  // To'plamni o'chirish
  async deleteCollection(collectionId) {
    try {
      await deleteDoc(doc(db, COLLECTIONS_NAME, collectionId));
      return { success: true };
    } catch (error) {
      console.error('Delete collection error:', error);
      return { success: false, error: error.message };
    }
  },

  // Guruh va fanga asosan to'plamlarni olish (talabalar uchun)
  async getCollectionsByGroupAndSubject(groupId, subjectId) {
    try {
      const groupQuery = query(
        collection(db, COLLECTIONS_NAME),
        where('groupId', '==', groupId),
        where('subjectId', '==', subjectId)
      );

      // "Hamma uchun" (global) to'plamlar: groupId == null va subjectId mos bo'lganlar
      const globalQuery = query(
        collection(db, COLLECTIONS_NAME),
        where('groupId', '==', null),
        where('subjectId', '==', subjectId)
      );

      const [groupSnap, globalSnap] = await Promise.all([
        getDocs(groupQuery),
        getDocs(globalQuery)
      ]);

      const allDocs = [...groupSnap.docs, ...globalSnap.docs];

      // Dublikatlarni oldini olish uchun id bo'yicha unik qilish
      const seen = new Set();
      const collections = allDocs
        .filter(docItem => {
          if (seen.has(docItem.id)) return false;
          seen.add(docItem.id);
          return true;
        })
        .map(docItem => ({
          id: docItem.id,
          ...docItem.data()
        }))
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return bTime - aTime;
        });

      return { success: true, data: collections };
    } catch (error) {
      console.error('Get collections by group and subject error:', error);
      return { success: false, error: error.message };
    }
  },

  // Barcha to'plamlarni olish (admin uchun)
  async getAllCollections() {
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS_NAME));
      const collections = snapshot.docs
        .map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }))
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return bTime - aTime; // Yangi bo'yicha (eng yangi birinchi)
        });
      return { success: true, data: collections };
    } catch (error) {
      // Avoid noisy full stack logs in production; return structured error info
      console.warn('Get all collections error:', error?.code || error?.message || error);
      return { success: false, error: error.message || String(error), code: error.code };
    }
  }
};
