import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { courseService } from '../services/courseService';
import { FiPlus, FiBook, FiUsers, FiClock, FiEdit, FiTrash2, FiEye, FiMoreVertical } from 'react-icons/fi';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import ConfirmModal from '../components/common/ConfirmModal';
import { toast } from 'react-toastify';
import './Courses.css';

const MyCourses = () => {
  const { userData, isTeacher, isStudent } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Informatika',
    startDate: '',
    endDate: ''
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [deleteCourseId, setDeleteCourseId] = useState(null);

  useEffect(() => {
    loadCourses();
  }, [userData]);

  const loadCourses = async () => {
    setLoading(true);
    try {
      if (isTeacher || isStudent) {
        // Barcha kurslarni yuklash (talabalar kabi o'qituvchilar uchun ham)
        const result = await courseService.getAllCourses();
        if (result.success) {
          setCourses(result.data);
        }
      }
    } catch (error) {
      console.error('Load courses error:', error);
      toast.error('Kurslarni yuklashda xatolik');
    }
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description) {
      toast.error('Barcha maydonlarni to\'ldiring');
      return;
    }

    // Optimistic create - add temp course to UI
    const newCourse = {
      id: 'temp_' + Date.now(),
      ...formData,
      instructorId: userData.uid,
      instructorName: userData.displayName,
      thumbnailURL: '/default-course.jpg',
      modules: []
    };
    setCourses([newCourse, ...courses]);
    setShowCreateModal(false);
    setFormData({ title: '', description: '', category: 'Informatika', startDate: '', endDate: '' });

    const result = await courseService.createCourse(newCourse);

    if (result.success) {
      toast.success('Kurs muvaffaqiyatli yaratildi!');
    } else {
      // Remove temp course if failed
      setCourses(courses);
      toast.error('Kurs yaratishda xatolik');
    }
  };

  const handleDelete = (courseId) => {
    setDeleteCourseId(courseId);
    setConfirmAction(() => async () => {
      // Optimistic delete - remove from UI immediately
      const deletedCourse = courses.find(c => c.id === courseId);
      setCourses(courses.filter(c => c.id !== courseId));
      setShowConfirmModal(false);

      const result = await courseService.deleteCourse(courseId);
      if (result.success) {
        toast.success('Kurs o\'chirildi');
      } else {
        // Restore if failed
        if (deletedCourse) {
          setCourses([deletedCourse, ...courses]);
        }
        loadCourses();
        toast.error('Kurs o\'chirishda xatolik');
      }
    });
    setShowConfirmModal(true);
  };

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

  return (
    <div className="courses-page">
      <div className="page-header">
        <div>
          <h1>Mening kurslarim</h1>
          <p>{isTeacher ? 'Barcha kurslar' : 'Siz yozilgan kurslar'}</p>
        </div>
        {isTeacher && (
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <FiPlus /> Yangi kurs yaratish
          </button>
        )}
      </div>

      {courses.length === 0 ? (
        <div className="empty-state-large">
          <FiBook size={64} />
          <h2>{isTeacher ? 'Hech qanday kurs yo\'q' : 'Hech qanday kursga yozilmagansiz'}</h2>
          <p>
            {isTeacher ? 
              'Yangi kurs yaratish uchun yuqoridagi tugmani bosing' :
              'Kurslarni ko\'rish sahifasiga o\'ting va kursga yoziling'
            }
          </p>
          {isStudent && (
            <Link to="/explore-courses" className="btn btn-primary">
              Kurslarni ko'rish
            </Link>
          )}
        </div>
      ) : (
        <div className="courses-grid">
          {courses.map((course) => (
            <div key={course.id} className="course-card">
              <div className="course-thumbnail">
                <img src={course.thumbnailURL || '/default-course.jpg'} alt={course.title} />
                <div className="course-category">{course.category}</div>
              </div>
              
              <div className="course-body">
                <h3>{course.title}</h3>
                <p className="course-description">{course.description}</p>
                
                <div className="course-meta">
                  <div className="meta-item">
                    <FiUsers />
                    <span>{course.instructorName}</span>
                  </div>
                  <div className="meta-item">
                    <FiClock />
                    <span>{course.modules?.length || 0} modul</span>
                  </div>
                </div>
              </div>

              <div className="course-footer">
                <Link to={`/course/${course.id}`} className="btn btn-primary btn-sm">
                  Ochish
                </Link>
                {isTeacher && course.instructorId === userData.uid && (
                  <div className="action-menu-wrapper">
                    <button 
                      className="btn-icon-menu"
                      onClick={() => setOpenMenuId(openMenuId === course.id ? null : course.id)}
                      title="Menyoni ochish"
                    >
                      <FiMoreVertical />
                    </button>
                    {openMenuId === course.id && (
                      <div className="course-menu-dropdown">
                        <button className="course-menu-item">
                          <FiEdit /> Tahrirlash
                        </button>
                        <button 
                          className="course-menu-item course-menu-item-danger"
                          onClick={() => {
                            setOpenMenuId(null);
                            handleDelete(course.id);
                          }}
                        >
                          <FiTrash2 /> O'chirish
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Course Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Yangi kurs yaratish"
        size="large"
      >
        <form onSubmit={handleCreate} className="course-form">
          <div className="form-group">
            <label className="form-label">Kurs nomi *</label>
            <input
              type="text"
              className="form-input"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Masalan: React.js asoslari"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tavsif *</label>
            <textarea
              className="form-textarea"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Kurs haqida qisqacha ma'lumot..."
              rows="4"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Kategoriya</label>
              <select
                className="form-select"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option>Informatika</option>
                <option>Matematika</option>
                <option>Fizika</option>
                <option>Kimyo</option>
                <option>Biologiya</option>
                <option>Tarix</option>
                <option>Adabiyot</option>
                <option>Tillar</option>
                <option>Iqtisodiyot</option>
                <option>Huquq</option>
                <option>Boshqa</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Boshlanish sanasi</label>
              <input
                type="date"
                className="form-input"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Tugash sanasi</label>
            <input
              type="date"
              className="form-input"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
              Bekor qilish
            </button>
            <button type="submit" className="btn btn-primary">
              Yaratish
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
          setDeleteCourseId(null);
        }}
        onConfirm={() => {
          if (confirmAction) {
            confirmAction();
          }
        }}
        title="Tasdiqlash"
        message="Kursni o'chirmoqchimisiz?"
        confirmText="Ha, o'chirish"
        cancelText="Bekor qilish"
        type="danger"
      />
    </div>
  );
};

export default MyCourses;

