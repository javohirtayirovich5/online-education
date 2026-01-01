import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  getDoc,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';
import { notificationService } from './notificationService';

const TESTS_COLLECTION = 'tests';
const ANSWERS_COLLECTION = 'testAnswers';

export const testService = {
  // Create test
  async createTest(testData) {
    try {
      const docRef = await addDoc(collection(db, TESTS_COLLECTION), {
        ...testData,
        createdAt: new Date().toISOString(),
        status: 'active'
      });

      // Send notifications to students in the group
      if (testData.groupId) {
        try {
          const groupQuery = query(
            collection(db, 'groups'),
            where('id', '==', testData.groupId)
          );
          const groupSnapshot = await getDocs(groupQuery);
          
          if (!groupSnapshot.empty) {
            const groupData = groupSnapshot.docs[0].data();
            const studentIds = groupData.students || [];
            
            // Create notification for each student
            for (const studentId of studentIds) {
              await notificationService.createNotification({
                userId: studentId,
                type: 'test_created',
                title: 'Yangi test',
                message: `"${testData.title}" testini topshirish uchun tayyorlaning`,
                relatedId: docRef.id,
                relatedType: 'test'
              });
            }
          }
        } catch (notifError) {
          console.error('Error sending notifications:', notifError);
          // Don't fail the main operation if notifications fail
        }
      }

      return { success: true, testId: docRef.id };
    } catch (error) {
      console.error('Create test error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get all tests
  async getAllTests() {
    try {
      const q = query(collection(db, TESTS_COLLECTION));
      const snapshot = await getDocs(q);
      const tests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      tests.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      return { success: true, data: tests };
    } catch (error) {
      console.error('Get tests error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get test by ID
  async getTestById(testId) {
    try {
      const docRef = doc(db, TESTS_COLLECTION, testId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
      }
      return { success: false, error: 'Test not found' };
    } catch (error) {
      console.error('Get test error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get tests by teacher
  async getTestsByTeacher(teacherId) {
    try {
      const q = query(
        collection(db, TESTS_COLLECTION),
        where('createdBy', '==', teacherId)
      );
      const snapshot = await getDocs(q);
      const tests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      tests.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      return { success: true, data: tests };
    } catch (error) {
      console.error('Get teacher tests error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get tests for student (based on their group or available for all)
  async getTestsForStudent(studentGroupId) {
    try {
      const q = query(
        collection(db, TESTS_COLLECTION),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(q);
      const allTests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter tests that are either for all groups or for student's group
      const availableTests = allTests.filter(test => {
        if (test.visibleFor === 'all') {
          return true;
        }
        if (test.visibleFor === 'group' && test.groupId === studentGroupId) {
          return true;
        }
        return false;
      });

      availableTests.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      
      return { success: true, data: availableTests };
    } catch (error) {
      console.error('Get student tests error:', error);
      return { success: false, error: error.message };
    }
  },

  // Update test
  async updateTest(testId, updates) {
    try {
      const docRef = doc(db, TESTS_COLLECTION, testId);
      await updateDoc(docRef, updates);
      return { success: true };
    } catch (error) {
      console.error('Update test error:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete test
  async deleteTest(testId) {
    try {
      // Delete all answers related to this test
      const answersQ = query(
        collection(db, ANSWERS_COLLECTION),
        where('testId', '==', testId)
      );
      const answersSnapshot = await getDocs(answersQ);
      
      for (const answerDoc of answersSnapshot.docs) {
        await deleteDoc(doc(db, ANSWERS_COLLECTION, answerDoc.id));
      }

      // Delete test
      await deleteDoc(doc(db, TESTS_COLLECTION, testId));
      return { success: true };
    } catch (error) {
      console.error('Delete test error:', error);
      return { success: false, error: error.message };
    }
  },

  // Save student answers
  async saveAnswers(answersData) {
    try {
      const docRef = await addDoc(collection(db, ANSWERS_COLLECTION), {
        ...answersData,
        submittedAt: new Date().toISOString()
      });
      return { success: true, answerId: docRef.id };
    } catch (error) {
      console.error('Save answers error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get student test submission
  async getStudentTestSubmission(studentId, testId) {
    try {
      const q = query(
        collection(db, ANSWERS_COLLECTION),
        where('studentId', '==', studentId),
        where('testId', '==', testId)
      );
      const snapshot = await getDocs(q);
      if (snapshot.docs.length > 0) {
        const doc = snapshot.docs[0];
        return { success: true, data: { id: doc.id, ...doc.data() } };
      }
      return { success: false, error: 'No submission found' };
    } catch (error) {
      console.error('Get student submission error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get all submissions for a test
  async getTestSubmissions(testId) {
    try {
      const q = query(
        collection(db, ANSWERS_COLLECTION),
        where('testId', '==', testId)
      );
      const snapshot = await getDocs(q);
      const submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      submissions.sort((a, b) => {
        const dateA = new Date(a.submittedAt || 0);
        const dateB = new Date(b.submittedAt || 0);
        return dateB - dateA;
      });
      return { success: true, data: submissions };
    } catch (error) {
      console.error('Get test submissions error:', error);
      return { success: false, error: error.message };
    }
  },

  // Calculate test score - har bir to'g'ri javob = 1 ball
  calculateScore(questions, studentAnswers) {
    let totalScore = 0;
    const maxScore = questions.length; // Har bir savol uchun 1 ball

    questions.forEach((question, index) => {
      if (question.type === 'multiple') {
        if (studentAnswers[index] === question.correctAnswer) {
          totalScore += 1; // 1 ball to'g'ri javobga
        }
      } else if (question.type === 'multiple_multiple') {
        const correctAnswers = question.correctAnswers || [];
        const studentAnswer = studentAnswers[index] || [];
        const studentAnswerArray = Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer];
        
        if (JSON.stringify(studentAnswerArray.sort()) === JSON.stringify(correctAnswers.sort())) {
          totalScore += 1; // 1 ball to'g'ri javobga
        }
      } else if (question.type === 'text') {
        // Matnli savol javobini tekshirish - case insensitive va trim
        const studentAnswer = (studentAnswers[index] || '').trim().toLowerCase();
        const correctAnswer = (question.correctAnswer || '').trim().toLowerCase();
        
        if (studentAnswer === correctAnswer) {
          totalScore += 1; // 1 ball to'g'ri javobga
        }
      }
    });

    return { score: totalScore, maxScore };
  },

  // Update student answer score
  async updateSubmissionScore(submissionId, score) {
    try {
      const docRef = doc(db, ANSWERS_COLLECTION, submissionId);
      await updateDoc(docRef, {
        score: score,
        isGraded: true,
        gradedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      console.error('Update submission score error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get test results for a group
  async getGroupTestResults(testId, groupId) {
    try {
      const q = query(
        collection(db, ANSWERS_COLLECTION),
        where('testId', '==', testId),
        where('groupId', '==', groupId)
      );
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      results.sort((a, b) => (b.score || 0) - (a.score || 0));
      return { success: true, data: results };
    } catch (error) {
      console.error('Get group test results error:', error);
      return { success: false, error: error.message };
    }
  }
};
