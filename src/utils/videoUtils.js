/**
 * Video duration olish funksiyasi
 * @param {File} videoFile - Video fayl
 * @returns {Promise<number>} - Video davomiyligi (sekundlarda)
 */
export const getVideoDuration = (videoFile) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };

    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      reject(new Error('Video yuklashda xatolik'));
    };

    video.src = URL.createObjectURL(videoFile);
  });
};

/**
 * Sekundlarni daqiqaga o'girish
 * @param {number} seconds - Sekundlar
 * @returns {number} - Daqiqalar (yaxlitlangan)
 */
export const secondsToMinutes = (seconds) => {
  return Math.round(seconds / 60);
};

/**
 * Sekundlarni formatlangan stringga o'girish (MM:SS)
 * @param {number} seconds - Sekundlar
 * @returns {string} - Formatlangan vaqt (MM:SS)
 */
export const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Video fayldan thumbnail yaratish
 * @param {File} videoFile - Video fayl
 * @param {number} timeInSeconds - Thumbnail yaratish vaqti (default: 1 sekund)
 * @returns {Promise<Blob>} - Thumbnail Blob
 */
export const generateThumbnailFromVideo = (videoFile, timeInSeconds = 1) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      // Canvas o'lchamini videoga moslashtirish
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Belgilangan vaqtga o'tish
      video.currentTime = timeInSeconds;
    };

    video.onseeked = () => {
      try {
        // Videodan frame ni canvas ga chizish
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Canvas ni Blob ga o'girish
        canvas.toBlob((blob) => {
          if (blob) {
            window.URL.revokeObjectURL(video.src);
            resolve(blob);
          } else {
            window.URL.revokeObjectURL(video.src);
            reject(new Error('Thumbnail yaratishda xatolik'));
          }
        }, 'image/jpeg', 0.8);
      } catch (error) {
        window.URL.revokeObjectURL(video.src);
        reject(error);
      }
    };

    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      reject(new Error('Video yuklashda xatolik'));
    };

    video.src = URL.createObjectURL(videoFile);
  });
};

