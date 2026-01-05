import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { courseService } from '../services/courseService';
import ReactPlayer from 'react-player';
import { toast } from 'react-toastify';
import { formatRelativeTime } from '../utils/helpers';
import { 
  FiBook, 
  FiUsers, 
  FiClock, 
  FiPlay,
  FiFile,
  FiCheckCircle,
  FiPlus,
  FiArrowLeft,
  FiEdit,
  FiTrash2,
  FiEye,
  FiMessageSquare,
  FiSend,
  FiTrash2 as FiTrash
} from 'react-icons/fi';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import ConfirmModal from '../components/common/ConfirmModal';
import './CourseDetail.css';

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData, isTeacher, isStudent } = useAuth();
  const { t } = useTranslation();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [deleteLessonData, setDeleteLessonData] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deleteCommentId, setDeleteCommentId] = useState(null);
  const [videoError, setVideoError] = useState(null);

  useEffect(() => {
    loadCourse();
    loadComments();
  }, [id]);

  const loadCourse = async () => {
    setLoading(true);
    const result = await courseService.getCourse(id);
    if (result.success) {
      setCourse({ ...result.data, id });
    }
    setLoading(false);
  };

  const handleViewIncrement = async () => {
    if (!id) return;
    
    try {
      await courseService.incrementCourseViews(id);
      loadCourse(); // Kurs ma'lumotlarini yangilash
    } catch (error) {
      console.error('Increment views error:', error);
    }
  };

  const handleVideoModalOpen = (lesson) => {
    setSelectedLesson(lesson);
    setShowVideoModal(true);
    setVideoError(null); // Error state ni tozalash
  };

  const loadComments = async () => {
    if (!id) return;
    const result = await courseService.getComments(id);
    if (result.success) {
      setComments(result.data);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !id) return;

    setSubmittingComment(true);
    const result = await courseService.addComment(id, {
      content: newComment,
      authorId: userData.uid,
      authorName: userData.displayName,
      authorPhoto: userData.photoURL,
      authorRole: userData.role
    });

    if (result.success) {
      setNewComment('');
      loadComments();
      loadCourse(); // Kurs ma'lumotlarini yangilash (commentsCount uchun)
      toast.success('Izoh qo\'shildi');
    } else {
      toast.error('Izoh qo\'shishda xatolik');
    }
    setSubmittingComment(false);
  };

  const handleDeleteComment = (commentId) => {
    setDeleteCommentId(commentId);
    setConfirmAction(() => async () => {
      const result = await courseService.deleteComment(id, commentId);
      if (result.success) {
        loadComments();
        loadCourse(); // Kurs ma'lumotlarini yangilash
        toast.success('Izoh o\'chirildi');
      } else {
        toast.error('Izoh o\'chirishda xatolik');
      }
    });
    setShowConfirmModal(true);
  };

  const getTotalLessons = (course) => {
    if (!course.modules || course.modules.length === 0) return 0;
    return course.modules.reduce((total, module) => {
      return total + (module.lessons?.length || 0);
    }, 0);
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!course) {
    return (
      <div className="empty-state-large">
        <h2>Kurs topilmadi</h2>
        <Link to="/my-courses" className="btn btn-primary">
          Kurslar sahifasiga qaytish
        </Link>
      </div>
    );
  }

  const isInstructor = course.instructorId === userData.uid;

  return (
    <div className="course-detail">
      {/* Course Header */}
      <div className="course-header-section">
        {course.thumbnailURL && (
          <div className="course-thumbnail-header">
            <img src={course.thumbnailURL} alt={course.title} />
          </div>
        )}
        <div className="course-header-content">
          <button 
            className="back-btn"
            onClick={() => navigate('/my-courses')}
          >
            <FiArrowLeft /> {t('common.back')}
          </button>
          <div className="breadcrumb">
            <Link to="/my-courses">Kurslar</Link>
            <span>/</span>
            <span>{course.title}</span>
          </div>
          
          <h1>{course.title}</h1>
          <p className="course-description-full">{course.description}</p>
          
          <div className="course-info-grid">
            <div className="info-item">
              <FiUsers className="info-icon" />
              <div>
                <span className="info-label">O'qituvchi</span>
                <span className="info-value">{course.instructorName}</span>
              </div>
            </div>
            
            <div className="info-item">
              <FiEye className="info-icon" />
              <div>
                <span className="info-label">{t('dashboard.totalViews')}</span>
                <span className="info-value">{course.views || 0}</span>
              </div>
            </div>
            
            <div className="info-item">
              <FiBook className="info-icon" />
              <div>
                <span className="info-label">{t('dashboard.totalLessons')}</span>
                <span className="info-value">{getTotalLessons(course)}</span>
              </div>
            </div>
            
            <div className="info-item">
              <FiClock className="info-icon" />
              <div>
                <span className="info-label">Kategoriya</span>
                <span className="info-value">{course.category}</span>
              </div>
            </div>
          </div>

          {isInstructor && (
            <div className="instructor-actions">
              <button className="btn btn-primary" onClick={() => navigate(`/my-lessons?courseId=${course.id}&addLesson=true`)}>
                <FiPlus /> Dars qo'shish
              </button>
            </div>
          )}
          
        </div>
      </div>

      {/* Course Content - Darslar ro'yxati */}
      <div className="course-content-section">
        <div className="content-header">
          <h2>{t('dashboard.totalLessons')}</h2>
          <span className="modules-count">
            {getTotalLessons(course)} dars
          </span>
        </div>

        {getTotalLessons(course) === 0 ? (
          <div className="empty-modules">
            <FiBook size={48} />
            <p>Hozircha darslar qo'shilmagan</p>
          </div>
        ) : (
          <div className="lessons-grid">
            {course.modules?.map((module, moduleIndex) => 
              module.lessons?.map((lesson, lessonIndex) => (
                <div 
                  key={`${moduleIndex}-${lessonIndex}`}
                  className="lesson-card"
                  onClick={async () => {
                    if (lesson.videoURL) {
                      setVideoError(null); // Error state ni tozalash
                      setSelectedLesson(lesson);
                      setShowVideoModal(true);
                      await handleViewIncrement(); // Ko'rishlar sonini oshirish
                    } else {
                      toast.info('Bu dars uchun video hali yuklanmagan');
                    }
                  }}
                  style={{ cursor: lesson.videoURL ? 'pointer' : 'default' }}
                >
                  <div className="lesson-thumbnail-wrapper">
                    {lesson.thumbnailURL ? (
                      <img 
                        src={lesson.thumbnailURL} 
                        alt={lesson.title}
                        className="lesson-thumbnail-img"
                      />
                    ) : (
                      <div className="lesson-thumbnail-placeholder">
                        <FiPlay size={24} />
                      </div>
                    )}
                    {lesson.duration && (
                      <div className="lesson-duration-badge">
                        <FiClock size={12} /> {lesson.duration} daqiqa
                      </div>
                    )}
                    <div className="lesson-play-overlay">
                      <FiPlay size={20} />
                    </div>
                  </div>
                  <div className="lesson-card-body">
                    <h4 className="lesson-card-title">{lesson.title}</h4>
                    {lesson.description && (
                      <p className="lesson-card-description">{lesson.description}</p>
                    )}
                    {isInstructor && (
                      <div className="lesson-card-actions">
                        <button
                          className="btn-icon-small"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/my-lessons?editLesson=${course.id}&moduleIndex=${moduleIndex}&lessonIndex=${lessonIndex}`);
                          }}
                          title="Tahrirlash"
                        >
                          <FiEdit size={14} />
                        </button>
                        <button
                          className="btn-icon-small btn-danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteLessonData({ moduleIndex, lessonIndex, lesson });
                            setConfirmAction(() => async () => {
                              const moduleId = course.modules?.[moduleIndex]?.moduleId;
                              if (moduleId && lesson.lessonId) {
                                const result = await courseService.deleteLessonFromModule(
                                  course.id,
                                  moduleId,
                                  lesson.lessonId
                                );
                                if (result.success) {
                                  toast.success('Dars o\'chirildi');
                                  loadCourse();
                                } else {
                                  toast.error('Dars o\'chirishda xatolik');
                                }
                              }
                            });
                            setShowConfirmModal(true);
                          }}
                          title={t('common.delete')}
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Comments Section */}
      <div className="course-comments-section">
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
              className="comment-input"
              rows="3"
            />
            <button 
              type="submit" 
              className="btn btn-primary btn-sm"
              disabled={submittingComment || !newComment.trim()}
            >
              <FiSend /> {submittingComment ? t('common.loading') : t('common.submit')}
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
              <div key={comment.id} className="comment-item telegram-style">
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
                  <div className="comment-bubble">
                    <p className="comment-text">{comment.content}</p>
                  </div>
                  {(comment.authorId === userData?.uid || isInstructor) && (
                    <button 
                      className="delete-comment-btn"
                      onClick={() => handleDeleteComment(comment.id)}
                      title="O'chirish"
                    >
                      <FiTrash size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Video Player Modal */}
      <Modal
        isOpen={showVideoModal}
        onClose={() => {
          setShowVideoModal(false);
          setSelectedLesson(null);
          setVideoError(null); // Error state ni tozalash
        }}
        title={selectedLesson?.title || 'Video dars'}
        size="large"
      >
        {selectedLesson && (
          <div className="video-modal-content">
            {selectedLesson.videoURL ? (
              selectedLesson.videoType === 'uploaded' ? (
                <video
                  controls
                  width="100%"
                  style={{ maxHeight: '70vh' }}
                  src={selectedLesson.videoURL}
                  className="course-video-player"
                  onError={() => setVideoError('Video yuklashda xatolik')}
                >
                  Brauzeringiz video tegini qo'llab-quvvatlamaydi.
                </video>
              ) : videoError ? (
                <div className="video-error-message" style={{
                  padding: '40px',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '8px',
                  border: '1px solid var(--border)'
                }}>
                  <h3 style={{ color: 'var(--error)', marginBottom: '16px' }}>Video ko'rsatib bo'lmadi</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    {videoError === 150 || videoError === '150' 
                      ? 'Bu video embedding uchun ruxsat berilmagan yoki cheklangan. Video muallifi embedding ni o\'chirgan bo\'lishi mumkin.'
                      : 'Video yuklashda xatolik yuz berdi. Iltimos, keyinroq urinib ko\'ring.'}
                  </p>
                </div>
              ) : (
                <ReactPlayer
                  url={selectedLesson.videoURL}
                  width="100%"
                  height="70vh"
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
              <div className="no-video-message">
                <p>Video topilmadi</p>
              </div>
            )}
            {selectedLesson.description && (
              <div className="lesson-description-full">
                <h4>Tavsif</h4>
                <p>{selectedLesson.description}</p>
              </div>
            )}
            {selectedLesson.attachedFiles && selectedLesson.attachedFiles.length > 0 && (
              <div className="lesson-attached-files">
                <h4><FiFile /> Qo'shimcha fayllar</h4>
                <div className="attached-files-list">
                  {selectedLesson.attachedFiles.map((file, index) => (
                    <a
                      key={index}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="attached-file-item"
                      download
                    >
                      <div className="file-info-row">
                        <FiFile className="file-icon" />
                        <span className="file-name">{file.name}</span>
                        {file.size && (
                          <span className="file-size">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        )}
                        <FiFile className="download-icon" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setConfirmAction(null);
          setDeleteLessonData(null);
          setDeleteCommentId(null);
        }}
        onConfirm={() => {
          if (confirmAction) {
            confirmAction();
          }
        }}
        title="Tasdiqlash"
        message="Darsni o'chirmoqchimisiz?"
        confirmText="Ha, o'chirish"
        cancelText="Bekor qilish"
        type="danger"
      />
    </div>
  );
};

export default CourseDetail;

