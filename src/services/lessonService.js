import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  addDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from './firebase';

export const lessonService = {
  // Create new lesson
  async createLesson(lessonData) {
    try {
      const lessonRef = doc(collection(db, 'lessons'));
      await setDoc(lessonRef, {
        ...lessonData,
        lessonId: lessonRef.id,
        resources: [],
        commentsCount: 0,
        viewsCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return { success: true, lessonId: lessonRef.id };
    } catch (error) {
      console.error('Create lesson error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get lesson by ID
  async getLesson(lessonId) {
    try {
      const docSnap = await getDoc(doc(db, 'lessons', lessonId));
      if (docSnap.exists()) {
        return { success: true, data: docSnap.data() };
      }
      return { success: false, error: 'Lesson not found' };
    } catch (error) {
      console.error('Get lesson error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get all lessons (no index required)
  async getAllLessons() {
    try {
      const querySnapshot = await getDocs(collection(db, 'lessons'));
      const lessons = [];
      querySnapshot.forEach((doc) => {
        lessons.push({ id: doc.id, ...doc.data() });
      });
      // Sort by createdAt in JavaScript (no index needed)
      lessons.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return { success: true, data: lessons };
    } catch (error) {
      console.error('Get all lessons error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get lessons by teacher (no index required)
  async getLessonsByTeacher(teacherId) {
    try {
      // Simple where query without orderBy - no index needed
      const q = query(
        collection(db, 'lessons'),
        where('teacherId', '==', teacherId)
      );
      const querySnapshot = await getDocs(q);
      const lessons = [];
      querySnapshot.forEach((doc) => {
        lessons.push({ id: doc.id, ...doc.data() });
      });
      // Sort in JavaScript instead of Firestore
      lessons.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return { success: true, data: lessons };
    } catch (error) {
      console.error('Get teacher lessons error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get lessons by subject (no index required)
  async getLessonsBySubject(subject) {
    try {
      const q = query(
        collection(db, 'lessons'),
        where('subject', '==', subject)
      );
      const querySnapshot = await getDocs(q);
      const lessons = [];
      querySnapshot.forEach((doc) => {
        lessons.push({ id: doc.id, ...doc.data() });
      });
      // Sort in JavaScript
      lessons.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return { success: true, data: lessons };
    } catch (error) {
      console.error('Get subject lessons error:', error);
      return { success: false, error: error.message };
    }
  },

  // Update lesson
  async updateLesson(lessonId, updates) {
    try {
      await updateDoc(doc(db, 'lessons', lessonId), {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      console.error('Update lesson error:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete lesson
  async deleteLesson(lessonId) {
    try {
      await deleteDoc(doc(db, 'lessons', lessonId));
      return { success: true };
    } catch (error) {
      console.error('Delete lesson error:', error);
      return { success: false, error: error.message };
    }
  },

  // Add resource to lesson
  async addResource(lessonId, resource) {
    try {
      await updateDoc(doc(db, 'lessons', lessonId), {
        resources: arrayUnion({
          ...resource,
          resourceId: `res_${Date.now()}`,
          uploadedAt: new Date().toISOString()
        }),
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      console.error('Add resource error:', error);
      return { success: false, error: error.message };
    }
  },

  // Remove resource from lesson
  async removeResource(lessonId, resource) {
    try {
      await updateDoc(doc(db, 'lessons', lessonId), {
        resources: arrayRemove(resource),
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      console.error('Remove resource error:', error);
      return { success: false, error: error.message };
    }
  },

  // Increment view count
  async incrementViews(lessonId) {
    try {
      const lessonRef = doc(db, 'lessons', lessonId);
      const lessonDoc = await getDoc(lessonRef);
      if (lessonDoc.exists()) {
        await updateDoc(lessonRef, {
          viewsCount: (lessonDoc.data().viewsCount || 0) + 1
        });
      }
      return { success: true };
    } catch (error) {
      console.error('Increment views error:', error);
      return { success: false, error: error.message };
    }
  },

  // ============================================
  // COMMENTS (no index required)
  // ============================================

  // Add comment to lesson
  async addComment(lessonId, commentData) {
    try {
      const commentRef = doc(collection(db, 'lessons', lessonId, 'comments'));
      await setDoc(commentRef, {
        ...commentData,
        commentId: commentRef.id,
        replies: [],
        likesCount: 0,
        createdAt: new Date().toISOString()
      });

      // Update comments count
      const lessonRef = doc(db, 'lessons', lessonId);
      const lessonDoc = await getDoc(lessonRef);
      if (lessonDoc.exists()) {
        await updateDoc(lessonRef, {
          commentsCount: (lessonDoc.data().commentsCount || 0) + 1
        });
      }

      return { success: true, commentId: commentRef.id };
    } catch (error) {
      console.error('Add comment error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get comments for lesson (no index required)
  async getComments(lessonId) {
    try {
      const querySnapshot = await getDocs(
        collection(db, 'lessons', lessonId, 'comments')
      );
      const comments = [];
      querySnapshot.forEach((doc) => {
        comments.push({ id: doc.id, ...doc.data() });
      });
      // Sort in JavaScript - newest first
      comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return { success: true, data: comments };
    } catch (error) {
      console.error('Get comments error:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete comment
  async deleteComment(lessonId, commentId) {
    try {
      await deleteDoc(doc(db, 'lessons', lessonId, 'comments', commentId));
      
      // Update comments count
      const lessonRef = doc(db, 'lessons', lessonId);
      const lessonDoc = await getDoc(lessonRef);
      if (lessonDoc.exists()) {
        await updateDoc(lessonRef, {
          commentsCount: Math.max((lessonDoc.data().commentsCount || 1) - 1, 0)
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Delete comment error:', error);
      return { success: false, error: error.message };
    }
  },

  // Add reply to comment
  async addReply(lessonId, commentId, replyData) {
    try {
      await updateDoc(doc(db, 'lessons', lessonId, 'comments', commentId), {
        replies: arrayUnion({
          ...replyData,
          replyId: `reply_${Date.now()}`,
          createdAt: new Date().toISOString()
        })
      });
      return { success: true };
    } catch (error) {
      console.error('Add reply error:', error);
      return { success: false, error: error.message };
    }
  }
};
