import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

export const storageService = {
  // Upload file with progress tracking
  async uploadFile(file, path, onProgress) {
    try {
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) {
              onProgress(progress);
            }
          },
          (error) => {
            console.error('Upload error:', error);
            reject({ success: false, error: error.message });
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({ success: true, url: downloadURL });
          }
        );
      });
    } catch (error) {
      console.error('Upload file error:', error);
      return { success: false, error: error.message };
    }
  },

  // Upload profile picture
  async uploadProfilePicture(userId, file, onProgress) {
    const path = `users/${userId}/profile_${Date.now()}.jpg`;
    return this.uploadFile(file, path, onProgress);
  },

  // Upload course thumbnail
  async uploadCourseThumbnail(courseId, file, onProgress) {
    const path = `courses/${courseId}/thumbnail_${Date.now()}.jpg`;
    return this.uploadFile(file, path, onProgress);
  },

  // Upload video lesson - YANGI
  async uploadVideo(lessonId, videoName, file, onProgress) {
    const extension = file.name.split('.').pop() || 'mp4';
    const path = `lessons/${lessonId}/videos/${videoName}.${extension}`;
    return this.uploadFile(file, path, onProgress);
  },

  // Upload lesson thumbnail
  async uploadLessonThumbnail(lessonId, file, onProgress) {
    const extension = file.name.split('.').pop() || 'jpg';
    const path = `lessons/${lessonId}/thumbnail.${extension}`;
    return this.uploadFile(file, path, onProgress);
  },

  // Upload document
  async uploadDocument(lessonId, fileName, file, onProgress) {
    const extension = file.name.split('.').pop();
    const path = `lessons/${lessonId}/documents/${fileName}_${Date.now()}.${extension}`;
    return this.uploadFile(file, path, onProgress);
  },

  // Upload assignment attachment (for teacher)
  async uploadAssignmentAttachment(assignmentId, file, onProgress) {
    const extension = file.name.split('.').pop();
    const path = `assignments/${assignmentId}/attachments/${Date.now()}_${file.name}`;
    return this.uploadFile(file, path, onProgress);
  },

  // Upload assignment submission (for student)
  async uploadAssignmentSubmission(assignmentId, studentId, file, onProgress) {
    const extension = file.name.split('.').pop();
    const path = `assignments/${assignmentId}/submissions/${studentId}/submission_${Date.now()}.${extension}`;
    return this.uploadFile(file, path, onProgress);
  },

  // Delete file
  async deleteFile(filePath) {
    try {
      const fileRef = ref(storage, filePath);
      await deleteObject(fileRef);
      return { success: true };
    } catch (error) {
      console.error('Delete file error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get download URL
  async getFileURL(filePath) {
    try {
      const fileRef = ref(storage, filePath);
      const url = await getDownloadURL(fileRef);
      return { success: true, url };
    } catch (error) {
      console.error('Get file URL error:', error);
      return { success: false, error: error.message };
    }
  }
};
