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
  arrayUnion,
  arrayRemove,
  increment
} from 'firebase/firestore';
import { db } from './firebase';

export const courseService = {
  // Create new course
  async createCourse(courseData) {
    try {
      const courseRef = doc(collection(db, 'courses'));
      await setDoc(courseRef, {
        ...courseData,
        courseId: courseRef.id,
        views: 0,
        modules: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return { success: true, courseId: courseRef.id };
    } catch (error) {
      console.error('Create course error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get course by ID
  async getCourse(courseId) {
    try {
      const docSnap = await getDoc(doc(db, 'courses', courseId));
      if (docSnap.exists()) {
        return { success: true, data: docSnap.data() };
      }
      return { success: false, error: 'Course not found' };
    } catch (error) {
      console.error('Get course error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get all courses
  async getAllCourses() {
    try {
      const querySnapshot = await getDocs(collection(db, 'courses'));
      const courses = [];
      querySnapshot.forEach((doc) => {
        courses.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, data: courses };
    } catch (error) {
      console.error('Get all courses error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get courses by instructor (no index required)
  async getCoursesByInstructor(instructorId) {
    try {
      const q = query(
        collection(db, 'courses'),
        where('instructorId', '==', instructorId)
      );
      const querySnapshot = await getDocs(q);
      const courses = [];
      querySnapshot.forEach((doc) => {
        courses.push({ id: doc.id, ...doc.data() });
      });
      // Sort in JavaScript - no index needed
      courses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return { success: true, data: courses };
    } catch (error) {
      console.error('Get instructor courses error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get all courses (for students)
  async getAllCourses() {
    try {
      const querySnapshot = await getDocs(collection(db, 'courses'));
      const courses = [];
      querySnapshot.forEach((doc) => {
        courses.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, data: courses };
    } catch (error) {
      console.error('Get all courses error:', error);
      return { success: false, error: error.message };
    }
  },

  // Update course
  async updateCourse(courseId, updates) {
    try {
      await updateDoc(doc(db, 'courses', courseId), {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      console.error('Update course error:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete course
  async deleteCourse(courseId) {
    try {
      await deleteDoc(doc(db, 'courses', courseId));
      return { success: true };
    } catch (error) {
      console.error('Delete course error:', error);
      return { success: false, error: error.message };
    }
  },

  // Increment course views
  async incrementCourseViews(courseId) {
    try {
      await updateDoc(doc(db, 'courses', courseId), {
        views: increment(1)
      });
      return { success: true };
    } catch (error) {
      console.error('Increment views error:', error);
      return { success: false, error: error.message };
    }
  },

  // Add module to course
  async addModule(courseId, moduleData) {
    try {
      const courseRef = doc(db, 'courses', courseId);
      await updateDoc(courseRef, {
        modules: arrayUnion({
          ...moduleData,
          moduleId: `module_${Date.now()}`,
          lessons: []
        }),
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      console.error('Add module error:', error);
      return { success: false, error: error.message };
    }
  },

  // Add lesson to course module
  async addLessonToModule(courseId, moduleId, lessonData) {
    try {
      const courseRef = doc(db, 'courses', courseId);
      const courseDoc = await getDoc(courseRef);
      
      if (!courseDoc.exists()) {
        return { success: false, error: 'Kurs topilmadi' };
      }

      const courseData = courseDoc.data();
      const modules = courseData.modules || [];
      const moduleIndex = modules.findIndex(m => m.moduleId === moduleId);

      if (moduleIndex === -1) {
        return { success: false, error: 'Modul topilmadi' };
      }

      const updatedModules = [...modules];
      updatedModules[moduleIndex] = {
        ...updatedModules[moduleIndex],
        lessons: [
          ...(updatedModules[moduleIndex].lessons || []),
          {
            ...lessonData,
            lessonId: `lesson_${Date.now()}`,
            createdAt: new Date().toISOString()
          }
        ]
      };

      await updateDoc(courseRef, {
        modules: updatedModules,
        updatedAt: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      console.error('Add lesson to module error:', error);
      return { success: false, error: error.message };
    }
  },

  // Update lesson in course module
  async updateLessonInModule(courseId, moduleId, lessonId, updates) {
    try {
      const courseRef = doc(db, 'courses', courseId);
      const courseDoc = await getDoc(courseRef);
      
      if (!courseDoc.exists()) {
        return { success: false, error: 'Kurs topilmadi' };
      }

      const courseData = courseDoc.data();
      const modules = courseData.modules || [];
      const moduleIndex = modules.findIndex(m => m.moduleId === moduleId);

      if (moduleIndex === -1) {
        return { success: false, error: 'Modul topilmadi' };
      }

      const updatedModules = [...modules];
      const lessons = updatedModules[moduleIndex].lessons || [];
      const lessonIndex = lessons.findIndex(l => l.lessonId === lessonId);

      if (lessonIndex === -1) {
        return { success: false, error: 'Dars topilmadi' };
      }

      updatedModules[moduleIndex] = {
        ...updatedModules[moduleIndex],
        lessons: lessons.map((lesson, idx) => 
          idx === lessonIndex 
            ? { ...lesson, ...updates, updatedAt: new Date().toISOString() }
            : lesson
        )
      };

      await updateDoc(courseRef, {
        modules: updatedModules,
        updatedAt: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      console.error('Update lesson error:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete lesson from course module
  async deleteLessonFromModule(courseId, moduleId, lessonId) {
    try {
      const courseRef = doc(db, 'courses', courseId);
      const courseDoc = await getDoc(courseRef);
      
      if (!courseDoc.exists()) {
        return { success: false, error: 'Kurs topilmadi' };
      }

      const courseData = courseDoc.data();
      const modules = courseData.modules || [];
      const moduleIndex = modules.findIndex(m => m.moduleId === moduleId);

      if (moduleIndex === -1) {
        return { success: false, error: 'Modul topilmadi' };
      }

      const updatedModules = [...modules];
      updatedModules[moduleIndex] = {
        ...updatedModules[moduleIndex],
        lessons: (updatedModules[moduleIndex].lessons || []).filter(
          l => l.lessonId !== lessonId
        )
      };

      await updateDoc(courseRef, {
        modules: updatedModules,
        updatedAt: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      console.error('Delete lesson error:', error);
      return { success: false, error: error.message };
    }
  },

  // ============================================
  // COMMENTS
  // ============================================

  // Add comment to course
  async addComment(courseId, commentData) {
    try {
      const commentRef = doc(collection(db, 'courses', courseId, 'comments'));
      
      // Filter out undefined values
      const cleanCommentData = Object.fromEntries(
        Object.entries({
          ...commentData,
          commentId: commentRef.id,
          createdAt: new Date().toISOString()
        }).filter(([_, value]) => value !== undefined)
      );
      
      await setDoc(commentRef, cleanCommentData);

      // Update comments count (if this fails, comment is still added)
      try {
        const courseRef = doc(db, 'courses', courseId);
        const courseDoc = await getDoc(courseRef);
        if (courseDoc.exists()) {
          await updateDoc(courseRef, {
            commentsCount: (courseDoc.data().commentsCount || 0) + 1
          });
        }
      } catch (updateError) {
        // Log error but don't fail the whole operation
        console.warn('Failed to update comments count:', updateError);
      }

      return { success: true, commentId: commentRef.id };
    } catch (error) {
      console.error('Add comment error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get comments for course
  async getComments(courseId) {
    try {
      const querySnapshot = await getDocs(
        collection(db, 'courses', courseId, 'comments')
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

  // Delete comment from course
  async deleteComment(courseId, commentId) {
    try {
      await deleteDoc(doc(db, 'courses', courseId, 'comments', commentId));

      // Update comments count
      const courseRef = doc(db, 'courses', courseId);
      const courseDoc = await getDoc(courseRef);
      if (courseDoc.exists()) {
        const currentCount = courseDoc.data().commentsCount || 0;
        await updateDoc(courseRef, {
          commentsCount: Math.max(currentCount - 1, 0)
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Delete comment error:', error);
      return { success: false, error: error.message };
    }
  }
};

