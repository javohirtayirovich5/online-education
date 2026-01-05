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
  setDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION_NAME = 'attendance';

export const attendanceService = {
  // Guruh, sana, fan va shart bo'yicha davomat olish
  async getAttendanceByGroupAndDate(groupId, date, subjectId = null, lessonType = null) {
    try {
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Asosiy filter: groupId va date
      const conditions = [
        where('groupId', '==', groupId),
        where('date', '==', dateStr)
      ];
      
      // Agar subjectId berilsa, uni ham qo'shish
      if (subjectId) {
        conditions.push(where('subjectId', '==', subjectId));
      }
      
      // Agar lessonType berilsa, uni ham qo'shish
      if (lessonType) {
        conditions.push(where('lessonType', '==', lessonType));
      }
      
      const q = query(collection(db, COLLECTION_NAME), ...conditions);
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return { success: true, data: null };
      }
      
      const attendance = snapshot.docs[0];
      return { success: true, data: { id: attendance.id, ...attendance.data() } };
    } catch (error) {
      console.error('Get attendance error:', error);
      return { success: false, error: error.message };
    }
  },

  // Guruh bo'yicha barcha davomatni olish
  async getAttendanceByGroup(groupId) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME), 
        where('groupId', '==', groupId)
      );
      const snapshot = await getDocs(q);
      const attendance = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      return { success: true, data: attendance };
    } catch (error) {
      console.error('Get attendance by group error:', error);
      return { success: false, error: error.message };
    }
  },

  // Talaba bo'yicha davomatni olish
  async getAttendanceByStudent(studentId, groupId = null) {
    try {
      let q;
      if (groupId) {
        q = query(
          collection(db, COLLECTION_NAME), 
          where('groupId', '==', groupId)
        );
      } else {
        q = query(collection(db, COLLECTION_NAME));
      }
      
      const snapshot = await getDocs(q);
      const attendance = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(a => a.records && a.records[studentId])
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      
      return { success: true, data: attendance };
    } catch (error) {
      console.error('Get attendance by student error:', error);
      return { success: false, error: error.message };
    }
  },

  // O'qituvchi bo'yicha davomatni olish
  async getAttendanceByTeacher(teacherId) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME), 
        where('teacherId', '==', teacherId)
      );
      const snapshot = await getDocs(q);
      const attendance = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      return { success: true, data: attendance };
    } catch (error) {
      console.error('Get attendance by teacher error:', error);
      return { success: false, error: error.message };
    }
  },

  // Davomat yaratish yoki yangilash
  async saveAttendance(groupId, date, records, teacherId, subjectId = null, lessonType = null) {
    try {
      const dateStr = date.toISOString().split('T')[0];
      
      // Mavjud davomatni tekshirish (aniq fan va lessonType bo'yicha)
      const existingResult = await this.getAttendanceByGroupAndDate(groupId, date, subjectId, lessonType);
      
      if (existingResult.success && existingResult.data) {
        // Mavjud davomatni yangilash (subjectId va lessonType-ni ham saqlaymiz)
        const docRef = doc(db, COLLECTION_NAME, existingResult.data.id);
        await updateDoc(docRef, {
          records,
          subjectId,
          lessonType,
          updatedAt: serverTimestamp(),
          updatedBy: teacherId
        });
        return { success: true, id: existingResult.data.id, updated: true };
      } else {
        // Yangi davomat yaratish
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
          groupId,
          subjectId,
          teacherId,
          lessonType,
          date: dateStr,
          records, // { [studentId]: missedHours }
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        return { success: true, id: docRef.id, updated: false };
      }
    } catch (error) {
      console.error('Save attendance error:', error);
      return { success: false, error: error.message };
    }
  },

  // Talaba uchun kunlik davomat qo'shish
  async setStudentAttendance(groupId, date, studentId, missedHours, teacherId, subjectId = null, lessonType = null) {
    try {
      const dateStr = date.toISOString().split('T')[0];
      const existingResult = await this.getAttendanceByGroupAndDate(groupId, date, subjectId, lessonType);
      
      if (existingResult.success && existingResult.data) {
        // Mavjud davomatni yangilash
        const docRef = doc(db, COLLECTION_NAME, existingResult.data.id);
        const records = { ...existingResult.data.records };
        
        if (missedHours === 0 || missedHours === null) {
          delete records[studentId];
        } else {
          records[studentId] = missedHours;
        }
        
        await updateDoc(docRef, {
          records,
          subjectId,
          lessonType,
          updatedAt: serverTimestamp(),
          updatedBy: teacherId
        });
        return { success: true };
      } else {
        // Yangi davomat yaratish
        const records = {};
        if (missedHours > 0) {
          records[studentId] = missedHours;
        }
        
        await addDoc(collection(db, COLLECTION_NAME), {
          groupId,
          subjectId,
          teacherId,
          lessonType,
          date: dateStr,
          records,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        return { success: true };
      }
    } catch (error) {
      console.error('Set student attendance error:', error);
      return { success: false, error: error.message };
    }
  },

  // Davomatni o'chirish
  async deleteAttendance(attendanceId) {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, attendanceId));
      return { success: true };
    } catch (error) {
      console.error('Delete attendance error:', error);
      return { success: false, error: error.message };
    }
  },

  // Talabaning umumiy qoldirgan soatlarini hisoblash
  async getStudentTotalMissedHours(studentId, groupId = null, startDate = null, endDate = null) {
    try {
      const result = await this.getAttendanceByStudent(studentId, groupId);
      
      if (!result.success) return result;
      
      let attendance = result.data;
      
      // Sanalar bo'yicha filter
      if (startDate) {
        attendance = attendance.filter(a => new Date(a.date) >= startDate);
      }
      if (endDate) {
        attendance = attendance.filter(a => new Date(a.date) <= endDate);
      }
      
      // Umumiy qoldirgan soatlarni hisoblash
      const totalMissedHours = attendance.reduce((total, a) => {
        return total + (a.records[studentId] || 0);
      }, 0);
      
      return { 
        success: true, 
        data: {
          totalMissedHours,
          daysCount: attendance.length,
          records: attendance
        }
      };
    } catch (error) {
      console.error('Get student total missed hours error:', error);
      return { success: false, error: error.message };
    }
  },

  // Guruh statistikasi
  async getGroupAttendanceStats(groupId, startDate = null, endDate = null) {
    try {
      const result = await this.getAttendanceByGroup(groupId);
      
      if (!result.success) return result;
      
      let attendance = result.data;
      
      // Sanalar bo'yicha filter
      if (startDate) {
        attendance = attendance.filter(a => new Date(a.date) >= startDate);
      }
      if (endDate) {
        attendance = attendance.filter(a => new Date(a.date) <= endDate);
      }
      
      // Har bir talabaning umumiy qoldirgan soatlarini hisoblash
      const studentStats = {};
      
      attendance.forEach(a => {
        Object.entries(a.records || {}).forEach(([studentId, hours]) => {
          if (!studentStats[studentId]) {
            studentStats[studentId] = { totalMissedHours: 0, missedDays: 0 };
          }
          studentStats[studentId].totalMissedHours += hours;
          studentStats[studentId].missedDays += 1;
        });
      });
      
      return { 
        success: true, 
        data: {
          totalDays: attendance.length,
          studentStats
        }
      };
    } catch (error) {
      console.error('Get group attendance stats error:', error);
      return { success: false, error: error.message };
    }
  }
};

