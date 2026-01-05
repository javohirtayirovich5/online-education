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
import { storageService } from './storageService';

const COLLECTION_NAME = 'resources';

export const resourceService = {
  // Guruh va fan bo'yicha resurslarni olish
  async getResourcesByGroupAndSubject(groupId, subjectId) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('groupId', '==', groupId),
        where('subjectId', '==', subjectId)
      );
      const snapshot = await getDocs(q);
      const resources = snapshot.docs
        .map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }))
        .sort((a, b) => {
          // Client-side sorting by createdAt (ascending) - oldest first
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return aTime - bTime;
        });
      return { success: true, data: resources };
    } catch (error) {
      console.error('Get resources error:', error);
      return { success: false, error: error.message };
    }
  },

  // Talabaning guruhidagi barcha resurslarni olish
  async getResourcesByGroup(groupId) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('groupId', '==', groupId)
      );
      const snapshot = await getDocs(q);
      const resources = snapshot.docs
        .map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }))
        .sort((a, b) => {
          // Client-side sorting by createdAt (ascending) - oldest first
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return aTime - bTime;
        });
      return { success: true, data: resources };
    } catch (error) {
      console.error('Get resources by group error:', error);
      return { success: false, error: error.message };
    }
  },

  // O'qituvchi qo'shgan resurslarni olish
  async getResourcesByTeacher(teacherId) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('teacherId', '==', teacherId)
      );
      const snapshot = await getDocs(q);
      const resources = snapshot.docs
        .map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }))
        .sort((a, b) => {
          // Client-side sorting by createdAt (ascending) - oldest first
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return aTime - bTime;
        });
      return { success: true, data: resources };
    } catch (error) {
      console.error('Get resources by teacher error:', error);
      return { success: false, error: error.message };
    }
  },

  // Bitta resursni olish
  async getResourceById(resourceId) {
    try {
      const docRef = doc(db, COLLECTION_NAME, resourceId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
      }
      return { success: false, error: 'Resurs topilmadi' };
    } catch (error) {
      console.error('Get resource error:', error);
      return { success: false, error: error.message };
    }
  },

  // Yangi resurs qo'shish
  async addResource(resourceData, file, onProgress) {
    try {
      let fileUrl = '';
      
      // Fayl yuklash
      if (file) {
        const fileName = file.name;
        const filePath = `resources/${resourceData.groupId}/${resourceData.subjectId}/${Date.now()}_${fileName}`;
        const uploadResult = await storageService.uploadFile(file, filePath, onProgress);
        
        if (!uploadResult.success) {
          return { success: false, error: uploadResult.error || 'Fayl yuklashda xatolik' };
        }
        
        fileUrl = uploadResult.url;
      }

      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        groupId: resourceData.groupId,
        groupName: resourceData.groupName || '',
        subjectId: resourceData.subjectId,
        subjectName: resourceData.subjectName || '',
        teacherId: resourceData.teacherId,
        teacherName: resourceData.teacherName || '',
        title: resourceData.title,
        lessonType: resourceData.lessonType || 'ma\'ruza',
        fileUrl: fileUrl,
        fileName: file ? file.name : '',
        fileSize: file ? file.size : 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Add resource error:', error);
      return { success: false, error: error.message };
    }
  },

  // Resursni yangilash
  async updateResource(resourceId, updates, file, onProgress) {
    try {
      const updateData = { ...updates, updatedAt: serverTimestamp() };
      
      // Agar yangi fayl yuklansa
      if (file) {
        const fileName = file.name;
        const resource = await this.getResourceById(resourceId);
        
        if (resource.success) {
          const filePath = `resources/${resource.data.groupId}/${resource.data.subjectId}/${Date.now()}_${fileName}`;
          const uploadResult = await storageService.uploadFile(file, filePath, onProgress);
          
          if (!uploadResult.success) {
            return { success: false, error: uploadResult.error || 'Fayl yuklashda xatolik' };
          }
          
          updateData.fileUrl = uploadResult.url;
          updateData.fileName = file.name;
          updateData.fileSize = file.size;
        }
      }
      
      const docRef = doc(db, COLLECTION_NAME, resourceId);
      await updateDoc(docRef, updateData);
      return { success: true };
    } catch (error) {
      console.error('Update resource error:', error);
      return { success: false, error: error.message };
    }
  },

  // Resursni o'chirish
  async deleteResource(resourceId) {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, resourceId));
      return { success: true };
    } catch (error) {
      console.error('Delete resource error:', error);
      return { success: false, error: error.message };
    }
  }
};

