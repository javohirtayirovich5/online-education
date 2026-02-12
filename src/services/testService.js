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

      // Send notifications to students in the group(s)
      const targetGroupIds = Array.isArray(testData.groupIds) && testData.groupIds.length
        ? testData.groupIds
        : (testData.groupId ? [testData.groupId] : []);

      if (targetGroupIds.length) {
        try {
          const groupQuery = query(
            collection(db, 'groups'),
            where('id', 'in', targetGroupIds.slice(0, 10))
          );
          const groupSnapshot = await getDocs(groupQuery);
          
          const notifiedStudents = new Set();

          groupSnapshot.forEach(groupDoc => {
            const groupData = groupDoc.data();
            const studentIds = groupData.students || [];
            
            studentIds.forEach(studentId => {
              notifiedStudents.add(studentId);
            });
          });

          for (const studentId of notifiedStudents) {
            await notificationService.createNotification({
              userId: studentId,
              type: 'test_created',
              title: 'Yangi test',
              message: `"${testData.title}" testini topshirish uchun tayyorlaning`,
              relatedId: docRef.id,
              relatedType: 'test'
            });
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
        if (test.visibleFor === 'group') {
          if (test.groupId === studentGroupId) {
            return true;
          }
          if (Array.isArray(test.groupIds) && test.groupIds.includes(studentGroupId)) {
            return true;
          }
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

  // Calculate test score - each correct item = 1 point; wordbank: each blank = 1 point; matching: each pair = 1 point
  calculateScore(questions, studentAnswers) {
    let totalScore = 0;
    let maxScore = 0;

    questions.forEach((question, index) => {
      if (question.type === 'multiple') {
        maxScore += 1;
        if (studentAnswers[index] === question.correctAnswer) {
          totalScore += 1;
        }
      } else if (question.type === 'multiple_multiple') {
        maxScore += 1;
        const correctAnswers = question.correctAnswers || [];
        const studentAnswer = studentAnswers[index] || [];
        const studentAnswerArray = Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer];
        if (JSON.stringify(studentAnswerArray.sort()) === JSON.stringify(correctAnswers.sort())) {
          totalScore += 1;
        }
      } else if (question.type === 'text') {
        maxScore += 1;
        const studentAnswer = (studentAnswers[index] || '').trim().toLowerCase();
        const correctAnswer = (question.correctAnswer || '').trim().toLowerCase();
        if (studentAnswer === correctAnswer) {
          totalScore += 1;
        }
      } else if (question.type === 'truefalse') {
        maxScore += 1;
        const studentAns = studentAnswers[index];
        if (typeof studentAns === 'boolean' && studentAns === question.correctAnswer) {
          totalScore += 1;
        }
      } else if (question.type === 'wordbank') {
        const correctMap = question.correctAnswers || {};
        const studentMap = studentAnswers[index] || {};
        const blankIds = Object.keys(correctMap);
        maxScore += blankIds.length;
        blankIds.forEach(id => {
          if (studentMap[id] && studentMap[id] === correctMap[id]) totalScore += 1;
        });
      } else if (question.type === 'matching') {
        const pairs = question.pairs || [];
        maxScore += pairs.length;
        const studentAns = studentAnswers[index];
        // Check if it's the new format (matchedCount) or check if all pairs were matched
        if (typeof studentAns === 'object' && studentAns.matchedCount !== undefined) {
          totalScore += studentAns.matchedCount;
        } else if (typeof studentAns === 'object' && Array.isArray(studentAns.matchedPairs)) {
          // Legacy format if needed
          totalScore += studentAns.matchedPairs.length;
        }
      } else if (question.type === 'audio') {
        const subQuestions = question.subQuestions || [];
        const studentAns = studentAnswers[index];
        const subAnswers = (studentAns && typeof studentAns === 'object' && studentAns.subAnswers) ? studentAns.subAnswers : {};
        
        subQuestions.forEach((subQ, subIndex) => {
          const subAnswer = subAnswers[subIndex];
          
          if (subQ.type === 'multiple') {
            maxScore += 1;
            if (subAnswer === subQ.correctAnswer) {
              totalScore += 1;
            }
          } else if (subQ.type === 'text') {
            maxScore += 1;
            const studentAnswer = (subAnswer || '').trim().toLowerCase();
            const correctAnswer = (subQ.correctAnswer || '').trim().toLowerCase();
            if (studentAnswer === correctAnswer) {
              totalScore += 1;
            }
          } else if (subQ.type === 'truefalse') {
            maxScore += 1;
            if (typeof subAnswer === 'boolean' && subAnswer === subQ.correctAnswer) {
              totalScore += 1;
            }
          } else if (subQ.type === 'wordbank') {
            const correctMap = subQ.correctAnswers || {};
            const studentMap = subAnswer || {};
            const blankIds = Object.keys(correctMap);
            maxScore += blankIds.length;
            blankIds.forEach(id => {
              if (studentMap[id] && studentMap[id] === correctMap[id]) {
                totalScore += 1;
              }
            });
          } else if (subQ.type === 'matching') {
            const pairs = subQ.pairs || [];
            maxScore += pairs.length;
            // For matching, we need to check the matched pairs
            // This would require additional state tracking in the component
            // For now, we'll use a simple count if available
            if (typeof subAnswer === 'object' && subAnswer.matchedCount !== undefined) {
              totalScore += subAnswer.matchedCount;
            }
          }
        });
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
