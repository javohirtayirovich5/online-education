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
import { notificationService } from './notificationService';

const COLLECTION_NAME = 'grades';

export const gradeService = {
  // Talabaning fandagi barcha baholarini olish
  async getGradesByStudentAndSubject(studentId, subjectId) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME), 
        where('studentId', '==', studentId),
        where('subjectId', '==', subjectId)
      );
      const snapshot = await getDocs(q);
      const grades = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // O'rtacha bahoni hisoblash
      const average = grades.length > 0 
        ? grades.reduce((sum, g) => sum + g.grade, 0) / grades.length 
        : 0;
      
      return { 
        success: true, 
        data: { grades, average: Math.round(average * 100) / 100 } 
      };
    } catch (error) {
      console.error('Get grades by student and subject error:', error);
      return { success: false, error: error.message };
    }
  },

  // Talabaning barcha baholarini olish
  async getGradesByStudent(studentId) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME), 
        where('studentId', '==', studentId)
      );
      const snapshot = await getDocs(q);
      const grades = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      
      return { success: true, data: grades };
    } catch (error) {
      console.error('Get grades by student error:', error);
      return { success: false, error: error.message };
    }
  },

  // Guruh va fan bo'yicha baholarni olish
  async getGradesByGroupAndSubject(groupId, subjectId) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME), 
        where('groupId', '==', groupId),
        where('subjectId', '==', subjectId)
      );
      const snapshot = await getDocs(q);
      const grades = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      
      return { success: true, data: grades };
    } catch (error) {
      console.error('Get grades by group and subject error:', error);
      return { success: false, error: error.message };
    }
  },

  // Fan bo'yicha baholarni olish (o'qituvchi uchun)
  async getGradesBySubject(subjectId) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME), 
        where('subjectId', '==', subjectId)
      );
      const snapshot = await getDocs(q);
      const grades = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      
      return { success: true, data: grades };
    } catch (error) {
      console.error('Get grades by subject error:', error);
      return { success: false, error: error.message };
    }
  },

  // O'qituvchi qo'ygan baholarni olish
  async getGradesByTeacher(teacherId) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME), 
        where('teacherId', '==', teacherId)
      );
      const snapshot = await getDocs(q);
      const grades = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      
      return { success: true, data: grades };
    } catch (error) {
      console.error('Get grades by teacher error:', error);
      return { success: false, error: error.message };
    }
  },

  // Yangi baho qo'shish
  async addGrade(gradeData) {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        studentId: gradeData.studentId,
        studentName: gradeData.studentName || '',
        groupId: gradeData.groupId,
        subjectId: gradeData.subjectId,
        subjectName: gradeData.subjectName || '',
        lessonType: gradeData.lessonType || '',
        teacherId: gradeData.teacherId,
        teacherName: gradeData.teacherName || '',
        grade: gradeData.grade, // 1-5
        date: gradeData.date || new Date().toISOString().split('T')[0],
        comment: gradeData.comment || '',
        lessonTopic: gradeData.lessonTopic || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Send notification to student
      try {
        await notificationService.createNotification({
          userId: gradeData.studentId,
          type: 'grade_posted',
          title: 'Yangi baho',
          message: `"${gradeData.subjectName}" fanni bo'yicha baho qo'yildi: ${gradeData.grade}/5`,
          relatedId: docRef.id,
          relatedType: 'grade'
        });
      } catch (notifError) {
        console.error('Error sending grade notification:', notifError);
      }

      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Add grade error:', error);
      return { success: false, error: error.message };
    }
  },

  // Yangi baho yaratish (addGrade aliasi)
  async createGrade(gradeData) {
    return this.addGrade(gradeData);
  },

  // Bir nechta baho qo'shish (bitta dars uchun)
  async addBulkGrades(gradesArray) {
    try {
      const results = [];
      for (const gradeData of gradesArray) {
        const result = await this.addGrade(gradeData);
        results.push(result);
      }
      return { success: true, data: results };
    } catch (error) {
      console.error('Add bulk grades error:', error);
      return { success: false, error: error.message };
    }
  },

  // Bahoni yangilash
  async updateGrade(gradeId, updates) {
    try {
      const docRef = doc(db, COLLECTION_NAME, gradeId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Update grade error:', error);
      return { success: false, error: error.message };
    }
  },

  // Bahoni o'chirish
  async deleteGrade(gradeId) {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, gradeId));
      return { success: true };
    } catch (error) {
      console.error('Delete grade error:', error);
      return { success: false, error: error.message };
    }
  },

  // Talabaning fandagi o'rtacha balosini olish
  async getStudentAverageBySubject(studentId, subjectId) {
    try {
      const result = await this.getGradesByStudentAndSubject(studentId, subjectId);
      if (!result.success) return result;
      
      return { success: true, data: result.data.average };
    } catch (error) {
      console.error('Get student average error:', error);
      return { success: false, error: error.message };
    }
  },

  // Talabaning umumiy o'rtacha balosini hisoblash (barcha fanlar bo'yicha)
  async getStudentOverallAverage(studentId) {
    try {
      const result = await this.getGradesByStudent(studentId);
      if (!result.success) return result;
      
      const grades = result.data;
      if (grades.length === 0) {
        return { success: true, data: 0 };
      }
      
      // Fanlar bo'yicha guruhlash va o'rtacha hisoblash
      const subjectGrades = {};
      grades.forEach(g => {
        if (!subjectGrades[g.subjectId]) {
          subjectGrades[g.subjectId] = [];
        }
        subjectGrades[g.subjectId].push(g.grade);
      });
      
      // Har bir fanning o'rtachasini hisoblash
      const subjectAverages = Object.values(subjectGrades).map(grades => {
        return grades.reduce((sum, g) => sum + g, 0) / grades.length;
      });
      
      // Umumiy o'rtacha
      const overallAverage = subjectAverages.reduce((sum, avg) => sum + avg, 0) / subjectAverages.length;
      
      return { success: true, data: Math.round(overallAverage * 100) / 100 };
    } catch (error) {
      console.error('Get student overall average error:', error);
      return { success: false, error: error.message };
    }
  },

  // Guruhning fan bo'yicha statistikasini olish
  async getGroupSubjectStats(groupId, subjectId) {
    try {
      const result = await this.getGradesByGroupAndSubject(groupId, subjectId);
      if (!result.success) return result;
      
      const grades = result.data;
      
      // Talabalar bo'yicha guruhlash
      const studentGrades = {};
      grades.forEach(g => {
        if (!studentGrades[g.studentId]) {
          studentGrades[g.studentId] = [];
        }
        studentGrades[g.studentId].push(g.grade);
      });
      
      // Har bir talabaning o'rtachasini hisoblash
      const studentAverages = Object.entries(studentGrades).map(([studentId, grades]) => ({
        studentId,
        average: Math.round((grades.reduce((sum, g) => sum + g, 0) / grades.length) * 100) / 100,
        gradesCount: grades.length
      }));
      
      // Guruh o'rtachasi
      const groupAverage = studentAverages.length > 0
        ? studentAverages.reduce((sum, s) => sum + s.average, 0) / studentAverages.length
        : 0;
      
      return { 
        success: true, 
        data: {
          groupAverage: Math.round(groupAverage * 100) / 100,
          studentAverages,
          totalGrades: grades.length
        }
      };
    } catch (error) {
      console.error('Get group subject stats error:', error);
      return { success: false, error: error.message };
    }
  }
};

