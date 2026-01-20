import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { lessonService } from '../services/lessonService';
import { storageService } from '../services/storageService';
import ReactPlayer from 'react-player';
import VideoUploader from '../components/common/VideoUploader';
import { 
  FiArrowLeft,
  FiEdit,
  FiTrash2,
  FiEye,
  FiMessageSquare,
  FiClock,
  FiDownload,
  FiFile,
  FiVideo,
  FiPlus,
  FiSend,
  FiUpload
} from 'react-icons/fi';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import ConfirmModal from '../components/common/ConfirmModal';
import { toast } from 'react-toastify';
import { formatDate, formatRelativeTime } from '../utils/helpers';
import './LessonDetail.css';

const LessonDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData, isTeacher } = useAuth();
  const { t } = useTranslation();
  const [lesson, setLesson] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showVideoUploadModal, setShowVideoUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [resourceData, setResourceData] = useState({ title: '', type: 'document', file: null });
  const [editData, setEditData] = useState({});
  const [videoError, setVideoError] = useState(null);

  useEffect(() => {
    loadLesson();
    loadComments();
    setVideoError(null); // Error state ni tozalash
  }, [id]);

  const loadLesson = async () => {
    setLoading(true);
    const result = await lessonService.getLesson(id);
    if (result.success) {
      setLesson(result.data);
      setEditData(result.data);
      // Increment view count
      await lessonService.incrementViews(id);
    } else {
      toast.error('Dars topilmadi');
      navigate('/my-lessons');
    }
    setLoading(false);
  };

  const loadComments = async () => {
    const result = await lessonService.getComments(id);
    if (result.success) {
      setComments(result.data);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    const result = await lessonService.addComment(id, {
      content: newComment,
      authorId: userData.uid,
      authorName: userData.displayName,
      authorPhoto: userData.photoURL,
      authorRole: userData.role
    });

    if (result.success) {
      setNewComment('');
      loadComments();
      setLesson(prev => ({ ...prev, commentsCount: (prev.commentsCount || 0) + 1 }));
      toast.success('Izoh qo\'shildi');
    } else {
      toast.error('Izoh qo\'shishda xatolik');
    }
    setSubmittingComment(false);
  };

  const handleDeleteComment = (commentId) => {
    setDeleteCommentId(commentId);
    setConfirmMessage('Izohni o\'chirmoqchimisiz?');
    setConfirmAction(() => async () => {
      const result = await lessonService.deleteComment(id, commentId);
      if (result.success) {
        loadComments();
        setLesson(prev => ({ ...prev, commentsCount: Math.max((prev.commentsCount || 1) - 1, 0) }));
        toast.success('Izoh o\'chirildi');
      }
    });
    setShowConfirmModal(true);
  };

  const handleUploadResource = async (e) => {
    e.preventDefault();
    if (!resourceData.file || !resourceData.title) {
      toast.error('Fayl va nomni kiriting');
      return;
    }

    const result = await storageService.uploadDocument(
      id,
      resourceData.title,
      resourceData.file,
      (progress) => setUploadProgress(progress)
    );

    if (result.success) {
      await lessonService.addResource(id, {
        title: resourceData.title,
        type: resourceData.type,
        url: result.url,
        fileName: resourceData.file.name,
        fileSize: resourceData.file.size
      });
      
      toast.success('Resurs yuklandi');
      setShowResourceModal(false);
      setResourceData({ title: '', type: 'document', file: null });
      setUploadProgress(0);
      loadLesson();
    } else {
      toast.error('Yuklashda xatolik');
    }
  };

  const handleVideoUploadComplete = async (videoURL) => {
    const result = await lessonService.updateLesson(id, { videoURL, videoType: 'uploaded' });
    if (result.success) {
      toast.success('Video muvaffaqiyatli yuklandi!');
      setShowVideoUploadModal(false);
      loadLesson();
    } else {
      toast.error('Video saqlashda xatolik');
    }
  };

  const handleUpdateLesson = async (e) => {
    e.preventDefault();
    const result = await lessonService.updateLesson(id, editData);
    if (result.success) {
      toast.success('Dars yangilandi');
      setShowEditModal(false);
      loadLesson();
    } else {
      toast.error('Yangilashda xatolik');
    }
  };

  const handleDeleteLesson = () => {
    setConfirmMessage('Darsni o\'chirmoqchimisiz? Bu amalni qaytarib bo\'lmaydi.');
    setConfirmAction(() => async () => {
      const result = await lessonService.deleteLesson(id);
      if (result.success) {
        toast.success('Dars o\'chirildi');
        navigate('/my-lessons');
      }
    });
    setShowConfirmModal(true);
  };

  const isOwner = lesson?.teacherId === userData?.uid;

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '60vh',
        width: '100%'
      }}>
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="empty-state-large">
        <h2>Dars topilmadi</h2>
        <Link to="/my-lessons" className="btn btn-primary">
          Darslarga qaytish
        </Link>
      </div>
    );
  }

  return (
    <div className="lesson-detail">
      {/* Header */}
      <div className="lesson-header">
        <Link to="/my-lessons" className="back-btn">
          <FiArrowLeft /> Orqaga
        </Link>
        
        {isOwner && (
          <div className="owner-actions">
            <button className="btn btn-primary" onClick={() => setShowVideoUploadModal(true)}>
              <FiUpload /> Video yuklash
            </button>
            <button className="btn btn-secondary" onClick={() => setShowEditModal(true)}>
              <FiEdit /> Tahrirlash
            </button>
            <button className="btn btn-danger" onClick={handleDeleteLesson}>
              <FiTrash2 /> O'chirish
            </button>
          </div>
        )}
      </div>

      <div className="lesson-content">
        {/* Main Content */}
        <div className="lesson-main">
          {/* Video Player */}
          <div className="video-container">
            {lesson.videoURL ? (
              lesson.videoType === 'uploaded' ? (
                // Qurilmadan yuklangan video
                <video
                  controls
                  width="100%"
                  height="100%"
                  src={lesson.videoURL}
                  className="uploaded-video"
                  onError={() => setVideoError('Video yuklashda xatolik')}
                >
                  Brauzeringiz video tegini qo'llab-quvvatlamaydi.
                </video>
              ) : videoError ? (
                // Error holati
                <div className="video-error-message" style={{
                  padding: '40px',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  minHeight: '400px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <h3 style={{ color: 'var(--error)', marginBottom: '16px' }}>Video ko'rsatib bo'lmadi</h3>
                  <p style={{ color: 'var(--text-secondary)', maxWidth: '500px' }}>
                    {videoError === 150 || videoError === '150' 
                      ? 'Bu video embedding uchun ruxsat berilmagan yoki cheklangan. Video muallifi embedding ni o\'chirgan bo\'lishi mumkin.'
                      : 'Video yuklashda xatolik yuz berdi. Iltimos, keyinroq urinib ko\'ring.'}
                  </p>
                </div>
              ) : (
                // YouTube/Vimeo link
                <ReactPlayer
                  url={lesson.videoURL}
                  width="100%"
                  height="100%"
                  controls
                  playing={false}
                  config={{
                    youtube: { 
                      playerVars: { 
                        modestbranding: 1,
                        rel: 0,
                        origin: window.location.origin,
                        enablejsapi: 1,
                        playsinline: 1,
                        showinfo: 0,
                        iv_load_policy: 3
                      },
                      embedOptions: {
                        host: 'https://www.youtube.com'
                      }
                    }
                  }}
                  onError={(error) => {
                    console.error('ReactPlayer error:', error);
                    // Error code ni olish
                    const errorCode = error?.data || error?.message || error;
                    setVideoError(errorCode);
                  }}
                  onReady={() => {
                    setVideoError(null);
                  }}
                />
              )
            ) : (
              <div className="no-video-placeholder">
                <FiVideo size={64} />
                <p>Video hali yuklanmagan</p>
                {isOwner && (
                  <button className="btn btn-primary" onClick={() => setShowVideoUploadModal(true)}>
                    <FiUpload /> Video yuklash
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Lesson Info */}
          <div className="lesson-info">
            <span className="lesson-subject-badge">{lesson.subject}</span>
            <h1>{lesson.title}</h1>
            
            <div className="lesson-meta">
              <div className="teacher-info">
                <img 
                  src={lesson.teacherPhoto || '/default-avatar.png'} 
                  alt={lesson.teacherName}
                  className="teacher-avatar-lg"
                />
                <div>
                  <span className="teacher-name">{lesson.teacherName}</span>
                  <span className="lesson-date">{formatDate(lesson.createdAt)}</span>
                </div>
              </div>
              
              <div className="lesson-stats-row">
                <div className="stat">
                  <FiEye /> {lesson.viewsCount || 0} {t('lessons.viewed')}
                </div>
                <div className="stat">
                  <FiMessageSquare /> {lesson.commentsCount || 0} {t('lessons.comment')}
                </div>
                {lesson.duration && (
                  <div className="stat">
                    <FiClock /> {lesson.duration} {t('tests.minutes')}
                  </div>
                )}
              </div>
            </div>

            <div className="lesson-description">
              <h3>{t('lessons.aboutLesson')}</h3>
              <p>{lesson.description}</p>
            </div>
          </div>

          {/* Comments Section */}
          <div className="comments-section">
            <div className="comments-header">
              <h3>
                <FiMessageSquare /> {t('dashboard.comments')} ({comments.length})
              </h3>
            </div>

            {/* Add Comment Form */}
            <form className="add-comment-form" onSubmit={handleAddComment}>
              <img 
                src={userData?.photoURL || '/default-avatar.png'} 
                alt={userData?.displayName}
                className="comment-avatar"
              />
              <div className="comment-input-wrapper">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Izoh yozing..."
                  rows="3"
                />
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={!newComment.trim() || submittingComment}
                >
                  <FiSend /> Yuborish
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div className="comments-list">
              {comments.length === 0 ? (
                <div className="no-comments">
                  <FiMessageSquare size={48} />
                  <p>Hozircha izohlar yo'q. Birinchi izohni yozing!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="comment-item">
                    <img 
                      src={comment.authorPhoto || '/default-avatar.png'} 
                      alt={comment.authorName}
                      className="comment-avatar"
                    />
                    <div className="comment-content">
                      <div className="comment-header">
                        <span className="comment-author">{comment.authorName}</span>
                        <span className={`comment-role ${comment.authorRole}`}>
                          {comment.authorRole === 'teacher' ? 'O\'qituvchi' : 'Talaba'}
                        </span>
                        <span className="comment-time">{formatRelativeTime(comment.createdAt)}</span>
                      </div>
                      <p className="comment-text">{comment.content}</p>
                      
                      {(comment.authorId === userData?.uid || isOwner) && (
                        <button 
                          className="delete-comment-btn"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <FiTrash2 /> O'chirish
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lesson-sidebar">
          {/* Resources */}
          <div className="sidebar-card">
            <div className="sidebar-card-header">
              <h3><FiFile /> Qo'shimcha resurslar</h3>
              {isOwner && (
                <button className="add-btn" onClick={() => setShowResourceModal(true)}>
                  <FiPlus />
                </button>
              )}
            </div>
            
            <div className="resources-list">
              {(!lesson.resources || lesson.resources.length === 0) ? (
                <div className="no-resources">
                  <p>Resurslar yo'q</p>
                </div>
              ) : (
                lesson.resources.map((resource, index) => (
                  <a 
                    key={index} 
                    href={resource.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="resource-item"
                  >
                    <FiFile />
                    <div className="resource-info">
                      <span className="resource-title">{resource.title}</span>
                      <span className="resource-type">{resource.fileName}</span>
                    </div>
                    <FiDownload />
                  </a>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Video Upload Modal */}
      <Modal
        isOpen={showVideoUploadModal}
        onClose={() => setShowVideoUploadModal(false)}
        title="Video yuklash"
        size="large"
      >
        <VideoUploader
          lessonId={id}
          onUploadComplete={handleVideoUploadComplete}
          currentVideoURL={lesson?.videoURL}
        />
        
        <div className="video-url-divider">
          <span>yoki</span>
        </div>
        
        <div className="video-url-section">
          <h4>YouTube/Vimeo havolasi</h4>
          <div className="form-group">
            <input
              type="url"
              className="form-input"
              placeholder="https://youtube.com/watch?v=..."
              value={editData.videoURL || ''}
              onChange={(e) => setEditData({ ...editData, videoURL: e.target.value, videoType: 'link' })}
            />
          </div>
          <button 
            className="btn btn-secondary"
            onClick={async () => {
              if (editData.videoURL) {
                const result = await lessonService.updateLesson(id, { 
                  videoURL: editData.videoURL, 
                  videoType: 'link' 
                });
                if (result.success) {
                  toast.success('Video havolasi saqlandi');
                  setShowVideoUploadModal(false);
                  loadLesson();
                }
              }
            }}
          >
            Havolani saqlash
          </button>
        </div>
      </Modal>

      {/* Add Resource Modal */}
      <Modal
        isOpen={showResourceModal}
        onClose={() => setShowResourceModal(false)}
        title="Resurs qo'shish"
      >
        <form onSubmit={handleUploadResource}>
          <div className="form-group">
            <label className="form-label">Resurs nomi *</label>
            <input
              type="text"
              className="form-input"
              value={resourceData.title}
              onChange={(e) => setResourceData({ ...resourceData, title: e.target.value })}
              placeholder="Masalan: Ma'ruza slaydlari"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Fayl tanlash *</label>
            <input
              type="file"
              className="form-input"
              onChange={(e) => setResourceData({ ...resourceData, file: e.target.files[0] })}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
              required
            />
            <p className="form-help">PDF, Word, PowerPoint, Excel fayllari</p>
          </div>

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
              </div>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowResourceModal(false)}>
              Bekor qilish
            </button>
            <button type="submit" className="btn btn-primary" disabled={uploadProgress > 0 && uploadProgress < 100}>
              Yuklash
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Lesson Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Darsni tahrirlash"
        size="large"
      >
        <form onSubmit={handleUpdateLesson}>
          <div className="form-group">
            <label className="form-label">Dars nomi *</label>
            <input
              type="text"
              className="form-input"
              value={editData.title || ''}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tavsif *</label>
            <textarea
              className="form-textarea"
              value={editData.description || ''}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              rows="4"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Fan</label>
              <select
                className="form-select"
                value={editData.subject || ''}
                onChange={(e) => setEditData({ ...editData, subject: e.target.value })}
              >
                <option value="Matematika">Matematika</option>
                <option value="Fizika">Fizika</option>
                <option value="Kimyo">Kimyo</option>
                <option value="Biologiya">Biologiya</option>
                <option value="Informatika">Informatika</option>
                <option value="Tarix">Tarix</option>
                <option value="Adabiyot">Adabiyot</option>
                <option value="Ingliz tili">Ingliz tili</option>
                <option value="Boshqa">Boshqa</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Davomiyligi (daqiqa)</label>
              <input
                type="number"
                className="form-input"
                value={editData.duration || ''}
                onChange={(e) => setEditData({ ...editData, duration: e.target.value })}
                min="1"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
              Bekor qilish
            </button>
            <button type="submit" className="btn btn-primary">
              Saqlash
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setConfirmAction(null);
          setConfirmMessage('');
          setDeleteCommentId(null);
        }}
        onConfirm={() => {
          if (confirmAction) {
            confirmAction();
          }
        }}
        title="Tasdiqlash"
        message={confirmMessage}
        confirmText="Ha"
        cancelText="Yo'q"
        type="danger"
      />
    </div>
  );
};

export default LessonDetail;
