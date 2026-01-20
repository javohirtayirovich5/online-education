import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { groupService } from '../../services/groupService';
import { resourceService } from '../../services/resourceService';
import { toast } from 'react-toastify';
import { 
  FiPlus,
  FiUpload,
  FiFile,
  FiX,
  FiDownload,
  FiUsers,
  FiBookOpen,
  FiArrowLeft
} from 'react-icons/fi';
import Modal from '../../components/common/Modal';
import ConfirmModal from '../../components/common/ConfirmModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import './TeacherResources.css';

const TeacherResources = () => {
  const { userData, currentUser } = useAuth();
  const { t } = useTranslation();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingResources, setLoadingResources] = useState(false);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    lessonType: 'ma\'ruza',
    file: null
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [deleteResourceId, setDeleteResourceId] = useState(null);

  useEffect(() => {
    loadGroups();
  }, [userData]);

  useEffect(() => {
    if (selectedGroup) {
      loadSubjects();
      loadResources();
    }
  }, [selectedGroup, selectedSubject]);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const result = await groupService.getGroupsByTeacher(currentUser.uid);
      if (result.success) {
        setGroups(result.data);
        // localStorage dan tanlangan guruhni yuklash
        const savedGroupId = localStorage.getItem('teacher_selected_group_id');
        if (savedGroupId) {
          const savedGroup = result.data.find(g => g.id === savedGroupId);
          if (savedGroup) {
            setSelectedGroup(savedGroup);
          }
        }
      }
    } catch (error) {
      console.error('Load groups error:', error);
      toast.error('Guruhlarni yuklashda xatolik');
    }
    setLoading(false);
  };

  const loadSubjects = () => {
    if (selectedGroup?.subjectTeachers && userData?.subjectIds) {
      const uniqueSubjects = [];
      const seenSubjects = new Set();
      const teacherSubjectIds = userData.subjectIds || [];
      
      // Faqat o'qituvchining mutaxassislik fanlarini ko'rsatish
      selectedGroup.subjectTeachers.forEach(st => {
        if (!seenSubjects.has(st.subjectId) && teacherSubjectIds.includes(st.subjectId)) {
          seenSubjects.add(st.subjectId);
          uniqueSubjects.push({
            id: st.subjectId,
            name: st.subjectName
          });
        }
      });
      
      setSubjects(uniqueSubjects);
    } else {
      setSubjects([]);
    }
  };

  const loadResources = async () => {
    if (!selectedGroup || !selectedSubject) {
      setResources([]);
      return;
    }

    setLoadingResources(true);
    try {
      const result = await resourceService.getResourcesByGroupAndSubject(
        selectedGroup.id,
        selectedSubject.id
      );
      if (result.success) {
        setResources(result.data);
      } else {
        setResources([]);
      }
    } catch (error) {
      console.error('Load resources error:', error);
      toast.error('Resurslarni yuklashda xatolik');
    }
    setLoadingResources(false);
  };

  const handleGroupChange = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    setSelectedGroup(group);
    setSelectedSubject(null);
    setResources([]);
    if (group) {
      localStorage.setItem('teacher_selected_group_id', group.id);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Fayl hajmini tekshirish (50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast.error('Fayl hajmi 50MB dan katta bo\'lmasligi kerak');
        return;
      }
      setFormData({ ...formData, file });
    }
  };

  const handleAddResource = async () => {
    if (!formData.title.trim()) {
      toast.error('Sarlavhani kiriting');
      return;
    }

    if (!formData.file) {
      toast.error('Fayl tanlang');
      return;
    }

    if (!selectedGroup || !selectedSubject) {
      toast.error('Guruh va fanni tanlang');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const result = await resourceService.addResource(
        {
          groupId: selectedGroup.id,
          groupName: selectedGroup.name,
          subjectId: selectedSubject.id,
          subjectName: selectedSubject.name,
          teacherId: currentUser.uid,
          teacherName: userData.displayName || '',
          title: formData.title,
          lessonType: formData.lessonType
        },
        formData.file,
        (progress) => setUploadProgress(progress)
      );

      if (result.success) {
        toast.success('Resurs qo\'shildi');
        setShowAddModal(false);
        setFormData({ title: '', lessonType: 'ma\'ruza', file: null });
        setUploadProgress(0);
        loadResources();
      } else {
        toast.error(result.error || 'Resurs qo\'shishda xatolik');
      }
    } catch (error) {
      console.error('Add resource error:', error);
      toast.error('Xatolik yuz berdi');
    }
    setUploading(false);
  };

  const handleDeleteResource = (resourceId) => {
    setDeleteResourceId(resourceId);
    setConfirmAction(() => async () => {
      try {
        const result = await resourceService.deleteResource(resourceId);
        if (result.success) {
          toast.success('O\'chirildi');
          loadResources();
        } else {
          toast.error(result.error || 'O\'chirishda xatolik');
        }
      } catch (error) {
        console.error('Delete resource error:', error);
        toast.error('Xatolik yuz berdi');
      }
    });
    setShowConfirmModal(true);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
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
    <div className="teacher-resources-page">
      <button 
        className="back-btn"
        onClick={() => navigate('/dashboard')}
      >
        <FiArrowLeft /> Orqaga
      </button>
      <div className="page-header">
        <div>
          <h1>{t('teacher.resources.title')}</h1>
          <p>{t('teacher.resources.description')}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="resources-filters">
        <div className="filter-group">
          <label>{t('teacher.attendance.group')}</label>
          <select
            className="filter-select"
            value={selectedGroup?.id || ''}
            onChange={(e) => handleGroupChange(e.target.value)}
          >
            <option value="">{t('teacher.attendance.group')} {t('common.select')}</option>
            {groups.map(group => (
              <option key={group.id} value={group.id}>
                {group.name} ({group.year}-kurs)
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>{t('grades.subject')}</label>
          <select
            className="filter-select"
            value={selectedSubject?.id || ''}
            onChange={(e) => {
              const subject = subjects.find(s => s.id === e.target.value);
              setSelectedSubject(subject);
            }}
            disabled={!selectedGroup}
          >
            <option value="">{t('grades.selectSubject')}</option>
            {subjects.map(subject => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>

        {selectedGroup && selectedSubject && (
          <button
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            <FiPlus /> {t('teacher.resources.newResource')}
          </button>
        )}
      </div>

      {/* Resources Table */}
      {selectedGroup && selectedSubject ? (
        <div className="resources-table-container">
          {loadingResources ? (
            <LoadingSpinner />
          ) : resources.length === 0 ? (
            <div className="empty-state">
              <FiFile size={48} />
              <p>{t('teacher.resources.noResources')}</p>
              <button
                className="btn btn-primary"
                onClick={() => setShowAddModal(true)}
              >
                <FiPlus /> {t('teacher.resources.newResource')}
              </button>
            </div>
          ) : (
            <table className="resources-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('teacher.resources.title')}</th>
                  <th>{t('teacher.resources.lessonType')}</th>
                  <th>{t('teacher.resources.staff')}</th>
                  <th>{t('teacher.resources.files')}</th>
                  <th>{t('lessons.createdAt')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((resource, index) => (
                  <tr key={resource.id}>
                    <td>{index + 1}</td>
                    <td>
                      <a
                        href={resource.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="resource-title-link"
                        download
                      >
                        {resource.title}
                      </a>
                    </td>
                    <td>
                      <span className="lesson-type-badge">
                        {resource.lessonType === 'ma\'ruza' ? 'Ma\'ruza' : 
                         resource.lessonType === 'amaliyot' ? 'Amaliy' : 
                         resource.lessonType === 'laboratoriya' ? 'Laboratoriya' : resource.lessonType}
                      </span>
                    </td>
                    <td>{resource.teacherName}</td>
                    <td>
                      {resource.fileUrl ? (
                        <span className="file-count-badge">1</span>
                      ) : (
                        <span className="no-file">-</span>
                      )}
                    </td>
                    <td>{formatDate(resource.createdAt)}</td>
                    <td>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDeleteResource(resource.id)}
                        title={t('teacher.resources.delete')}
                      >
                        <FiX />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="empty-state">
          {/* <FiBookOpen size={48} /> */}
          <p>{t('common.noData')}</p>
        </div>
      )}

      {/* Add Resource Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setFormData({ title: '', lessonType: 'ma\'ruza', file: null });
          setUploadProgress(0);
        }}
        title="Resurs qo'shish"
      >
        <div className="modal-form">
          <div className="form-group">
            <label className="form-label">Sarlavha <span className="required">*</span></label>
            <input
              type="text"
              className="form-input"
              placeholder="Masalan: 1-Ma'ruza"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mashg'ulot turi <span className="required">*</span></label>
            <select
              className="form-select"
              value={formData.lessonType}
              onChange={(e) => setFormData({ ...formData, lessonType: e.target.value })}
            >
              <option value="ma'ruza">Ma'ruza</option>
              <option value="amaliyot">Amaliyot</option>
              <option value="laboratoriya">Laboratoriya</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Fayl <span className="required">*</span></label>
            <div className="file-upload-area">
              <input
                type="file"
                id="resource-file"
                className="file-input"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
              />
              <label htmlFor="resource-file" className="file-label">
                <FiUpload /> Fayl tanlang
              </label>
              {formData.file && (
                <div className="file-info">
                  <FiFile />
                  <span>{formData.file.name}</span>
                  <span className="file-size">({formatFileSize(formData.file.size)})</span>
                </div>
              )}
            </div>
            <small className="form-hint">
              PDF, Word, PowerPoint, Excel yoki boshqa hujjatlar (maksimal 50MB)
            </small>
          </div>

          {uploading && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <span className="progress-text">{Math.round(uploadProgress)}%</span>
            </div>
          )}

          <div className="modal-actions">
            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowAddModal(false);
                setFormData({ title: '', lessonType: 'ma\'ruza', file: null });
                setUploadProgress(0);
              }}
              disabled={uploading}
            >
              Bekor qilish
            </button>
            <button
              className="btn btn-primary"
              onClick={handleAddResource}
              disabled={uploading || !formData.title.trim() || !formData.file}
            >
              {uploading ? 'Yuklanmoqda...' : 'Qo\'shish'}
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
          setDeleteResourceId(null);
        }}
        onConfirm={() => {
          if (confirmAction) {
            confirmAction();
          }
        }}
        title="Tasdiqlash"
        message="Rostdan ham o'chirmoqchimisiz?"
        confirmText="Ha, o'chirish"
        cancelText="Bekor qilish"
        type="danger"
      />
    </div>
  );
};

export default TeacherResources;

