import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { groupService } from '../../services/groupService';
import { resourceService } from '../../services/resourceService';
import { collectionService } from '../../services/collectionService';
import { storageService } from '../../services/storageService';
import { toast } from 'react-toastify';
import { 
  FiPlus,
  FiUpload,
  FiFile,
  FiX,
  FiDownload,
  FiUsers,
  FiBookOpen,
  FiArrowLeft,
  FiEdit2,
  FiTrash2,
  FiImage
} from 'react-icons/fi';
import Modal from '../../components/common/Modal';
import ConfirmModal from '../../components/common/ConfirmModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import CollectionCard from '../../components/common/CollectionCard';
import CollectionDetail from '../../components/common/CollectionDetail';
import './TeacherResources.css';

const TeacherResources = () => {
  const { userData, currentUser } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingResources, setLoadingResources] = useState(false);
  
  // Tab states
  const [activeTab, setActiveTab] = useState('resources'); // 'resources' or 'collections'
  
  // Collections states
  const [collections, setCollections] = useState([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [showCollectionDetail, setShowCollectionDetail] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  
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
  
  // Collection modal states
  const [showAddCollectionModal, setShowAddCollectionModal] = useState(false);
  const [showAddFileToCollectionModal, setShowAddFileToCollectionModal] = useState(false);
  const [collectionFormData, setCollectionFormData] = useState({
    title: '',
    description: '',
    previewImage: null,
    selectedGroupId: null,
    selectedSubjectId: null
  });
  const [fileToAddData, setFileToAddData] = useState({
    name: '',
    description: '',
    file: null
  });
  const [editingFileIndex, setEditingFileIndex] = useState(null);

  useEffect(() => {
    loadGroups();
  }, [userData]);

  useEffect(() => {
    if (selectedGroup) {
      loadSubjects();
      if (activeTab === 'resources') {
        loadResources();
      } else {
        loadCollections();
      }
    }
  }, [selectedGroup, selectedSubject, activeTab]);

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
            setLoading(false);
            return;
          }
        }

        // Agar saqlangan guruh bo'lmasa, default holatda "Hamma uchun" (global) ni tanlaymiz
        setSelectedGroup({ id: 'global', name: 'Barcha guruhlar' });
      }
    } catch (error) {
      console.error('Load groups error:', error);
      toast.error('Guruhlarni yuklashda xatolik');
    }
    setLoading(false);
  };

  const loadSubjects = () => {
    if (!userData?.subjectIds) {
      setSubjects([]);
      return;
    }

    const teacherSubjectIds = userData.subjectIds || [];
    const uniqueSubjects = [];
    const seenSubjects = new Set();

    // "Barcha guruhlar" tanlanganda - barcha guruhlardagi fanlarni yig'amiz
    const sourceGroups =
      selectedGroup && selectedGroup.id === 'global'
        ? groups
        : selectedGroup
        ? [selectedGroup]
        : [];

    sourceGroups.forEach(group => {
      if (!group?.subjectTeachers) return;

      group.subjectTeachers.forEach(st => {
        if (!seenSubjects.has(st.subjectId) && teacherSubjectIds.includes(st.subjectId)) {
          seenSubjects.add(st.subjectId);
          uniqueSubjects.push({
            id: st.subjectId,
            name: st.subjectName
          });
        }
      });
    });

    setSubjects(uniqueSubjects);
  };

  const loadResources = async () => {
    if (!selectedSubject) {
      setResources([]);
      return;
    }

    setLoadingResources(true);
    try {
      // Agar "Barcha guruhlar" varianti tanlangan bo'lsa,
      // o'qituvchining shu fan bo'yicha global resurslarini ko'rsatamiz
      if (selectedGroup && selectedGroup.id === 'global') {
        const result = await resourceService.getResourcesByTeacher(currentUser.uid);
        if (result.success) {
          const filtered = result.data.filter(
            (res) => res.subjectId === selectedSubject.id && res.isGlobal
          );
          setResources(filtered);
        } else {
          setResources([]);
        }
      } else if (selectedGroup) {
        const result = await resourceService.getResourcesByGroupAndSubject(
          selectedGroup.id,
          selectedSubject.id
        );
        if (result.success) {
          setResources(result.data);
        } else {
          setResources([]);
        }
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
    // "Barcha guruhlar" varianti
    if (groupId === 'global') {
      const globalOption = { id: 'global', name: 'Barcha guruhlar' };
      setSelectedGroup(globalOption);
      setSelectedSubject(null);
      setResources([]);
      localStorage.removeItem('teacher_selected_group_id');
      return;
    }

    const group = groups.find(g => g.id === groupId);
    setSelectedGroup(group || null);
    setSelectedSubject(null);
    setResources([]);
    if (group) {
      localStorage.setItem('teacher_selected_group_id', group.id);
    } else {
      localStorage.removeItem('teacher_selected_group_id');
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

    const isGlobal = selectedGroup && selectedGroup.id === 'global';

    if (!isGlobal && (!selectedGroup || !selectedSubject)) {
      toast.error('Guruh va fanni tanlang');
      return;
    }

    if (isGlobal && !selectedSubject) {
      toast.error('Fanni tanlang');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const result = await resourceService.addResource(
        {
          groupId: isGlobal ? null : selectedGroup.id,
          groupName: isGlobal ? '' : selectedGroup.name,
          subjectId: selectedSubject.id,
          subjectName: selectedSubject.name,
          teacherId: currentUser.uid,
          teacherName: userData.displayName || '',
          title: formData.title,
          lessonType: formData.lessonType,
          isGlobal
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

  // Collection methods
  const loadCollections = async () => {
    setLoadingCollections(true);
    try {
      const result = await collectionService.getCollectionsByTeacher(currentUser.uid);
      if (result.success) {
        setCollections(result.data);
      } else {
        setCollections([]);
      }
    } catch (error) {
      console.error('Load collections error:', error);
      toast.error('To\'plamlarni yuklashda xatolik');
    }
    setLoadingCollections(false);
  };

  const handleSaveCollection = async () => {
    if (!collectionFormData.title.trim()) {
      toast.error('To\'plam sarlavhasini kiriting');
      return;
    }

    // Guruh va fan talab qilinadi
    if (!collectionFormData.selectedGroupId || !collectionFormData.selectedSubjectId) {
      toast.error('Guruh va fanni tanlang');
      return;
    }

    setUploading(true);
    try {
      if (editingCollection) {
        // Mavjud to'plamni tahrirlash
        const selectedGroupForUpdate = groups.find(g => g.id === collectionFormData.selectedGroupId);
        const selectedSubjectForUpdate = subjects.find(s => s.id === collectionFormData.selectedSubjectId);
        
        const updates = {
          title: collectionFormData.title,
          description: collectionFormData.description,
          groupId: collectionFormData.selectedGroupId === 'global' ? null : collectionFormData.selectedGroupId,
          groupName: collectionFormData.selectedGroupId === 'global' ? '' : selectedGroupForUpdate?.name || '',
          subjectId: collectionFormData.selectedSubjectId,
          subjectName: selectedSubjectForUpdate?.name || ''
        };

        const result = await collectionService.updateCollection(
          editingCollection.id,
          updates,
          collectionFormData.previewImage
        );

        if (result.success) {
          toast.success('To\'plam yangilandi');
          setShowAddCollectionModal(false);
          setEditingCollection(null);
          setCollectionFormData({
            title: '',
            description: '',
            previewImage: null,
            selectedGroupId: null,
            selectedSubjectId: null
          });
          loadCollections();
        } else {
          toast.error(result.error || 'To\'plamni yangilashda xatolik');
        }
      } else {
        // Yangi to'plam yaratish
        const selectedGroupForCreate = groups.find(g => g.id === collectionFormData.selectedGroupId);
        const selectedSubjectForCreate = subjects.find(s => s.id === collectionFormData.selectedSubjectId);
        
        const result = await collectionService.createCollection(
          {
            teacherId: currentUser.uid,
            teacherName: userData.displayName || '',
            title: collectionFormData.title,
            description: collectionFormData.description,
            groupId: collectionFormData.selectedGroupId === 'global' ? null : collectionFormData.selectedGroupId,
            groupName: collectionFormData.selectedGroupId === 'global' ? '' : selectedGroupForCreate?.name,
            subjectId: collectionFormData.selectedSubjectId,
            subjectName: selectedSubjectForCreate?.name
          },
          collectionFormData.previewImage
        );

        if (result.success) {
          toast.success('To\'plam yaratildi');
          setShowAddCollectionModal(false);
          setCollectionFormData({
            title: '',
            description: '',
            previewImage: null,
            selectedGroupId: null,
            selectedSubjectId: null
          });
          loadCollections();
        } else {
          toast.error(result.error || 'To\'plam yaratishda xatolik');
        }
      }
    } catch (error) {
      console.error('Save collection error:', error);
      toast.error('Xatolik yuz berdi');
    }
    setUploading(false);
  };

  const handleAddFileToCollection = async () => {
    if (!fileToAddData.file) {
      toast.error('Fayl tanlang');
      return;
    }

    setUploading(true);
    try {
      // Faylni Firebase Storage'ga yuklash
      const filePath = `collection_files/${selectedCollection.id}/${Date.now()}_${fileToAddData.file.name}`;
      const uploadResult = await storageService.uploadFile(fileToAddData.file, filePath);

      if (!uploadResult.success) {
        toast.error(uploadResult.error || 'Fayl yuklashda xatolik');
        setUploading(false);
        return;
      }

      const newFile = {
        id: Date.now().toString(),
        name: fileToAddData.file.name,
        description: fileToAddData.description || fileToAddData.name,
        url: uploadResult.url,
        size: fileToAddData.file.size,
        uploadedAt: new Date().toISOString()
      };

      if (editingFileIndex !== null) {
        // Faylni yangilash
        const updatedFiles = [...selectedCollection.files];
        updatedFiles[editingFileIndex] = newFile;
        const result = await collectionService.updateCollection(
          selectedCollection.id,
          { files: updatedFiles }
        );
        if (result.success) {
          toast.success('Fayl yangilandi');
          setEditingFileIndex(null);
        }
      } else {
        // Yangi fayl qo'shish
        const result = await collectionService.addFileToCollection(
          selectedCollection.id,
          newFile
        );
        if (result.success) {
          toast.success('Fayl qo\'shildi');
        }
      }

      setShowAddFileToCollectionModal(false);
      setFileToAddData({ name: '', description: '', file: null });
      
      // Updated collection ni yuklash
      const updatedResult = await collectionService.getCollectionById(selectedCollection.id);
      if (updatedResult.success) {
        setSelectedCollection(updatedResult.data);
      }
      loadCollections();
    } catch (error) {
      console.error('Add file to collection error:', error);
      toast.error('Xatolik yuz berdi');
    }
    setUploading(false);
  };

  const handleDeleteFileFromCollection = async (file, index) => {
    setConfirmAction(() => async () => {
      try {
        const result = await collectionService.removeFileFromCollection(
          selectedCollection.id,
          file
        );

        if (result.success) {
          toast.success('Fayl o\'chirildi');
          const updatedResult = await collectionService.getCollectionById(selectedCollection.id);
          if (updatedResult.success) {
            setSelectedCollection(updatedResult.data);
          }
          loadCollections();
        } else {
          toast.error(result.error || 'Faylni o\'chirishda xatolik');
        }
      } catch (error) {
        console.error('Delete file error:', error);
        toast.error('Xatolik yuz berdi');
      }
    });
    setShowConfirmModal(true);
  };

  const handleDeleteCollection = (collectionId) => {
    setDeleteResourceId(collectionId);
    setConfirmAction(() => async () => {
      try {
        const result = await collectionService.deleteCollection(collectionId);
        if (result.success) {
          toast.success('To\'plam o\'chirildi');
          setShowCollectionDetail(false);
          setSelectedCollection(null);
          loadCollections();
        } else {
          toast.error(result.error || 'O\'chirishda xatolik');
        }
      } catch (error) {
        console.error('Delete collection error:', error);
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

      {/* Tab Navigation */}
      <div className="resources-tabs">
        <button 
          className={`tab-btn ${activeTab === 'resources' ? 'active' : ''}`}
          onClick={() => setActiveTab('resources')}
        >
          <FiFile size={18} /> Resurslar
        </button>
        <button 
          className={`tab-btn ${activeTab === 'collections' ? 'active' : ''}`}
          onClick={() => setActiveTab('collections')}
        >
          <FiBookOpen size={18} /> To'plamlar
        </button>
      </div>

      {/* Resources Tab */}
      {activeTab === 'resources' && (
        <>
          {/* Filters */}
          <div className="resources-filters">
        <div className="filter-group">
          <label>{t('teacher.attendance.group')}</label>
          <select
            className="filter-select"
            value={selectedGroup?.id || ''}
            onChange={(e) => handleGroupChange(e.target.value)}
          >
            <option value="global">{t('tests.forAll')}</option>
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
        </>
      )}

      {/* Collections Tab */}
      {activeTab === 'collections' && (
        <>
        <div className="resources-filters">
          <div className="filter-group">
            <label>{t('teacher.attendance.group')}</label>
            <select
              className="filter-select"
              value={selectedGroup?.id || ''}
              onChange={(e) => handleGroupChange(e.target.value)}
            >
              <option value="global">{t('tests.forAll')}</option>
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

          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingCollection(null);
              setCollectionFormData({
                title: '',
                description: '',
                previewImage: null,
                selectedGroupId: selectedGroup?.id || null,
                selectedSubjectId: selectedSubject?.id || null
              });
              setShowAddCollectionModal(true);
            }}
            disabled={!selectedSubject}
          >
            <FiPlus /> Yangi to'plam
          </button>
        </div>

        {loadingCollections ? (
          <LoadingSpinner />
        ) : collections.length === 0 ? (
          <div className="empty-state">
            <FiBookOpen size={48} />
            <p>To'plamlari yo'q</p>
            <button
              className="btn btn-primary"
              onClick={() => {
              setEditingCollection(null);
              setCollectionFormData({
                title: '',
                description: '',
                previewImage: null,
                selectedGroupId: selectedGroup?.id || null,
                selectedSubjectId: selectedSubject?.id || null
              });
              setShowAddCollectionModal(true);
            }}
              disabled={!selectedSubject}
            >
              <FiPlus /> Yangi to'plam yaratish
            </button>
          </div>
        ) : (
          <div className="collections-grid">
            {collections.map((collection) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                onViewDetails={() => {
                  setSelectedCollection(collection);
                  setShowCollectionDetail(true);
                }}
                onEdit={() => {
                  setEditingCollection(collection);
                  setCollectionFormData({
                    title: collection.title || '',
                    description: collection.description || '',
                    previewImage: null,
                    selectedGroupId: collection.groupId || 'global',
                    selectedSubjectId: collection.subjectId || null
                  });
                  setShowAddCollectionModal(true);
                }}
                onDelete={() => handleDeleteCollection(collection.id)}
                isOwner={true}
              />
            ))}
          </div>
        )}
        </>
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

      {/* Add Collection Modal */}
      <Modal
        isOpen={showAddCollectionModal}
        onClose={() => {
          setShowAddCollectionModal(false);
          setEditingCollection(null);
          setCollectionFormData({
            title: '',
            description: '',
            previewImage: null,
            selectedGroupId: null,
            selectedSubjectId: null
          });
        }}
        title={editingCollection ? "To'plamni tahrirlash" : "Yangi to'plam yaratish"}
      >
        <div className="modal-form">
          <div className="form-group">
            <label className="form-label">Guruh <span className="required">*</span></label>
            <select
              className="form-input"
              value={collectionFormData.selectedGroupId || ''}
              onChange={(e) => {
                setCollectionFormData({
                  ...collectionFormData,
                  selectedGroupId: e.target.value,
                  selectedSubjectId: null
                });
              }}
            >
              <option value="">Guruh tanlang</option>
              <option value="global">Barcha guruhlar</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.year}-kurs)
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Fan <span className="required">*</span></label>
            <select
              className="form-input"
              value={collectionFormData.selectedSubjectId || ''}
              onChange={(e) => {
                setCollectionFormData({
                  ...collectionFormData,
                  selectedSubjectId: e.target.value
                });
              }}
              disabled={!collectionFormData.selectedGroupId}
            >
              <option value="">Fan tanlang</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
              <label className="form-label">Sarlavha <span className="required">*</span></label>
            <input
              type="text"
              className="form-input"
              placeholder="Masalan: Python asoslari"
              value={collectionFormData.title}
              onChange={(e) => setCollectionFormData({
                ...collectionFormData,
                title: e.target.value
              })}
            />
          </div>

          <div className="form-group">
              <label className="form-label">Tavsifi</label>
            <textarea
              className="form-textarea"
              placeholder="To'plam haqida qisqacha ma'lumot"
              rows="3"
              value={collectionFormData.description}
              onChange={(e) => setCollectionFormData({
                ...collectionFormData,
                description: e.target.value
              })}
            />
          </div>

          <div className="form-group">
              <label className="form-label">Preview rasmi</label>
            <div className="file-upload-area">
              <input
                type="file"
                id="collection-image"
                className="file-input"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error('Rasm hajmi 5MB dan katta bo\'lmasligi kerak');
                      return;
                    }
                    setCollectionFormData({
                      ...collectionFormData,
                      previewImage: file
                    });
                  }
                }}
                accept=".jpg,.jpeg,.png,.gif,.webp"
              />
              <label htmlFor="collection-image" className="file-label">
                <FiImage /> Rasmi tanlang
              </label>
              {collectionFormData.previewImage && (
                <div className="file-info">
                  <FiImage />
                  <span>{collectionFormData.previewImage.name}</span>
                </div>
              )}
            </div>
            <small className="form-hint">
              JPG, PNG yoki boshqa rasm formati (maksimal 5MB)
            </small>
          </div>

          <div className="modal-actions">
            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowAddCollectionModal(false);
                setEditingCollection(null);
                setCollectionFormData({
                  title: '',
                  description: '',
                  previewImage: null,
                  selectedGroupId: null,
                  selectedSubjectId: null
                });
              }}
              disabled={uploading}
            >
              Bekor qilish
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSaveCollection}
              disabled={uploading || !collectionFormData.title.trim()}
            >
              {uploading
                ? (editingCollection ? 'Yangilanmoqda...' : 'Yaratilmoqda...')
                : (editingCollection ? 'Saqlash' : 'Yaratish')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add File to Collection Modal */}
      <Modal
        isOpen={showAddFileToCollectionModal}
        onClose={() => {
          setShowAddFileToCollectionModal(false);
          setFileToAddData({ name: '', description: '', file: null });
          setEditingFileIndex(null);
        }}
        title={editingFileIndex !== null ? 'Faylni tahrirlash' : 'Faylni qo\'shish'}
      >
        <div className="modal-form">
          <div className="form-group">
            <label className="form-label">Fayl nomi</label>
            <input
              type="text"
              className="form-input"
              placeholder="Fayl nomi (ixtiyoriy)"
              value={fileToAddData.name}
              onChange={(e) => setFileToAddData({
                ...fileToAddData,
                name: e.target.value
              })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tavsifi</label>
            <textarea
              className="form-textarea"
              placeholder="Fayl haqida qisqacha ma'lumot"
              rows="2"
              value={fileToAddData.description}
              onChange={(e) => setFileToAddData({
                ...fileToAddData,
                description: e.target.value
              })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Fayl <span className="required">*</span></label>
            <div className="file-upload-area">
              <input
                type="file"
                id="collection-file"
                className="file-input"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    if (file.size > 50 * 1024 * 1024) {
                      toast.error('Fayl hajmi 50MB dan katta bo\'lmasligi kerak');
                      return;
                    }
                    setFileToAddData({
                      ...fileToAddData,
                      file
                    });
                  }
                }}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar,.mp4,.mp3"
              />
              <label htmlFor="collection-file" className="file-label">
                <FiUpload /> Fayl tanlang
              </label>
              {fileToAddData.file && (
                <div className="file-info">
                  <FiFile />
                  <span>{fileToAddData.file.name}</span>
                  <span className="file-size">({formatFileSize(fileToAddData.file.size)})</span>
                </div>
              )}
            </div>
            <small className="form-hint">
              Har qanday fayl turi (maksimal 50MB)
            </small>
          </div>

          <div className="modal-actions">
            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowAddFileToCollectionModal(false);
                setFileToAddData({ name: '', description: '', file: null });
                setEditingFileIndex(null);
              }}
              disabled={uploading}
            >
              Bekor qilish
            </button>
            <button
              className="btn btn-primary"
              onClick={handleAddFileToCollection}
              disabled={uploading || !fileToAddData.file}
            >
              {uploading ? 'Yuklanmoqda...' : 'Qo\'shish'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Collection Detail Modal */}
      {selectedCollection && (
        <CollectionDetail
          collection={selectedCollection}
          onClose={() => {
            setShowCollectionDetail(false);
            setSelectedCollection(null);
          }}
          onAddFile={() => {
            setFileToAddData({ name: '', description: '', file: null });
            setEditingFileIndex(null);
            setShowAddFileToCollectionModal(true);
          }}
          onEditFile={(file, index) => {
            setFileToAddData({
              name: file.name,
              description: file.description,
              file: null
            });
            setEditingFileIndex(index);
            setShowAddFileToCollectionModal(true);
          }}
          onDeleteFile={(file, index) => handleDeleteFileFromCollection(file, index)}
          onDownloadFile={(file) => {
            if (file.url) {
              window.open(file.url, '_blank');
              toast.success('Yuklab olish boshlandi');
            }
          }}
          isOwner={selectedCollection.teacherId === currentUser.uid}
          isLoading={uploading}
        />
      )}
    </div>
  );
};

export default TeacherResources;