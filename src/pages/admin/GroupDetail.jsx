import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  FiArrowLeft,
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiX,
  FiUser,
  FiMapPin,
  FiCalendar,
  FiUsers
} from 'react-icons/fi';
import { groupService } from '../../services/groupService';
import { subjectService } from '../../services/subjectService';
import Modal from '../../components/common/Modal';
import ConfirmModal from '../../components/common/ConfirmModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import './GroupDetail.css';

// Hafta kunlari
const WEEK_DAYS = [
  { id: 1, name: 'Dushanba', short: 'Du' },
  { id: 2, name: 'Seshanba', short: 'Se' },
  { id: 3, name: 'Chorshanba', short: 'Ch' },
  { id: 4, name: 'Payshanba', short: 'Pa' },
  { id: 5, name: 'Juma', short: 'Ju' },
  { id: 6, name: 'Shanba', short: 'Sh' }
];

const GroupDetail = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState(null);
  const [subjects, setSubjects] = useState([]);
  
  // Modal states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [assignFormData, setAssignFormData] = useState({ 
    subjectId: '', 
    teacherId: '',
    scheduleDays: [],
    lessonType: '',
    location: ''
  });
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [removeData, setRemoveData] = useState(null);

  useEffect(() => {
    if (groupId) {
      loadGroupData();
    }
  }, [groupId]);

  const loadGroupData = async () => {
    setLoading(true);
    try {
      const [groupResult, subjectsResult] = await Promise.all([
        groupService.getGroupById(groupId),
        subjectService.getAllSubjects()
      ]);

      if (groupResult.success) {
        setGroup(groupResult.data);
      } else {
        toast.error('Guruh topilmadi');
        navigate('/structure');
      }

      if (subjectsResult.success) {
        setSubjects(subjectsResult.data);
      }
    } catch (error) {
      console.error('Load group data error:', error);
      toast.error('Ma\'lumotlarni yuklashda xatolik');
    }
    setLoading(false);
  };

  // Fan tanlanganda o'qituvchilarni yuklash
  const handleSubjectChange = async (subjectId) => {
    setAssignFormData({ ...assignFormData, subjectId, teacherId: '' });
    
    if (subjectId) {
      setLoadingTeachers(true);
      const result = await groupService.getTeachersBySubject(subjectId);
      if (result.success) {
        setAvailableTeachers(result.data);
      } else {
        setAvailableTeachers([]);
      }
      setLoadingTeachers(false);
    } else {
      setAvailableTeachers([]);
    }
  };

  // Hafta kunini tanlash/o'chirish
  const toggleScheduleDay = (dayId) => {
    setAssignFormData(prev => ({
      ...prev,
      scheduleDays: prev.scheduleDays.includes(dayId)
        ? prev.scheduleDays.filter(d => d !== dayId)
        : [...prev.scheduleDays, dayId].sort((a, b) => a - b)
    }));
  };

  // Fan va o'qituvchini guruhga biriktirish
  const handleAssignTeacher = async () => {
    if (!assignFormData.subjectId || !assignFormData.teacherId) {
      toast.error('Fan va o\'qituvchini tanlang');
      return;
    }

    if (assignFormData.scheduleDays.length === 0) {
      toast.error('Kamida bitta dars kunini tanlang');
      return;
    }

    if (!assignFormData.lessonType) {
      toast.error('Dars turini tanlang');
      return;
    }

    if (!assignFormData.location) {
      toast.error('Dars joyini kiriting');
      return;
    }

    setSaving(true);
    
    const subject = subjects.find(s => s.id === assignFormData.subjectId);
    const teacher = availableTeachers.find(t => t.id === assignFormData.teacherId);

    const result = await groupService.assignSubjectTeacher(groupId, {
      subjectId: assignFormData.subjectId,
      subjectName: subject?.name || '',
      teacherId: assignFormData.teacherId,
      teacherName: teacher?.displayName || '',
      scheduleDays: assignFormData.scheduleDays,
      lessonType: assignFormData.lessonType,
      location: assignFormData.location
    });

    if (result.success) {
      toast.success('O\'qituvchi biriktirildi');
      setShowAssignModal(false);
      setAssignFormData({ 
        subjectId: '', 
        teacherId: '', 
        scheduleDays: [],
        lessonType: '',
        location: ''
      });
      loadGroupData();
    } else {
      toast.error(result.error || 'Xatolik yuz berdi');
    }
    setSaving(false);
  };

  // Fanni tahrirlash uchun modal ochish
  const openEditModal = async (subjectTeacher) => {
    setEditingSubject(subjectTeacher);
    setAssignFormData({
      subjectId: subjectTeacher.subjectId,
      teacherId: subjectTeacher.teacherId,
      scheduleDays: subjectTeacher.scheduleDays || [],
      lessonType: subjectTeacher.lessonType || '',
      location: subjectTeacher.location || ''
    });
    
    // O'qituvchilarni yuklash
    if (subjectTeacher.subjectId) {
      setLoadingTeachers(true);
      const result = await groupService.getTeachersBySubject(subjectTeacher.subjectId);
      if (result.success) {
        setAvailableTeachers(result.data);
      } else {
        setAvailableTeachers([]);
      }
      setLoadingTeachers(false);
    }
    
    setShowEditModal(true);
  };

  // Fanni yangilash
  const handleUpdateSubjectTeacher = async () => {
    if (!assignFormData.subjectId || !assignFormData.teacherId) {
      toast.error('Fan va o\'qituvchini tanlang');
      return;
    }

    if (assignFormData.scheduleDays.length === 0) {
      toast.error('Kamida bitta dars kunini tanlang');
      return;
    }

    if (!assignFormData.lessonType) {
      toast.error('Dars turini tanlang');
      return;
    }

    if (!assignFormData.location) {
      toast.error('Dars joyini kiriting');
      return;
    }

    setSaving(true);
    
    const subject = subjects.find(s => s.id === assignFormData.subjectId);
    const teacher = availableTeachers.find(t => t.id === assignFormData.teacherId);

    // Avval eski birikmani olib tashlash
    const removeResult = await groupService.removeSubjectTeacher(
      groupId, 
      editingSubject.subjectId, 
      editingSubject.teacherId, 
      editingSubject.lessonType
    );

    if (!removeResult.success) {
      toast.error('Eski birikmani olib tashlashda xatolik');
      setSaving(false);
      return;
    }

    // Yangi birikmani qo'shish
    const result = await groupService.assignSubjectTeacher(groupId, {
      subjectId: assignFormData.subjectId,
      subjectName: subject?.name || '',
      teacherId: assignFormData.teacherId,
      teacherName: teacher?.displayName || '',
      scheduleDays: assignFormData.scheduleDays,
      lessonType: assignFormData.lessonType,
      location: assignFormData.location
    });

    if (result.success) {
      toast.success('Fan yangilandi');
      setShowEditModal(false);
      setEditingSubject(null);
      setAssignFormData({ 
        subjectId: '', 
        teacherId: '', 
        scheduleDays: [],
        lessonType: '',
        location: ''
      });
      loadGroupData();
    } else {
      toast.error(result.error || 'Xatolik yuz berdi');
    }
    setSaving(false);
  };

  // Guruhdan fan-o'qituvchi birikmasini olib tashlash
  const handleRemoveSubjectTeacher = (subjectId, teacherId, lessonType, e) => {
    if (e) {
      e.stopPropagation(); // Click eventni to'xtatish
    }
    setRemoveData({ subjectId, teacherId, lessonType });
    setConfirmAction(() => async () => {
      const result = await groupService.removeSubjectTeacher(groupId, subjectId, teacherId, lessonType);
      if (result.success) {
        toast.success('Olib tashlandi');
        loadGroupData();
      } else {
        toast.error(result.error || 'Xatolik yuz berdi');
      }
    });
    setShowConfirmModal(true);
  };

  // Dars turi nomini olish
  const getLessonTypeName = (type) => {
    switch (type) {
      case 'ma\'ruza':
        return 'Ma\'ruza';
      case 'amaliyot':
        return 'Amaliy';
      case 'laboratoriya':
        return 'Laboratoriya';
      default:
        return type;
    }
  };

  // Dars turi rangini olish
  const getLessonTypeColor = (type) => {
    switch (type) {
      case 'ma\'ruza':
        return '#3b82f6';
      case 'amaliyot':
        return '#10b981';
      case 'laboratoriya':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
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

  if (!group) {
    return null;
  }

  return (
    <div className="group-detail-page">
      {/* Header */}
      <div className="group-detail-header">
        <button 
          className="back-btn"
          onClick={() => navigate('/structure')}
        >
          <FiArrowLeft /> Orqaga
        </button>
        <div className="header-content">
          <div className="group-info">
            <h1>{group.name}</h1>
            <div className="group-meta">
              <span className="meta-item">
                <FiUsers /> {group.students?.length || 0} ta talaba
              </span>
              <span className="meta-item">
                {group.year}-kurs
              </span>
            </div>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => setShowAssignModal(true)}
          >
            <FiPlus /> Fan biriktirish
          </button>
        </div>
      </div>

      {/* Biriktirilgan fanlar */}
      <div className="group-detail-section">
        <h2>Biriktirilgan fanlar</h2>
        {group.subjectTeachers && group.subjectTeachers.length > 0 ? (
          <div className="subjects-list">
            {group.subjectTeachers.map((st, idx) => (
              <div 
                key={idx} 
                className="subject-card clickable"
                onClick={() => openEditModal(st)}
              >
                <div className="subject-header">
                  <h3 className="subject-name">{st.subjectName}</h3>
                  <button 
                    className="remove-btn"
                    onClick={(e) => handleRemoveSubjectTeacher(st.subjectId, st.teacherId, st.lessonType, e)}
                    title="Olib tashlash"
                  >
                    <FiX />
                  </button>
                </div>
                <div className="subject-details">
                  <div className="detail-item">
                    <span className="detail-label">Dars turi:</span>
                    <span 
                      className="detail-value type-badge"
                      style={{ 
                        backgroundColor: getLessonTypeColor(st.lessonType) + '20',
                        color: getLessonTypeColor(st.lessonType)
                      }}
                    >
                      {getLessonTypeName(st.lessonType)}
                    </span>
                  </div>
                  {st.location && (
                    <div className="detail-item">
                      <span className="detail-label"><FiMapPin /> Dars joyi:</span>
                      <span className="detail-value">{st.location}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <span className="detail-label"><FiUser /> O'qituvchi:</span>
                    <span className="detail-value">{st.teacherName}</span>
                  </div>
                  {st.scheduleDays && st.scheduleDays.length > 0 && (
                    <div className="detail-item">
                      <span className="detail-label"><FiCalendar /> Dars kunlari:</span>
                      <div className="schedule-days">
                        {st.scheduleDays.map(dayId => {
                          const day = WEEK_DAYS.find(d => d.id === dayId);
                          return (
                            <span key={dayId} className="day-badge">
                              {day?.short || dayId}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>Hozircha biriktirilgan fanlar yo'q</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowAssignModal(true)}
            >
              <FiPlus /> Birinchi fanni biriktirish
            </button>
          </div>
        )}
      </div>

      {/* Assign Teacher Modal */}
      <Modal 
        isOpen={showAssignModal} 
        onClose={() => {
          setShowAssignModal(false);
          setAssignFormData({ 
            subjectId: '', 
            teacherId: '', 
            scheduleDays: [],
            lessonType: '',
            location: ''
          });
        }} 
        title="Fan va o'qituvchi biriktirish"
      >
        <div className="modal-form">
          <div className="form-group">
            <label className="form-label">Fan <span className="required">*</span></label>
            <select
              className="form-select"
              value={assignFormData.subjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
            >
              <option value="">Fanni tanlang</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">O'qituvchi <span className="required">*</span></label>
            <select
              className="form-select"
              value={assignFormData.teacherId}
              onChange={(e) => setAssignFormData({ ...assignFormData, teacherId: e.target.value })}
              disabled={!assignFormData.subjectId || loadingTeachers}
            >
              <option value="">
                {loadingTeachers ? 'Yuklanmoqda...' : 'O\'qituvchini tanlang'}
              </option>
              {availableTeachers.map(t => (
                <option key={t.id} value={t.id}>{t.displayName}</option>
              ))}
            </select>
            {assignFormData.subjectId && !loadingTeachers && availableTeachers.length === 0 && (
              <small className="form-hint warning">
                Bu fanni o'qitadigan tasdiqlangan o'qituvchilar topilmadi
              </small>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Dars turi <span className="required">*</span></label>
            <select
              className="form-select"
              value={assignFormData.lessonType}
              onChange={(e) => setAssignFormData({ ...assignFormData, lessonType: e.target.value })}
            >
              <option value="">Dars turini tanlang</option>
              <option value="ma'ruza">Ma'ruza</option>
              <option value="amaliyot">Amaliyot</option>
              <option value="laboratoriya">Laboratoriya</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Dars joyi <span className="required">*</span></label>
            <input
              type="text"
              className="form-input"
              placeholder="Masalan: 319 EAF, 305 EAF"
              value={assignFormData.location}
              onChange={(e) => setAssignFormData({ ...assignFormData, location: e.target.value })}
            />
            <small className="form-hint">
              Dars o'tiladigan xona yoki auditoriya raqami
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Dars kunlari <span className="required">*</span></label>
            <div className="schedule-days-grid">
              {WEEK_DAYS.map(day => (
                <button
                  key={day.id}
                  type="button"
                  className={`schedule-day-btn ${assignFormData.scheduleDays.includes(day.id) ? 'active' : ''}`}
                  onClick={() => toggleScheduleDay(day.id)}
                >
                  <span className="day-short">{day.short}</span>
                  <span className="day-name">{day.name}</span>
                </button>
              ))}
            </div>
            <small className="form-hint">
              Dars o'tiladigan kunlarni tanlang. Bu kunlar davomat va baholar jadvalida avtomatik ko'rinadi.
            </small>
          </div>

          <div className="modal-actions">
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                setShowAssignModal(false);
                setAssignFormData({ 
                  subjectId: '', 
                  teacherId: '', 
                  scheduleDays: [],
                  lessonType: '',
                  location: ''
                });
              }}
              disabled={saving}
            >
              Bekor qilish
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleAssignTeacher}
              disabled={saving || !assignFormData.subjectId || !assignFormData.teacherId || !assignFormData.lessonType || !assignFormData.location || assignFormData.scheduleDays.length === 0}
            >
              {saving ? 'Biriktirilmoqda...' : 'Biriktirish'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Subject Teacher Modal */}
      <Modal 
        isOpen={showEditModal} 
        onClose={() => {
          setShowEditModal(false);
          setEditingSubject(null);
          setAssignFormData({ 
            subjectId: '', 
            teacherId: '', 
            scheduleDays: [],
            lessonType: '',
            location: ''
          });
        }} 
        title="Fanni tahrirlash"
      >
        <div className="modal-form">
          <div className="form-group">
            <label className="form-label">Fan <span className="required">*</span></label>
            <select
              className="form-select"
              value={assignFormData.subjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
            >
              <option value="">Fanni tanlang</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">O'qituvchi <span className="required">*</span></label>
            <select
              className="form-select"
              value={assignFormData.teacherId}
              onChange={(e) => setAssignFormData({ ...assignFormData, teacherId: e.target.value })}
              disabled={!assignFormData.subjectId || loadingTeachers}
            >
              <option value="">
                {loadingTeachers ? 'Yuklanmoqda...' : 'O\'qituvchini tanlang'}
              </option>
              {availableTeachers.map(t => (
                <option key={t.id} value={t.id}>{t.displayName}</option>
              ))}
            </select>
            {assignFormData.subjectId && !loadingTeachers && availableTeachers.length === 0 && (
              <small className="form-hint warning">
                Bu fanni o'qitadigan tasdiqlangan o'qituvchilar topilmadi
              </small>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Dars turi <span className="required">*</span></label>
            <select
              className="form-select"
              value={assignFormData.lessonType}
              onChange={(e) => setAssignFormData({ ...assignFormData, lessonType: e.target.value })}
            >
              <option value="">Dars turini tanlang</option>
              <option value="ma'ruza">Ma'ruza</option>
              <option value="amaliyot">Amaliyot</option>
              <option value="laboratoriya">Laboratoriya</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Dars joyi <span className="required">*</span></label>
            <input
              type="text"
              className="form-input"
              placeholder="Masalan: 319 EAF, 305 EAF"
              value={assignFormData.location}
              onChange={(e) => setAssignFormData({ ...assignFormData, location: e.target.value })}
            />
            <small className="form-hint">
              Dars o'tiladigan xona yoki auditoriya raqami
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Dars kunlari <span className="required">*</span></label>
            <div className="schedule-days-grid">
              {WEEK_DAYS.map(day => (
                <button
                  key={day.id}
                  type="button"
                  className={`schedule-day-btn ${assignFormData.scheduleDays.includes(day.id) ? 'active' : ''}`}
                  onClick={() => toggleScheduleDay(day.id)}
                >
                  <span className="day-short">{day.short}</span>
                  <span className="day-name">{day.name}</span>
                </button>
              ))}
            </div>
            <small className="form-hint">
              Dars o'tiladigan kunlarni tanlang. Bu kunlar davomat va baholar jadvalida avtomatik ko'rinadi.
            </small>
          </div>

          <div className="modal-actions">
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                setShowEditModal(false);
                setEditingSubject(null);
                setAssignFormData({ 
                  subjectId: '', 
                  teacherId: '', 
                  scheduleDays: [],
                  lessonType: '',
                  location: ''
                });
              }}
              disabled={saving}
            >
              Bekor qilish
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleUpdateSubjectTeacher}
              disabled={saving || !assignFormData.subjectId || !assignFormData.teacherId || !assignFormData.lessonType || !assignFormData.location || assignFormData.scheduleDays.length === 0}
            >
              {saving ? 'Yangilanmoqda...' : 'Yangilash'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setConfirmAction(null);
          setRemoveData(null);
        }}
        onConfirm={() => {
          if (confirmAction) {
            confirmAction();
          }
        }}
        title="Tasdiqlash"
        message="Rostdan ham olib tashlamoqchimisiz?"
        confirmText="Ha"
        cancelText="Yo'q"
        type="danger"
      />
    </div>
  );
};

export default GroupDetail;

