import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { libraryService } from '../services/libraryService';
import { toast } from 'react-toastify';
import { 
  FiSearch, 
  FiBook, 
  FiHeart, 
  FiDownload,
  FiEye,
  FiX,
  FiFilter,
  FiChevronLeft,
  FiChevronRight,
  FiStar,
  FiBookOpen,
  FiGlobe,
  FiCalendar,
  FiUser,
  FiList,
  FiExternalLink
} from 'react-icons/fi';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import './Library.css';

const Library = () => {
  const { userData } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [showBookModal, setShowBookModal] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBooks, setTotalBooks] = useState(0);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('all');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const searchInputRef = useRef(null);

  // Mashhur janrlar ro'yxati (dropdown emas, chip ko'rinishida)
  const genres = [
    { value: 'all', label: t('library.allGenres') || 'Barcha janrlar' },
    { value: 'Fiction', label: t('library.genreFiction') || 'Fiction' },
    { value: 'Novel', label: t('library.genreNovel') || 'Novel' },
    { value: 'Poetry', label: t('library.genrePoetry') || 'Poetry' },
    { value: 'Drama', label: t('library.genreDrama') || 'Drama' },
    { value: 'History', label: t('library.genreHistory') || 'History' },
    { value: 'Philosophy', label: t('library.genrePhilosophy') || 'Philosophy' },
    { value: 'Science', label: t('library.genreScience') || 'Science' },
    { value: 'Adventure', label: t('library.genreAdventure') || 'Adventure' },
    { value: 'Romance', label: t('library.genreRomance') || 'Romance' },
    { value: 'Mystery', label: t('library.genreMystery') || 'Mystery' },
    { value: 'Horror', label: t('library.genreHorror') || 'Horror' },
    { value: 'Fantasy', label: t('library.genreFantasy') || 'Fantasy' },
    { value: 'Biography', label: t('library.genreBiography') || 'Biography' },
    { value: 'Autobiography', label: t('library.genreAutobiography') || 'Autobiography' },
    { value: 'Children', label: t('library.genreChildren') || 'Children' },
    { value: 'Education', label: t('library.genreEducation') || 'Education' },
    { value: 'Religion', label: t('library.genreReligion') || 'Religion' },
    { value: 'Travel', label: t('library.genreTravel') || 'Travel' },
    { value: 'Humor', label: t('library.genreHumor') || 'Humor' }
  ];

  useEffect(() => {
    loadFavorites();
    loadPopularBooks(); // Component mount bo'lganda mashhur kitoblarni yuklash
  }, [userData]);

  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch();
    } else {
      // Qidiruv bo'sh bo'lganda mashhur kitoblarni ko'rsatish
      loadPopularBooks();
    }
  }, [searchQuery, currentPage, sortBy, selectedGenre]);

  const loadFavorites = async () => {
    if (!userData?.uid) return;
    const result = await libraryService.getFavorites(userData.uid);
    if (result.success) {
      setFavorites(result.data.map(item => item.bookId));
    }
  };

  const loadPopularBooks = async () => {
    setLoading(true);
    const topic = selectedGenre === 'all' ? null : selectedGenre;
    const result = await libraryService.getPopularBooks(20, currentPage, topic);
    if (result.success) {
      setBooks(result.books);
      setTotalBooks(result.total || 0);
      setTotalPages(result.numPages || 1);
    } else {
      console.error('Load popular books error:', result.error);
      setBooks([]);
      setTotalPages(1);
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    const topic = selectedGenre === 'all' ? null : selectedGenre;
    const result = await libraryService.searchBooks(searchQuery, {
      limit: 20,
      page: currentPage,
      sort: sortBy === 'all' ? 'relevance' : sortBy,
      topic: topic
    });

    if (result.success) {
      setBooks(result.books);
      setTotalPages(result.numPages || 1);
      setTotalBooks(result.total || 0);
    } else {
      toast.error(t('library.searchError') || 'Kitoblar qidirishda xatolik');
      setBooks([]);
    }
    setLoading(false);
  };

  const handleBookClick = async (book) => {
    setSelectedBook(book);
    setShowBookModal(true);
  };

  const handleAddToFavorites = async (book) => {
    if (!userData?.uid) {
      toast.info(t('library.loginRequired') || 'Iltimos, avval tizimga kiring');
      return;
    }

    const isFavorite = favorites.includes(book.id);
    
    if (isFavorite) {
      const result = await libraryService.removeFromFavorites(userData.uid, book.id);
      if (result.success) {
        setFavorites(prev => prev.filter(id => id !== book.id));
        toast.success(t('library.removedFromFavorites') || 'Sevimlilaridan olib tashlandi');
      } else {
        toast.error(t('library.favoriteError') || 'Xatolik yuz berdi');
      }
    } else {
      const result = await libraryService.addToFavorites(userData.uid, book);
      if (result.success) {
        setFavorites(prev => [...prev, book.id]);
        toast.success(t('library.addedToFavorites') || 'Sevimlilariga qo\'shildi');
      } else {
        toast.error(result.error || t('library.favoriteError') || 'Xatolik yuz berdi');
      }
    }
  };

  const handleDownload = async (book) => {
    if (!book.gutenbergId) {
      toast.info(t('library.downloadNotAvailable') || 'Yuklab olish imkoni mavjud emas');
      return;
    }

    // EPUB yoki PDF formatini afzal ko'ramiz
    const downloadLink = libraryService.getEPUBLink(book.gutenbergId, book.formats)
      || libraryService.getDirectPDFLink(book.gutenbergId, book.formats)
      || libraryService.getTextLink(book.gutenbergId, book.formats);
    
    if (downloadLink) {
      window.open(downloadLink, '_blank');
      toast.success(t('library.downloadStarted') || 'Yuklab olish boshlandi');
    } else {
      toast.info(t('library.downloadNotAvailable') || 'Yuklab olish imkoni mavjud emas');
    }
  };

  const handleReadOnline = async (book) => {
    if (!book.gutenbergId) {
      toast.info(t('library.readNotAvailable') || 'Onlayn o\'qish imkoni mavjud emas');
      return;
    }

    // PDF/EPUB/Text mavjudligini tekshirish
    const isAvailable = await libraryService.checkPDFAvailability(book.gutenbergId, book.formats);
    if (!isAvailable) {
      toast.warning(t('library.pdfNotAvailable') || 'Bu kitob uchun o\'qish formati mavjud emas');
      return;
    }

    // Yangi sahifaga yo'naltirish
    navigate(`/library/read/${book.gutenbergId}`, { 
      state: { book } 
    });
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="library-page">
      <div className="library-header">
        <div className="library-header-content">
          <div className="library-title-section">
            <FiBook className="library-title-icon" />
            <div>
              <h1 className="library-title">{t('library.title') || 'Kutubxona'}</h1>
              <p className="library-subtitle">{t('library.subtitle') || 'Millionlab kitoblar orasidan qidiring va o\'qing'}</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="library-search-container">
          <div className="library-search-box">
            <FiSearch className="search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              className="library-search-input"
              placeholder={t('library.searchPlaceholder') || 'Kitob nomi, muallif yoki ISBN bo\'yicha qidiring...'}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
            {searchQuery && (
              <button
                className="search-clear-btn"
                onClick={() => {
                  setSearchQuery('');
                  setBooks([]);
                  setCurrentPage(1);
                  searchInputRef.current?.focus();
                }}
              >
                <FiX />
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="library-controls">
            <button
              className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title={t('library.gridView') || 'Grid ko\'rinish'}
            >
              <FiBook />
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title={t('library.listView') || 'Ro\'yxat ko\'rinish'}
            >
              <FiBookOpen />
            </button>
            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">{t('library.sortAll') || 'Hammasi'}</option>
              <option value="relevance">{t('library.sortRelevance') || 'Relevansiya'}</option>
              <option value="new">{t('library.sortNew') || 'Yangi'}</option>
              <option value="old">{t('library.sortOld') || 'Eski'}</option>
              <option value="title">{t('library.sortTitle') || 'Sarlavha'}</option>
            </select>
          </div>
        </div>

        {/* Genre Filter Chips */}
        <div className="library-genres-section">
          <h3 className="genres-section-title">{t('library.selectGenre') || 'Janr tanlang'}</h3>
          <div className="genres-chips-container">
            {genres.map((genre) => (
              <button
                key={genre.value}
                className={`genre-chip ${selectedGenre === genre.value ? 'active' : ''}`}
                onClick={() => {
                  setSelectedGenre(genre.value);
                  setCurrentPage(1);
                }}
              >
                {genre.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="library-content">
        {loading && <LoadingSpinner />}

        {!loading && searchQuery && books.length === 0 && (
          <div className="library-empty">
            <FiBook className="empty-icon" />
            <h3>{t('library.noBooksFound') || 'Kitoblar topilmadi'}</h3>
            <p>{t('library.tryDifferentQuery') || 'Boshqa so\'zlar bilan qidirib ko\'ring'}</p>
          </div>
        )}

        {!loading && !searchQuery && books.length === 0 && (
          <div className="library-empty">
            <FiSearch className="empty-icon" />
            <h3>{t('library.startSearching') || 'Qidirishni boshlang'}</h3>
            <p>{t('library.searchHint') || 'Kitob nomi, muallif yoki ISBN bo\'yicha qidiring'}</p>
          </div>
        )}

        {!loading && !searchQuery && books.length > 0 && (
          <>
            <div className="library-section-header">
              <h2 className="section-title">
                <FiStar className="section-icon" />
                {t('library.popularBooks') || 'Eng mashhur kitoblar'}
              </h2>
              <p className="section-description">
                {t('library.popularBooksDesc') || 'Eng ko\'p o\'qilgan va baholangan kitoblar'}
              </p>
            </div>

            <div className="library-results-info">
              <span className="results-count">
                {totalBooks.toLocaleString()} {t('library.booksFound') || 'kitob topildi'}
              </span>
              {totalPages > 1 && (
                <span className="page-info">
                  {t('library.page') || 'Sahifa'} {currentPage} / {totalPages}
                </span>
              )}
            </div>

            <div className={`books-container books-${viewMode}`}>
              {books.map((book) => (
                <div key={book.id} className="book-card">
                  <div className="book-cover-container">
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="book-cover"
                      onError={(e) => {
                        e.target.src = '/default-book-cover.png';
                      }}
                    />
                    <div className="book-overlay">
                      <button
                        className="book-action-btn"
                        onClick={() => handleBookClick(book)}
                        title={t('library.viewDetails') || 'Tafsilotlarni ko\'rish'}
                      >
                        <FiEye />
                      </button>
                      {book.gutenbergId && (book.formats?.text || book.formats?.html || book.formats?.epub || book.formats?.pdf) && (
                        <>
                          <button
                            className="book-action-btn"
                            onClick={() => handleReadOnline(book)}
                            title={t('library.readOnline') || 'Onlayn o\'qish'}
                          >
                            <FiBookOpen />
                          </button>
                          <button
                            className="book-action-btn"
                            onClick={() => handleDownload(book)}
                            title={t('library.download') || 'Yuklab olish'}
                          >
                            <FiDownload />
                          </button>
                        </>
                      )}
                    </div>
                    <button
                      className={`favorite-btn ${favorites.includes(book.id) ? 'active' : ''}`}
                      onClick={() => handleAddToFavorites(book)}
                      title={favorites.includes(book.id) ? t('library.removeFromFavorites') : t('library.addToFavorites')}
                    >
                      <FiHeart fill={favorites.includes(book.id) ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  <div className="book-info">
                    <h3 className="book-title" onClick={() => handleBookClick(book)}>
                      {book.title}
                    </h3>
                    <p className="book-author">
                      <FiUser size={14} />
                      {book.author}
                    </p>
                    {book.copyrightYear && (
                      <p className="book-meta">
                        <FiCalendar size={14} />
                        {book.copyrightYear}
                      </p>
                    )}
                    {book.downloadCount > 0 && (
                      <p className="book-rating">
                        <FiDownload size={14} />
                        {book.downloadCount.toLocaleString()} 
                        {/* {t('library.downloads') || 'yuklab olingan'} */}
                      </p>
                    )}
                    {book.subject && (
                      <p className="book-subjects">
                        <FiList size={14} />
                        {book.subject}
                      </p>
                    )}
                  </div>

                  <div className="book-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleBookClick(book)}
                    >
                      <FiEye /> {t('library.view') || 'Ko\'rish'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination for Popular Books */}
            {totalPages > 1 && (
              <div className="library-pagination">
                <button
                  className="pagination-btn"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <FiChevronLeft /> {t('library.previous') || 'Oldingi'}
                </button>
                <div className="pagination-pages">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        className={`pagination-page ${currentPage === pageNum ? 'active' : ''}`}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  className="pagination-btn"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  {t('library.next') || 'Keyingi'} <FiChevronRight />
                </button>
              </div>
            )}
          </>
        )}

        {!loading && searchQuery && books.length > 0 && (
          <>
            <div className="library-results-info">
              <span className="results-count">
                {totalBooks.toLocaleString()} {t('library.booksFound') || 'kitob topildi'}
              </span>
              {totalPages > 1 && (
                <span className="page-info">
                  {t('library.page') || 'Sahifa'} {currentPage} / {totalPages}
                </span>
              )}
            </div>

            <div className={`books-container books-${viewMode}`}>
              {books.map((book) => (
                <div key={book.id} className="book-card">
                  <div className="book-cover-container">
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="book-cover"
                      onError={(e) => {
                        e.target.src = '/default-book-cover.png';
                      }}
                    />
                    <div className="book-overlay">
                      <button
                        className="book-action-btn"
                        onClick={() => handleBookClick(book)}
                        title={t('library.viewDetails') || 'Tafsilotlarni ko\'rish'}
                      >
                        <FiEye />
                      </button>
                      {book.gutenbergId && (book.formats?.text || book.formats?.html || book.formats?.epub || book.formats?.pdf) && (
                        <>
                          <button
                            className="book-action-btn"
                            onClick={() => handleReadOnline(book)}
                            title={t('library.readOnline') || 'Onlayn o\'qish'}
                          >
                            <FiBookOpen />
                          </button>
                          <button
                            className="book-action-btn"
                            onClick={() => handleDownload(book)}
                            title={t('library.download') || 'Yuklab olish'}
                          >
                            <FiDownload />
                          </button>
                        </>
                      )}
                    </div>
                    <button
                      className={`favorite-btn ${favorites.includes(book.id) ? 'active' : ''}`}
                      onClick={() => handleAddToFavorites(book)}
                      title={favorites.includes(book.id) ? t('library.removeFromFavorites') : t('library.addToFavorites')}
                    >
                      <FiHeart fill={favorites.includes(book.id) ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  <div className="book-info">
                    <h3 className="book-title" onClick={() => handleBookClick(book)}>
                      {book.title}
                    </h3>
                    <p className="book-author">
                      <FiUser size={14} />
                      {book.author}
                    </p>
                    {book.copyrightYear && (
                      <p className="book-meta">
                        <FiCalendar size={14} />
                        {book.copyrightYear}
                      </p>
                    )}
                    {book.subject && (
                      <p className="book-subjects">
                        <FiList size={14} />
                        {book.subject}
                      </p>
                    )}
                  </div>

                  <div className="book-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleBookClick(book)}
                    >
                      <FiEye /> {t('library.view') || 'Ko\'rish'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="library-pagination">
                <button
                  className="pagination-btn"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <FiChevronLeft /> {t('library.previous') || 'Oldingi'}
                </button>
                <div className="pagination-pages">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        className={`pagination-page ${currentPage === pageNum ? 'active' : ''}`}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  className="pagination-btn"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  {t('library.next') || 'Keyingi'} <FiChevronRight />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Book Detail Modal */}
      <Modal
        isOpen={showBookModal}
        onClose={() => {
          setShowBookModal(false);
          setSelectedBook(null);
        }}
        title={selectedBook?.title}
        size="large"
      >
        {selectedBook && (
          <div className="book-detail-modal">
            <div className="book-detail-header">
              <img
                src={selectedBook.coverUrl}
                alt={selectedBook.title}
                className="book-detail-cover"
                onError={(e) => {
                  e.target.src = '/default-book-cover.png';
                }}
              />
              <div className="book-detail-info">
                <h2>{selectedBook.title}</h2>
                <p className="book-detail-author">
                  <FiUser /> {selectedBook.author}
                </p>
                {selectedBook.copyrightYear && (
                  <p className="book-detail-meta">
                    <FiCalendar /> {t('library.copyright') || 'Mualliflik huquqi'}: {selectedBook.copyrightYear}
                  </p>
                )}
                {selectedBook.language && (
                  <p className="book-detail-meta">
                    <FiGlobe /> {t('library.language') || 'Til'}: {selectedBook.language.toUpperCase()}
                  </p>
                )}
                {selectedBook.isbn && (
                  <p className="book-detail-meta">
                    <FiBook /> ISBN: {selectedBook.isbn}
                  </p>
                )}
                {selectedBook.downloadCount > 0 && (
                  <div className="book-rating">
                    <FiDownload />
                    <span>{selectedBook.downloadCount.toLocaleString()}</span>
                    <span className="rating-count">
                      {t('library.downloads') || 'yuklab olingan'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {selectedBook.description && (
              <div className="book-detail-description">
                <h3>{t('library.description') || 'Tavsif'}</h3>
                <p>{selectedBook.description}</p>
              </div>
            )}

            {selectedBook.subjects && selectedBook.subjects.length > 0 && (
              <div className="book-detail-subjects">
                <h3>{t('library.subjects') || 'Mavzular'}</h3>
                <div className="subjects-tags">
                  {(Array.isArray(selectedBook.subjects) 
                    ? selectedBook.subjects 
                    : selectedBook.subjects.split(', ')
                  ).slice(0, 10).map((subject, index) => (
                    <span key={index} className="subject-tag">
                      {subject}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="book-detail-actions">
              <button
                className={`btn ${favorites.includes(selectedBook.id) ? 'btn-secondary' : 'btn-primary'}`}
                onClick={() => handleAddToFavorites(selectedBook)}
              >
                <FiHeart fill={favorites.includes(selectedBook.id) ? 'currentColor' : 'none'} />
                {favorites.includes(selectedBook.id) ? t('library.removeFromFavorites') : t('library.addToFavorites')}
              </button>
              {selectedBook.gutenbergId && (selectedBook.formats?.text || selectedBook.formats?.html || selectedBook.formats?.epub || selectedBook.formats?.pdf) && (
                <>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleReadOnline(selectedBook)}
                  >
                    <FiEye /> {t('library.readOnline') || 'Onlayn o\'qish'}
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleDownload(selectedBook)}
                  >
                    <FiDownload /> {t('library.download') || 'Yuklab olish'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default Library;
