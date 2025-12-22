import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION_NAME = 'assignments';
const SUBMISSIONS_COLLECTION = 'submissions';

export const assignmentService = {
  // Create assignment
  async createAssignment(assignmentData) {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...assignmentData,
        createdAt: new Date().toISOString()
      });
      return { success: true, assignmentId: docRef.id };
    } catch (error) {
      console.error('Create assignment error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get all assignments
  async getAllAssignments() {
    try {
      const q = query(collection(db, COLLECTION_NAME));
      const snapshot = await getDocs(q);
      const assignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Client-side sorting
      assignments.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA; // Descending order
      });
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
        where('createdBy', '==', teacherId)
      );
      const snapshot = await getDocs(q);
      const assignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Client-side sorting
      assignments.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA; // Descending order
      });
      return { success: true, data: assignments };
    } catch (error) {
      console.error('Get teacher assignments error:', error);
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
      await updateDoc(docRef, {
        ...updates,
        gradedAt: updates.grade !== undefined ? new Date().toISOString() : undefined
      });
      return { success: true };
    } catch (error) {
      console.error('Update submission error:', error);
      return { success: false, error: error.message };
    }
  }
};
