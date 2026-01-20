import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

// Project Gutenberg Gutendex API
const GUTENDEX_API = 'https://gutendex.com/books';
const GUTENBERG_FILES = 'https://www.gutenberg.org/files';
const GUTENBERG_EBOOKS = 'https://www.gutenberg.org/ebooks';

const COLLECTION_NAME = 'library';

// Debounce function for search
let searchTimeout = null;

export const libraryService = {
  // Eng mashhur kitoblarni olish
  async getPopularBooks(limit = 20, page = 1, topic = null) {
    try {
      // Gutendex API - popular kitoblarni olish (faqat ingliz tili)
      const params = new URLSearchParams({
        sort: 'popular',
        page: page.toString(),
        languages: 'en'
      });
      
      // Janr bo'yicha filtrlash
      if (topic) {
        params.append('topic', topic);
      }

      const response = await fetch(`${GUTENDEX_API}/?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Format books data va ratings bo'yicha sortlash
      let books = (data.results || [])
        .map(book => this.formatBookData(book))
        .sort((a, b) => {
          // Download count bo'yicha sortlash
          const scoreA = a.downloadCount || 0;
          const scoreB = b.downloadCount || 0;
          return scoreB - scoreA;
        })
        .slice(0, limit);

      // Calculate total pages based on API response
      const totalCount = data.count || 0;
      const totalPages = Math.ceil(totalCount / limit);

      return {
        success: true,
        books,
        total: totalCount || books.length,
        page: page,
        numPages: totalPages
      };
    } catch (error) {
      console.error('Get popular books error:', error);
      return {
        success: false,
        error: error.message,
        books: [],
        total: 0,
        page: page,
        numPages: 0
      };
    }
  },

  // Kitob qidirish (Gutendex API)
  async searchBooks(query, options = {}) {
    try {
      const { limit = 20, page = 1, sort = 'relevance', topic = null } = options;
      
      // Debounce search
      return new Promise((resolve) => {
        if (searchTimeout) {
          clearTimeout(searchTimeout);
        }
        
        searchTimeout = setTimeout(async () => {
          try {
            // Gutendex API sort parametrlari
            let sortParam = 'popular';
            if (sort === 'new') sortParam = '-copyright';
            else if (sort === 'old') sortParam = 'copyright';
            else if (sort === 'title') sortParam = 'title';
            else sortParam = 'popular';

            const params = new URLSearchParams({
              search: query,
              page: page.toString(),
              sort: sortParam,
              languages: 'en'
            });
            
            // Janr bo'yicha filtrlash
            if (topic) {
              params.append('topic', topic);
            }

            const response = await fetch(`${GUTENDEX_API}/?${params}`);
            
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Format books data (barcha kitoblar jamoat mulki, filtrlash kerak emas)
            const books = (data.results || [])
              .map(book => this.formatBookData(book))
              .slice(0, limit);
            
            resolve({
              success: true,
              books,
              total: data.count || books.length,
              page: page,
              numPages: Math.ceil((data.count || books.length) / limit)
            });
          } catch (error) {
            console.error('Search books error:', error);
            resolve({
              success: false,
              error: error.message,
              books: [],
              total: 0
            });
          }
        }, 500); // 500ms debounce
      });
    } catch (error) {
      console.error('Search books error:', error);
      return {
        success: false,
        error: error.message,
        books: [],
        total: 0
      };
    }
  },

  // Kitob ma'lumotlarini formatlash (Gutendex format)
  formatBookData(book) {
    // Gutendex API response structure
    const bookId = book.id || null;
    const coverUrl = book.formats?.['image/jpeg'] 
      ? book.formats['image/jpeg']
      : book.formats?.['image/png']
      ? book.formats['image/png']
      : '/default-book-cover.png';

    // Extract authors
    const authors = book.authors || [];
    const author = authors.map(a => a.name).join(', ') || 'Unknown Author';

    // Extract languages
    const languages = book.languages || [];
    const language = languages[0] || 'en';

    // Extract subjects
    const subjects = book.subjects || [];
    const subject = subjects.slice(0, 3).join(', ');

    // Extract formats va HTTP'ni HTTPS'ga o'zgartirish
    const formats = book.formats || {};
    const hasText = formats['text/plain; charset=utf-8'] || formats['text/plain'] || null;
    const hasHTML = formats['text/html'] || null;
    const hasEPUB = formats['application/epub+zip'] || null;
    const hasPDF = formats['application/pdf'] || null;

    // Helper function to convert HTTP to HTTPS
    const toHTTPS = (url) => {
      if (!url) return null;
      return url.replace(/^http:/, 'https:');
    };

    return {
      id: bookId || `book_${Date.now()}`,
      title: book.title || 'Untitled',
      author,
      authors: authors.map(a => a.name),
      description: '', // Gutendex'da description yo'q
      coverUrl: toHTTPS(coverUrl),
      isbn: null, // Gutendex'da ISBN yo'q
      publishYear: null, // Copyright yili mavjud emas
      copyrightYear: book.copyright || null,
      language,
      languages,
      subjects,
      subject,
      gutenbergId: bookId, // Project Gutenberg ID
      downloadCount: book.download_count || 0,
      formats: {
        text: toHTTPS(hasText),
        html: toHTTPS(hasHTML),
        epub: toHTTPS(hasEPUB),
        pdf: toHTTPS(hasPDF)
      },
      raw: book // Store raw data for details
    };
  },

  // Kitob tafsilotlarini olish (Gutendex API)
  async getBookDetails(bookId) {
    try {
      const response = await fetch(`${GUTENDEX_API}/${bookId}/`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Format book data
      const formattedBook = this.formatBookData(data);

      return {
        success: true,
        book: formattedBook
      };
    } catch (error) {
      console.error('Get book details error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Project Gutenberg'dan PDF linkini olish
  getPDFLink(gutenbergId) {
    if (!gutenbergId) return null;
    // Gutendex API'dan format ma'lumotlarini olish kerak
    return `${GUTENBERG_EBOOKS}/${gutenbergId}`;
  },

  // Project Gutenberg'dan to'g'ridan-to'g'ri PDF yuklab olish
  getDirectPDFLink(gutenbergId, formats = {}) {
    if (!gutenbergId) return null;
    // Formats object'dan PDF linkini olish
    if (formats.pdf) {
      // HTTP'ni HTTPS'ga o'zgartirish
      return formats.pdf.replace(/^http:/, 'https:');
    }
    // Agar formats mavjud bo'lmasa, default link
    return `${GUTENBERG_EBOOKS}/${gutenbergId}`;
  },

  // EPUB linkini olish
  getEPUBLink(gutenbergId, formats = {}) {
    if (!gutenbergId) return null;
    // Formats object'dan EPUB linkini olish
    if (formats.epub) {
      // HTTP'ni HTTPS'ga o'zgartirish
      return formats.epub.replace(/^http:/, 'https:');
    }
    return `${GUTENBERG_EBOOKS}/${gutenbergId}.epub.images`;
  },

  // Text linkini olish
  getTextLink(gutenbergId, formats = {}) {
    if (!gutenbergId) return null;
    // Formats object'dan text linkini olish
    if (formats.text) {
      // HTTP'ni HTTPS'ga o'zgartirish
      return formats.text.replace(/^http:/, 'https:');
    }
    return `${GUTENBERG_FILES}/${gutenbergId}/${gutenbergId}-0.txt`;
  },

  // HTML linkini olish
  getHTMLLink(gutenbergId, formats = {}) {
    if (!gutenbergId) return null;
    
    // Project Gutenberg cache URL formatini ishlatish (HTTPS)
    // https://www.gutenberg.org/cache/epub/{id}/pg{id}-images.html
    const cacheLink = `https://www.gutenberg.org/cache/epub/${gutenbergId}/pg${gutenbergId}-images.html`;
    
    // Formats object'dan HTML linkini olish (agar mavjud bo'lsa)
    if (formats.html) {
      // HTTP'ni HTTPS'ga o'zgartirish va cache formatiga o'zgartirish
      let httpsLink = formats.html.replace(/^http:/, 'https:');
      
      // Agar URL /ebooks/ formatida bo'lsa, uni /cache/epub/ formatiga o'zgartirish
      if (httpsLink.includes('/ebooks/') && httpsLink.includes('.html')) {
        httpsLink = cacheLink;
      }
      
      return httpsLink;
    }
    
    return cacheLink;
  },

  // PDF mavjudligini tekshirish (Gutenberg'da barcha kitoblar bepul, faqat format mavjudligini tekshiramiz)
  async checkPDFAvailability(gutenbergId, formats = {}) {
    if (!gutenbergId) return false;
    // Formats object'dan PDF mavjudligini tekshirish
    return !!(formats.pdf || formats.epub || formats.text || formats.html);
  },

  // Favorites ga qo'shish
  async addToFavorites(userId, bookData) {
    try {
      const payload = {
        userId,
        bookId: bookData.id,
        bookData,
        type: 'favorite',
        createdAt: serverTimestamp()
      };

      // Check if already exists
      const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', userId),
        where('bookId', '==', bookData.id),
        where('type', '==', 'favorite')
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        return { success: false, error: 'Book already in favorites' };
      }

      const ref = await addDoc(collection(db, COLLECTION_NAME), payload);
      return { success: true, id: ref.id };
    } catch (error) {
      console.error('Add to favorites error:', error);
      return { success: false, error: error.message };
    }
  },

  // Favorites dan olib tashlash
  async removeFromFavorites(userId, bookId) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', userId),
        where('bookId', '==', bookId),
        where('type', '==', 'favorite')
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return { success: false, error: 'Book not found in favorites' };
      }

      await deleteDoc(snapshot.docs[0].ref);
      return { success: true };
    } catch (error) {
      console.error('Remove from favorites error:', error);
      return { success: false, error: error.message };
    }
  },

  // Favorites ro'yxatini olish
  async getFavorites(userId) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', userId),
        where('type', '==', 'favorite')
      );
      const snapshot = await getDocs(q);
      
      const favorites = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return { success: true, data: favorites };
    } catch (error) {
      console.error('Get favorites error:', error);
      return { success: false, error: error.message, data: [] };
    }
  },

  // Reading list ga qo'shish
  async addToReadingList(userId, bookData) {
    try {
      const payload = {
        userId,
        bookId: bookData.id,
        bookData,
        type: 'reading',
        status: 'want_to_read',
        createdAt: serverTimestamp()
      };

      // Check if already exists
      const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', userId),
        where('bookId', '==', bookData.id),
        where('type', '==', 'reading')
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        // Update status
        await updateDoc(snapshot.docs[0].ref, {
          status: 'want_to_read',
          updatedAt: serverTimestamp()
        });
        return { success: true, id: snapshot.docs[0].id };
      }

      const ref = await addDoc(collection(db, COLLECTION_NAME), payload);
      return { success: true, id: ref.id };
    } catch (error) {
      console.error('Add to reading list error:', error);
      return { success: false, error: error.message };
    }
  },

  // Reading list ni olish
  async getReadingList(userId) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', userId),
        where('type', '==', 'reading')
      );
      const snapshot = await getDocs(q);
      
      const readingList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return { success: true, data: readingList };
    } catch (error) {
      console.error('Get reading list error:', error);
      return { success: false, error: error.message, data: [] };
    }
  },

  // Kitobni "o'qildi" deb belgilash
  async markAsRead(userId, bookId) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', userId),
        where('bookId', '==', bookId),
        where('type', '==', 'reading')
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return { success: false, error: 'Book not found in reading list' };
      }

      await updateDoc(snapshot.docs[0].ref, {
        status: 'read',
        readAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('Mark as read error:', error);
      return { success: false, error: error.message };
    }
  }
};