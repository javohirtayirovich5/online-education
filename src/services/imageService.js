import { storageService } from './storageService';

export const imageService = {
  // Upload image for test question
  async uploadTestImage(testId, file, onProgress) {
    try {
      const extension = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${extension}`;
      const path = `tests/${testId}/questions/${fileName}`;
      
      const result = await storageService.uploadFile(file, path, onProgress);
      
      if (result.success) {
        return {
          success: true,
          url: result.url,
          fileName: fileName
        };
      } else {
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      console.error('Upload test image error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Delete image from test
  async deleteTestImage(testId, fileName) {
    try {
      const path = `tests/${testId}/questions/${fileName}`;
      const result = await storageService.deleteFile(path);
      return result;
    } catch (error) {
      console.error('Delete test image error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};
