import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc,
  deleteDoc,
  orderBy,
  increment
} from 'firebase/firestore';
import { db } from './firebase';
import { notificationService } from './notificationService';

const COLLECTION_NAME = 'assignments';
const SUBMISSIONS_COLLECTION = 'submissions';

const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

export const assignmentService = {
  // Create assignment
  async createAssignment(assignmentData) {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...assignmentData,
        createdAt: new Date().toISOString(),
        submissionCount: 0,
        ungradedCount: 0
      });

      // Send notifications to students in the group
      if (assignmentData.groupId) {
        try {
          const groupQuery = query(
            collection(db, 'groups'),
            where('id', '==', assignmentData.groupId)
          );
          const groupSnapshot = await getDocs(groupQuery);
          
          if (!groupSnapshot.empty) {
            const groupData = groupSnapshot.docs[0].data();
            const studentIds = groupData.students || [];
            
            // Create notification for each student
            for (const studentId of studentIds) {
              await notificationService.createNotification({
                userId: studentId,
                type: 'assignment_created',
                title: 'Yangi topshiriq',
                message: `"${assignmentData.title}" topshirig'i berildi. Muddati: ${assignmentData.dueDate || 'belgilanmagan'}`,
                relatedId: docRef.id,
                relatedType: 'assignment'
              });
            }
          }
        } catch (notifError) {
          console.error('Error sending notifications:', notifError);
        }
      }

      return { success: true, assignmentId: docRef.id };
    } catch (error) {
      console.error('Create assignment error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get all assignments
  async getAllAssignments() {
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const assignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return { success: true, data: assignments };
    } catch (error) {
      console.error('Get assignments error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get assignment by ID
  async getAssignmentById(assignmentId) {
    try {
      const docRef = doc(db, COLLECTION_NAME, assignmentId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
      }
      return { success: false, error: 'Assignment not found' };
    } catch (error) {
      console.error('Get assignment error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get assignments by teacher
  async getAssignmentsByTeacher(teacherId) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('createdBy', '==', teacherId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const assignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return { success: true, data: assignments };
    } catch (error) {
      console.error('Get teacher assignments error:', error);
      return { success: false, error: error.message };
    }
  },

  async getSubmissionsByAssignmentIds(assignmentIds) {
    try {
      if (!Array.isArray(assignmentIds) || assignmentIds.length === 0) {
        return { success: true, data: [] };
      }

      const chunks = chunkArray(assignmentIds, 10);
      const submissions = [];

      for (const chunk of chunks) {
        const q = query(
          collection(db, SUBMISSIONS_COLLECTION),
          where('assignmentId', 'in', chunk)
        );
        const snapshot = await getDocs(q);
        snapshot.docs.forEach(doc => submissions.push({ id: doc.id, ...doc.data() }));
      }

      submissions.sort((a, b) => {
        const dateA = new Date(a.submittedAt || 0);
        const dateB = new Date(b.submittedAt || 0);
        return dateB - dateA;
      });

      return { success: true, data: submissions };
    } catch (error) {
      console.error('Get submissions by assignment IDs error:', error);
      return { success: false, error: error.message };
    }
  },

  async getSubmissionsByStudent(studentId) {
    try {
      const q = query(
        collection(db, SUBMISSIONS_COLLECTION),
        where('studentId', '==', studentId)
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
      console.error('Get submissions by student error:', error);
      return { success: false, error: error.message };
    }
  },

  // Update assignment
  async updateAssignment(assignmentId, updates) {
    try {
      const docRef = doc(db, COLLECTION_NAME, assignmentId);
      await updateDoc(docRef, updates);
      return { success: true };
    } catch (error) {
      console.error('Update assignment error:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete assignment
  async deleteAssignment(assignmentId) {
    try {
      const docRef = doc(db, COLLECTION_NAME, assignmentId);
      await deleteDoc(docRef);
      return { success: true };
    } catch (error) {
      console.error('Delete assignment error:', error);
      return { success: false, error: error.message };
    }
  },

  // Create submission
  async createSubmission(submissionData) {
    try {
      const docRef = await addDoc(collection(db, SUBMISSIONS_COLLECTION), {
        ...submissionData,
        submittedAt: new Date().toISOString(),
        grade: null,
        gradedAt: null,
        gradedBy: null
      });

      // Increment submission counters on assignment document
      if (submissionData.assignmentId) {
        try {
          const assignmentRef = doc(db, COLLECTION_NAME, submissionData.assignmentId);
          await updateDoc(assignmentRef, {
            submissionCount: increment(1),
            ungradedCount: increment(1)
          });
        } catch (updateError) {
          console.error('Error updating assignment counters after submission:', updateError);
        }
      }

      return { success: true, submissionId: docRef.id };
    } catch (error) {
      console.error('Create submission error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get submissions by assignment
  async getSubmissionsByAssignment(assignmentId) {
    try {
      const q = query(
        collection(db, SUBMISSIONS_COLLECTION),
        where('assignmentId', '==', assignmentId)
      );
      const snapshot = await getDocs(q);
      const submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Client-side sorting
      submissions.sort((a, b) => {
        const dateA = new Date(a.submittedAt || 0);
        const dateB = new Date(b.submittedAt || 0);
        return dateB - dateA; // Descending order
      });
      return { success: true, data: submissions };
    } catch (error) {
      console.error('Get submissions error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get submission by student and assignment
  async getSubmissionByStudentAndAssignment(studentId, assignmentId) {
    try {
      const q = query(
        collection(db, SUBMISSIONS_COLLECTION),
        where('studentId', '==', studentId),
        where('assignmentId', '==', assignmentId)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return { success: false, error: 'Submission not found' };
      }
      const submission = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      return { success: true, data: submission };
    } catch (error) {
      console.error('Get submission error:', error);
      return { success: false, error: error.message };
    }
  },

  // Update submission (for grading)
  async updateSubmission(submissionId, updates) {
    try {
      const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
      
      // Get submission data to send notification
      const submissionDoc = await getDoc(docRef);
      const submissionData = submissionDoc.data();

      const updatePayload = { ...updates };
      if (updates.grade !== undefined) {
        updatePayload.gradedAt = new Date().toISOString();
      }
      await updateDoc(docRef, updatePayload);

      // Update assignment counters if grade status changed
      if (submissionData?.assignmentId && updates.grade !== undefined) {
        try {
          const assignmentRef = doc(db, COLLECTION_NAME, submissionData.assignmentId);
          let assignmentUpdates = {};

          const oldWasUngraded = submissionData.grade === null || submissionData.grade === undefined;
          const newIsUngraded = updates.grade === null || updates.grade === undefined;

          if (oldWasUngraded && !newIsUngraded) {
            assignmentUpdates.ungradedCount = increment(-1);
          } else if (!oldWasUngraded && newIsUngraded) {
            assignmentUpdates.ungradedCount = increment(1);
          }

          if (Object.keys(assignmentUpdates).length > 0) {
            await updateDoc(assignmentRef, assignmentUpdates);
          }
        } catch (updateError) {
          console.error('Error updating assignment counters after grading:', updateError);
        }
      }

      // Send notification to student if grade is given
      if (updates.grade !== undefined && submissionData?.studentId) {
        try {
          await notificationService.createNotification({
            userId: submissionData.studentId,
            type: 'assignment_graded',
            title: 'Topshiriq baholandi',
            message: `Sizning topshirig'ingiz baholandi. Baho: ${updates.grade}/${updates.maxGrade || 100}`,
            relatedId: submissionData.assignmentId,
            relatedType: 'assignment'
          });
        } catch (notifError) {
          console.error('Error sending grading notification:', notifError);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Update submission error:', error);
      return { success: false, error: error.message };
    }
  }
};
