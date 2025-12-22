import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION_NAME = 'groups';

export const groupService = {
  // Barcha guruhlarni olish
  async getAllGroups() {
    try {
      const snapshot = await getDocs(collection(db, COLLECTION_NAME));
      const groups = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return { success: true, data: groups };
    } catch (error) {
      console.error('Get groups error:', error);
      return { success: false, error: error.message };
    }
  },

  // Fakultet bo'yicha guruhlarni olish
  async getGroupsByFaculty(facultyId) {
    try {
      const snapshot = await getDocs(collection(db, COLLECTION_NAME));
      const groups = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(g => g.facultyId === facultyId && g.isActive !== false)
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      return { success: true, data: groups };
    } catch (error) {
      console.error('Get groups by faculty error:', error);
      return { success: false, error: error.message };
    }
  },

  // Yo'nalish bo'yicha guruhlarni olish
  async getGroupsByDepartment(departmentId) {
    try {
      const snapshot = await getDocs(collection(db, COLLECTION_NAME));
      const groups = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(g => g.departmentId === departmentId && g.isActive !== false)
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      return { success: true, data: groups };
    } catch (error) {
      console.error('Get groups by department error:', error);
      return { success: false, error: error.message };
    }
  },

  // O'qituvchiga biriktirilgan guruhlarni olish
  async getGroupsByTeacher(teacherId) {
    try {
      // Barcha guruhlarni olib, teacherIds dan filter qilish
      // (composite index muammosini hal qilish uchun)
      const snapshot = await getDocs(collection(db, COLLECTION_NAME));
      const groups = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(g => 
          g.isActive !== false && 
          (g.teacherIds || []).includes(teacherId)
        )
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      return { success: true, data: groups };
    } catch (error) {
      console.error('Get groups by teacher error:', error);
      return { success: false, error: error.message };
    }
  },

  // Aktiv guruhlarni olish
  async getActiveGroups() {
    try {
      const snapshot = await getDocs(collection(db, COLLECTION_NAME));
      const groups = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(g => g.isActive !== false)
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      return { success: true, data: groups };
    } catch (error) {
      console.error('Get active groups error:', error);
      return { success: false, error: error.message };
    }
  },

  // Bitta guruhni olish
  async getGroupById(groupId) {
    try {
      const docRef = doc(db, COLLECTION_NAME, groupId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
      }
      return { success: false, error: 'Guruh topilmadi' };
    } catch (error) {
      console.error('Get group error:', error);
      return { success: false, error: error.message };
    }
  },

  // Yangi guruh yaratish
  async createGroup(groupData) {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...groupData,
        students: [],
        teacherIds: groupData.teacherIds || [],
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Create group error:', error);
      return { success: false, error: error.message };
    }
  },

  // Guruhni yangilash
  async updateGroup(groupId, updates) {
    try {
      const docRef = doc(db, COLLECTION_NAME, groupId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Update group error:', error);
      return { success: false, error: error.message };
    }
  },

  // Guruhga talaba qo'shish
  async addStudentToGroup(groupId, studentId) {
    try {
      const docRef = doc(db, COLLECTION_NAME, groupId);
      // Faqat students arrayni yangilash (Firebase rules shunga ruxsat beradi)
      await updateDoc(docRef, {
        students: arrayUnion(studentId)
      });
      return { success: true };
    } catch (error) {
      console.error('Add student to group error:', error);
      return { success: false, error: error.message };
    }
  },

  // Guruhdan talabani olib tashlash
  async removeStudentFromGroup(groupId, studentId) {
    try {
      const docRef = doc(db, COLLECTION_NAME, groupId);
      await updateDoc(docRef, {
        students: arrayRemove(studentId),
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Remove student from group error:', error);
      return { success: false, error: error.message };
    }
  },

  // Guruhga o'qituvchi biriktirish
  async addTeacherToGroup(groupId, teacherId) {
    try {
      const docRef = doc(db, COLLECTION_NAME, groupId);
      await updateDoc(docRef, {
        teacherIds: arrayUnion(teacherId),
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Add teacher to group error:', error);
      return { success: false, error: error.message };
    }
  },

  // Guruhdan o'qituvchini olib tashlash
  async removeTeacherFromGroup(groupId, teacherId) {
    try {
      const docRef = doc(db, COLLECTION_NAME, groupId);
      await updateDoc(docRef, {
        teacherIds: arrayRemove(teacherId),
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Remove teacher from group error:', error);
      return { success: false, error: error.message };
    }
  },

  // Guruhni o'chirish
  async deleteGroup(groupId) {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, groupId));
      return { success: true };
    } catch (error) {
      console.error('Delete group error:', error);
      return { success: false, error: error.message };
    }
  },

  // Guruh talabalarini olish (user ma'lumotlari bilan)
  async getGroupStudents(groupId) {
    try {
      const groupResult = await this.getGroupById(groupId);
      if (!groupResult.success) return groupResult;
      
      const studentIds = groupResult.data.students || [];
      if (studentIds.length === 0) {
        return { success: true, data: [] };
      }
      
      // Talabalar ma'lumotlarini olish
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const students = usersSnapshot.docs
        .filter(doc => studentIds.includes(doc.id))
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName));
      
      return { success: true, data: students };
    } catch (error) {
      console.error('Get group students error:', error);
      return { success: false, error: error.message };
    }
  },

  // Guruhga fan va o'qituvchi biriktirish
  async assignSubjectTeacher(groupId, subjectData) {
    try {
      const groupResult = await this.getGroupById(groupId);
      if (!groupResult.success) return groupResult;
      
      const subjectTeachers = groupResult.data.subjectTeachers || [];
      
      // Bir fanning turli turlari uchun turli o'qituvchilar bo'lishi mumkin
      // Shuning uchun subjectId, lessonType va teacherId kombinatsiyasi bo'yicha tekshiramiz
      const existingIndex = subjectTeachers.findIndex(
        st => st.subjectId === subjectData.subjectId && 
              st.lessonType === subjectData.lessonType &&
              st.teacherId === subjectData.teacherId
      );
      
      if (existingIndex !== -1) {
        // Mavjud birikmani yangilash
        subjectTeachers[existingIndex] = {
          ...subjectData,
          scheduleDays: subjectData.scheduleDays || []
        };
      } else {
        // Yangi birikma qo'shish
        subjectTeachers.push({
          ...subjectData,
          scheduleDays: subjectData.scheduleDays || []
        });
      }
      
      const docRef = doc(db, COLLECTION_NAME, groupId);
      await updateDoc(docRef, {
        subjectTeachers,
        teacherIds: arrayUnion(subjectData.teacherId),
        updatedAt: serverTimestamp()
      });
      
      // O'qituvchining assignedGroups arrayini yangilash
      const userRef = doc(db, 'users', subjectData.teacherId);
      await updateDoc(userRef, {
        assignedGroups: arrayUnion({
          groupId,
          groupName: groupResult.data.name,
          subjectId: subjectData.subjectId,
          subjectName: subjectData.subjectName,
          lessonType: subjectData.lessonType,
          location: subjectData.location,
          scheduleDays: subjectData.scheduleDays || []
        })
      });
      
      return { success: true };
    } catch (error) {
      console.error('Assign subject teacher error:', error);
      return { success: false, error: error.message };
    }
  },

  // Guruhdan fan-o'qituvchi birikmasini olib tashlash
  async removeSubjectTeacher(groupId, subjectId, teacherId, lessonType) {
    try {
      const groupResult = await this.getGroupById(groupId);
      if (!groupResult.success) return groupResult;
      
      // Bir fanning turli turlari uchun turli o'qituvchilar bo'lishi mumkin
      // Shuning uchun subjectId, lessonType va teacherId kombinatsiyasi bo'yicha filtrlash
      const subjectTeachers = (groupResult.data.subjectTeachers || [])
        .filter(st => !(
          st.subjectId === subjectId && 
          st.teacherId === teacherId &&
          st.lessonType === lessonType
        ));
      
      // Agar bu o'qituvchining boshqa fanlari yo'q bo'lsa, teacherIds dan ham olib tashlash
      const teacherStillAssigned = subjectTeachers.some(st => st.teacherId === teacherId);
      
      const updates = {
        subjectTeachers,
        updatedAt: serverTimestamp()
      };
      
      if (!teacherStillAssigned) {
        updates.teacherIds = arrayRemove(teacherId);
      }
      
      const docRef = doc(db, COLLECTION_NAME, groupId);
      await updateDoc(docRef, updates);
      
      // O'qituvchining assignedGroups dan olib tashlash
      const userRef = doc(db, 'users', teacherId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const assignedGroups = (userSnap.data().assignedGroups || [])
          .filter(ag => !(ag.groupId === groupId && ag.subjectId === subjectId));
        await updateDoc(userRef, { assignedGroups });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Remove subject teacher error:', error);
      return { success: false, error: error.message };
    }
  },

  // Fan bo'yicha o'qituvchilarni olish (shu fanni o'qitadigan barcha o'qituvchilar)
  async getTeachersBySubject(subjectId) {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const teachers = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => {
          if (u.role !== 'teacher') return false;
          // isApproved tekshirish - false bo'lmasa yoki undefined bo'lsa ruxsat
          if (u.isApproved === false) return false;
          
          // subjectIds array dan tekshirish (yangi format)
          const hasInSubjectIds = (u.subjectIds || []).includes(subjectId);
          
          // Eski format bilan ham mos kelishi uchun (backward compatibility)
          const hasSubjectId = u.subjectId === subjectId;
          const hasInAssignedSubjects = (u.assignedSubjects || []).includes(subjectId);
          
          return hasInSubjectIds || hasSubjectId || hasInAssignedSubjects;
        })
        .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
      return { success: true, data: teachers };
    } catch (error) {
      console.error('Get teachers by subject error:', error);
      return { success: false, error: error.message };
    }
  }
};

