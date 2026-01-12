import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { libraryService } from '../services/libraryService';
import { toast } from 'react-toastify';
import { 
  FiArrowLeft,
  FiDownload,
  FiExternalLink,
  FiUser
} from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import LoadingSpinner from '../components/common/LoadingSpinner';
import './BookReader.css';

const BookReader = () => {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [book, setBook] = useState(location.state?.book || null);
  const [loading, setLoading] = useState(!book);

  useEffect(() => {
    const loadBook = async () => {
      if (book) return; // Book already loaded from state
      
      setLoading(true);
      try {
        const result = await libraryService.getBookDetails(bookId);
        if (result.success) {
          setBook(result.book);
        } else {
          toast.error(t('library.bookNotFound') || 'Kitob topilmadi');
          navigate('/library');
        }
      } catch (error) {
        console.error('Load book error:', error);
        toast.error(t('library.loadError') || 'Kitob yuklashda xatolik');
        navigate('/library');
      } finally {
        setLoading(false);
      }
    };

    loadBook();
  }, [bookId, book, navigate, t]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!book) {
    return null;
  }

  const readLink = libraryService.getHTMLLink(book.gutenbergId, book.formats) 
    || libraryService.getTextLink(book.gutenbergId, book.formats)
    || libraryService.getDirectPDFLink(book.gutenbergId, book.formats);

  return (
    <div className="app">
      <Navbar />
      <div className="book-reader-page">
        <div className="book-reader-header">
        <button
          className="book-reader-back-btn"
          onClick={() => navigate('/library')}
        >
          <FiArrowLeft /> {t('common.back') || 'Qaytish'}
        </button>
        <div className="book-reader-info">
          <h1 className="book-reader-title">{book.title}</h1>
          <p className="book-reader-author">
            <FiUser size={16} /> {book.author}
          </p>
        </div>
        <div className="book-reader-actions">
          {book.formats?.epub && (
            <a
              href={libraryService.getEPUBLink(book.gutenbergId, book.formats)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
              download
            >
              <FiDownload /> EPUB {t('library.download') || 'Yuklab olish'}
            </a>
          )}
          {book.formats?.text && (
            <a
              href={libraryService.getTextLink(book.gutenbergId, book.formats)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
              download
            >
              <FiDownload /> TXT {t('library.download') || 'Yuklab olish'}
            </a>
          )}
        </div>
      </div>
      <div className="book-reader-content">
        {readLink ? (
          <iframe
            src={readLink}
            className="book-reader-iframe"
            title={book.title}
            allow="fullscreen"
            onError={() => {
              console.error('Book iframe load error');
            }}
          />
        ) : (
          <div className="book-reader-error">
            <p>{t('library.readNotAvailable') || 'Onlayn o\'qish imkoni mavjud emas'}</p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default BookReader;
