import { useState, useEffect } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { resourceService } from '../../services/resourceService';
import { collectionService } from '../../services/collectionService';
import { subjectService } from '../../services/subjectService';
import { 
  FiDownload,
  FiEdit2,
  FiTrash2,
  FiMoreVertical
} from 'react-icons/fi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import ConfirmModal from '../../components/common/ConfirmModal';
import CollectionCard from '../../components/common/CollectionCard';
import { toast } from 'react-toastify';
import { formatDate } from '../../utils/helpers';
import '../teacher/TeacherResources.css';

const AdminResources = () => {
  const { t } = useTranslation();
  const [allResources, setAllResources] = useState([]);
  const [filteredResources, setFilteredResources] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [teachers, setTeachers] = useState([]);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('resources'); // 'resources' or 'collections'
  
  // Collections states
  const [collections, setCollections] = useState([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [collectionsPermissionDenied, setCollectionsPermissionDenied] = useState(false);
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [editingResource, setEditingResource] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'resources') {
      filterResources();
    } else {
      loadCollections();
    }
  }, [searchQuery, selectedTeacher, selectedSubject, allResources, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Barcha resurslarni olish
      const resourcesResult = await resourceService.getAllResources();
      
      if (resourcesResult.success) {
        setAllResources(resourcesResult.data);
        
        // Yagona o'qituvchilarni ajratib olish
        const uniqueTeachers = [...new Set(
          resourcesResult.data
            .map(r => r.teacherId)
            .filter(Boolean)
        )].map(teacherId => {
          const resource = resourcesResult.data.find(r => r.teacherId === teacherId);
          return {
            id: teacherId,
            name: resource?.teacherName || 'Noma\'lum o\'qituvchi'
          };
        }).sort((a, b) => a.name.localeCompare(b.name));
        
        setTeachers(uniqueTeachers);
      } else {
        setAllResources([]);
        setTeachers([]);
      }

      // Fanlarni olish
      const subjectsResult = await subjectService.getAllSubjects?.();
      if (subjectsResult?.success) {
        setSubjects(subjectsResult.data);
      }
    } catch (error) {
      console.error('Load data error:', error);
      toast.error('Ma\'lumotlarni yuklashda xatolik');
      setAllResources([]);
      setTeachers([]);
    }
    setLoading(false);
  };

  const filterResources = () => {
    let filtered = allResources;

    // Qidirish bo'yicha filterlash
    if (searchQuery) {
      filtered = filtered.filter(resource =>
        resource.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.teacherName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // O'qituvchi bo'yicha filterlash
    if (selectedTeacher) {
      filtered = filtered.filter(resource => resource.teacherId === selectedTeacher);
    }

    // Fan bo'yicha filterlash
    if (selectedSubject) {
      filtered = filtered.filter(resource => resource.subjectId === selectedSubject);
    }

    setFilteredResources(filtered);
  };

  const loadCollections = async () => {
    setLoadingCollections(true);
    try {
      const result = await collectionService.getAllCollections?.() || { success: false, data: [] };
      if (result.success) {
        setCollections(result.data);
        setCollectionsPermissionDenied(false);
      } else {
        setCollections([]);
        // detect permission denied and present clearer UI
        if (result.code === 'permission-denied' || /permission/i.test(result.error || '')) {
          setCollectionsPermissionDenied(true);
          toast.error('Collections: insufficient permissions to read data (Firestore rules).');
        } else {
          setCollectionsPermissionDenied(false);
        }
      }
    } catch (error) {
      console.error('Load collections error:', error);
      toast.error('To\'plamlarni yuklashda xatolik');
      setCollections([]);
    }
    setLoadingCollections(false);
  };

  const handleDeleteCollection = async (collectionId) => {
    try {
      const result = await collectionService.deleteCollection(collectionId);
      if (result.success) {
        toast.success('To\'plam o\'chirildi');
        loadCollections();
      } else {
        toast.error('O\'chirishda xatolik');
      }
    } catch (error) {
      console.error('Delete collection error:', error);
      toast.error('O\'chirishda xatolik yuz berdi');
    }
  };

  const handleEditResource = async (resourceData) => {
    try {
      const result = await resourceService.updateResource(
        editingResource.id,
        {
          title: resourceData.title,
          lessonType: resourceData.lessonType
        }
      );

      if (result.success) {
        toast.success('Resurs muvaffaqiyatli o\'zgartirildi');
        setShowEditModal(false);
        setEditingResource(null);
        loadData();
      }
    } catch (error) {
      console.error('Update resource error:', error);
      toast.error('Resursni o\'zgartirishda xatolik');
    }
  };

  const handleDeleteResource = async () => {
    try {
      const result = await resourceService.deleteResource(selectedResource.id);

      if (result.success) {
        toast.success('Resurs muvaffaqiyatli o\'chirildi');
        setShowDeleteConfirm(false);
        setSelectedResource(null);
        loadData();
      }
    } catch (error) {
      console.error('Delete resource error:', error);
      toast.error('Resursni o\'chirishda xatolik');
    }
  };

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.name || 'Noma\'lum fan';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="resources-container admin-resources">
      <div className="resources-header">
        <h1>{t('sidebar.Resources') || 'Resources'}</h1>
      </div>

      {/* Tabs */}
      <div className="resources-tabs">
        <button
          className={`tab-btn ${activeTab === 'resources' ? 'active' : ''}`}
          onClick={() => setActiveTab('resources')}
        >
          {t('sidebar.Resources') || 'Resurslar'}
        </button>
        <button
          className={`tab-btn ${activeTab === 'collections' ? 'active' : ''}`}
          onClick={() => setActiveTab('collections')}
        >
          {t('student.resources.collections') || 'To\'plamlar'}
        </button>
      </div>

      {activeTab === 'resources' && (
        <>
          {/* Filter Bar - Resources */}
      <div className="resources-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder={t('common.search') || 'Qidirish...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <select
            value={selectedTeacher || ''}
            onChange={(e) => setSelectedTeacher(e.target.value || null)}
            className="search-input"
          >
            <option value="">Barcha o'qituvchilar</option>
            {teachers.map(teacher => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <select
            value={selectedSubject || ''}
            onChange={(e) => setSelectedSubject(e.target.value || null)}
            className="search-input"
          >
            <option value="">Barcha fanlar</option>
            {subjects.map(subject => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Resources List */}
      {filteredResources.length === 0 ? (
        <div className="empty-state">
          <p>{t('teacher.resources.noResources') || 'Resurslar topilmadi'}</p>
        </div>
      ) : (
        <div className="resources-grid">
          {filteredResources.map(resource => (
            <div key={resource.id} className="resource-card admin-resource-card">
              <div className="resource-header">
                <div className="resource-title-section">
                  <h3>{resource.title}</h3>
                  <p className="resource-meta">
                    {getSubjectName(resource.subjectId)} • {resource.lessonType}
                  </p>
                  {resource.teacherName && (
                    <p className="resource-teacher">
                      {t('common.teacher') || 'O\'qituvchi'}: <strong>{resource.teacherName}</strong>
                    </p>
                  )}
                </div>
                <div className="resource-actions">
                  <div className="action-menu-container">
                    <button
                      className="btn btn-sm btn-icon"
                      onClick={() => setOpenDropdownId(openDropdownId === resource.id ? null : resource.id)}
                      title="Qo'shimcha amallar"
                    >
                      <FiMoreVertical />
                    </button>
                    {openDropdownId === resource.id && (
                      <div className="action-dropdown-menu">
                        {resource.fileUrl && (
                          <a
                            href={resource.fileUrl}
                            download={resource.fileName}
                            className="dropdown-menu-item"
                          >
                            <FiDownload /> {t('common.download') || 'Yuklash'}
                          </a>
                        )}
                        <button
                          className="dropdown-menu-item"
                          onClick={() => {
                            setEditingResource(resource);
                            setShowEditModal(true);
                            setOpenDropdownId(null);
                          }}
                        >
                          <FiEdit2 /> {t('common.edit') || 'Tahrirlash'}
                        </button>
                        <button
                          className="dropdown-menu-item dropdown-menu-danger"
                          onClick={() => {
                            setSelectedResource(resource);
                            setShowDeleteConfirm(true);
                            setOpenDropdownId(null);
                          }}
                        >
                          <FiTrash2 /> {t('common.delete') || 'O\'chirish'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="resource-info">
                <div className="info-row">
                  <span className="label">{t('lessons.createdAt') || 'Yaratilgan'}:</span>
                  <span className="value">{formatDate(resource.createdAt)}</span>
                </div>
                {resource.fileName && (
                  <div className="info-row">
                    <span className="label">{t('assignments.file') || 'Fayl'}:</span>
                    <span className="value">
                      {resource.fileName} ({formatFileSize(resource.fileSize)})
                    </span>
                  </div>
                )}
                {resource.groupName && (
                  <div className="info-row">
                    <span className="label">{t('common.group') || 'Guruh'}:</span>
                    <span className="value">{resource.groupName}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
        </>
      )}

      {activeTab === 'collections' && (
        <>
          {loadingCollections ? (
            <LoadingSpinner />
          ) : collectionsPermissionDenied ? (
            <div className="empty-state">
              <p style={{ color: 'var(--text-secondary)' }}>
                {t('admin.resources.permissionDenied') || 'Insufficient permissions to read collections. Check Firestore rules or sign in with an admin account.'}
              </p>
              <p style={{ marginTop: 8 }}>
                <small>
                  {t('admin.resources.permissionDeniedHelp') || 'If you manage Firestore rules, ensure resourceCollections is readable by admin users. See Firebase console for details.'}
                </small>
              </p>
            </div>
          ) : collections.length === 0 ? (
            <div className="empty-state">
              <p>{t('teacher.resources.noResources') || 'To\'plamlar topilmadi'}</p>
            </div>
          ) : (
            <div className="collections-grid">
              {collections.map(collection => (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  onDelete={() => handleDeleteCollection(collection.id)}
                  isAdmin={true}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Edit Resource Modal */}
      {editingResource && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingResource(null);
          }}
          title={t('common.edit') || 'Tahrirlash'}
          size="medium"
        >
          <form onSubmit={(e) => {
            e.preventDefault();
            handleEditResource({
              title: editingResource.title,
              lessonType: editingResource.lessonType
            });
          }}>
            <div className="form-group">
              <label>{t('teacher.resources.title') || 'Nomi'}</label>
              <input
                type="text"
                value={editingResource.title}
                onChange={(e) => setEditingResource({
                  ...editingResource,
                  title: e.target.value
                })}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label>{t('teacher.resources.lessonType') || 'Dars turi'}</label>
              <select
                value={editingResource.lessonType || 'ma\'ruza'}
                onChange={(e) => setEditingResource({
                  ...editingResource,
                  lessonType: e.target.value
                })}
                className="form-input"
              >
                <option value="ma'ruza">Ma'ruza</option>
                <option value="amaliy">Amaliy</option>
                <option value="seminar">Seminar</option>
                <option value="laboratoriya">Laboratoriya</option>
              </select>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {t('common.save') || 'Saqlash'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingResource(null);
                }}
              >
                {t('common.cancel') || 'Bekor qilish'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title={t('common.delete') || 'O\'chirish'}
        message={`"${selectedResource?.title}" resursni o\'chirishni tasdiqlaysizmi?`}
        onConfirm={handleDeleteResource}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedResource(null);
        }}
        confirmText={t('common.delete') || 'O\'chirish'}
        cancelText={t('common.cancel') || 'Bekor qilish'}
        isDangerous
      />
    </div>
  );
};

export default AdminResources;
