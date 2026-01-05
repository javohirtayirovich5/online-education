import { storageService } from './storageService';

export const audioService = {
  // Upload audio file for test
  async uploadTestAudio(testId, file, onProgress) {
    try {
      // Validate file type
      const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'];
      if (!validTypes.includes(file.type)) {
        return { success: false, error: 'Faqat audio fayllar (MP3, WAV, OGG) qabul qilinadi' };
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return { success: false, error: 'Audio fayl hajmi 10MB dan oshmasligi kerak' };
      }

      // Generate unique filename
      const timestamp = Date.now();
      const extension = file.name.split('.').pop() || 'mp3';
      const fileName = `audio_${timestamp}.${extension}`;
      const path = `tests/${testId}/audio/${fileName}`;

      // Upload file
      const result = await storageService.uploadFile(file, path, onProgress);
      
      if (result.success) {
        // Get audio duration
        const duration = await this.getAudioDuration(result.url);
        
        return {
          success: true,
          url: result.url,
          fileName: fileName,
          duration: duration,
          size: file.size
        };
      }

      return result;
    } catch (error) {
      console.error('Upload audio error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get audio duration from URL
  async getAudioDuration(audioUrl) {
    return new Promise((resolve) => {
      const audio = new Audio(audioUrl);
      audio.addEventListener('loadedmetadata', () => {
        resolve(Math.round(audio.duration));
      });
      audio.addEventListener('error', () => {
        resolve(0);
      });
      // Timeout after 5 seconds
      setTimeout(() => resolve(0), 5000);
    });
  },

  // Delete audio file
  async deleteTestAudio(testId, fileName) {
    try {
      const path = `tests/${testId}/audio/${fileName}`;
      return await storageService.deleteFile(path);
    } catch (error) {
      console.error('Delete audio error:', error);
      return { success: false, error: error.message };
    }
  }
};

