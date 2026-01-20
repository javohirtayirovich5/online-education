/**
 * Image optimization utilities
 * Optimizes image URLs for better performance
 */

/**
 * Optimize image URL for Firebase Storage
 * @param {string} url - Image URL
 * @param {number} width - Desired width (default: 800)
 * @param {number} quality - Image quality 0-100 (default: 80)
 * @returns {string} - Optimized image URL
 */
export const optimizeImageUrl = (url, width = 800, quality = 80) => {
  if (!url) return '/default-book-cover.png';
  
  // Firebase Storage uchun
  if (url.includes('firebasestorage.googleapis.com')) {
    const urlObj = new URL(url);
    // Firebase Storage'da width parametri qo'shish
    urlObj.searchParams.set('alt', 'media');
    if (width) {
      urlObj.searchParams.set('w', width.toString());
    }
    if (quality) {
      urlObj.searchParams.set('q', quality.toString());
    }
    return urlObj.toString();
  }
  
  // Boshqa URL'lar uchun (masalan, Project Gutenberg)
  return url;
};

/**
 * Get optimized image src with lazy loading
 * @param {string} url - Image URL
 * @param {number} width - Desired width
 * @param {string} placeholder - Placeholder image URL
 * @returns {object} - Image props object
 */
export const getOptimizedImageProps = (url, width = 800, placeholder = '/default-book-cover.png') => {
  return {
    src: optimizeImageUrl(url, width),
    loading: 'lazy',
    decoding: 'async',
    alt: '',
    onError: (e) => {
      e.target.src = placeholder;
    }
  };
};
