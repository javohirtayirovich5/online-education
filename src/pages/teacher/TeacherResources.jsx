import React, { useState, useEffect } from 'react';
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
  FiChevronDown,
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
  const [editingResource, setEditingResource] = useState(null);
  const [showResourceMenu, setShowResourceMenu] = useState(null);
  
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
  const [expandedTeachers, setExpandedTeachers] = useState({});
  
  // Modal form selection states (separate from main page)
  const [modalSelectedGroup, setModalSelectedGroup] = useState(null);
  const [modalSelectedSubject, setModalSelectedSubject] = useState(null);
  const [modalSubjects, setModalSubjects] = useState([]);
  
  // Collection modal form subjects
  const [collectionModalSubjects, setCollectionModalSubjects] = useState([]);

  useEffect(() => {
    loadGroups();
  }, [userData]);

  useEffect(() => {
    if (activeTab === 'resources') {
      // Resources tab'da - barcha resurslarni yuklash (guruh/fan filterlashsiz)
      loadResources();
    } else if (activeTab === 'collections') {
      // Collections tab'da - barcha o'qituvchilarning to'plamlarini yuklash
      loadCollections();
    }
  }, [activeTab]);

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
    setLoadingResources(true);
    try {
      const result = await resourceService.getAllResources();
      if (result.success) {
        const sorted = result.data.sort((a, b) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return aTime - bTime;
        });
        setResources(sorted);
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

    // Tahrirlash uchun fayl ixtiyoriy, yangi resurs uchun zarur
    if (!editingResource && !formData.file) {
      toast.error('Fayl tanlang');
      return;
    }

    if (!modalSelectedGroup || !modalSelectedSubject) {
      toast.error('Guruh va fanni tanlang');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      if (editingResource) {
        // Tahrirlash
        const updates = {
          title: formData.title,
          lessonType: formData.lessonType,
          groupId: modalSelectedGroup?.id === 'global' ? null : modalSelectedGroup?.id,
          groupName: modalSelectedGroup?.id === 'global' ? '' : modalSelectedGroup?.name,
          subjectId: modalSelectedSubject.id,
          subjectName: modalSelectedSubject.name,
          isGlobal: modalSelectedGroup?.id === 'global'
        };

        const result = await resourceService.updateResource(
          editingResource.id,
          updates,
          formData.file || null,
          (progress) => setUploadProgress(progress)
        );

        if (result.success) {
          toast.success('Resurs yangilandi');
          setShowAddModal(false);
          setEditingResource(null);
          setFormData({ title: '', lessonType: 'ma\'ruza', file: null });
          setUploadProgress(0);
          setModalSelectedGroup(null);
          setModalSelectedSubject(null);
          setModalSubjects([]);
          loadResources();
        } else {
          toast.error(result.error || 'Resurs yangilashda xatolik');
        }
      } else {
        // Yangi resurs qo'shish
        const result = await resourceService.addResource(
          {
            groupId: modalSelectedGroup?.id === 'global' ? null : modalSelectedGroup?.id,
            groupName: modalSelectedGroup?.id === 'global' ? '' : modalSelectedGroup?.name,
            subjectId: modalSelectedSubject.id,
            subjectName: modalSelectedSubject.name,
            teacherId: currentUser.uid,
            teacherName: userData.displayName || '',
            title: formData.title,
            lessonType: formData.lessonType,
            isGlobal: modalSelectedGroup?.id === 'global'
          },
          formData.file,
          (progress) => setUploadProgress(progress)
        );

        if (result.success) {
          toast.success('Resurs qo\'shildi');
          setShowAddModal(false);
          setFormData({ title: '', lessonType: 'ma\'ruza', file: null });
          setUploadProgress(0);
          setModalSelectedGroup(null);
          setModalSelectedSubject(null);
          setModalSubjects([]);
          loadResources();
        } else {
          toast.error(result.error || 'Resurs qo\'shishda xatolik');
        }
      }
    } catch (error) {
      console.error('Add/Update resource error:', error);
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

  const handleEditResource = (resource) => {
    setEditingResource(resource);
    setShowResourceMenu(null);
    
    // Tahrirlash uchun modal'ni ochish
    setFormData({
      title: resource.title,
      lessonType: resource.lessonType,
      file: null
    });
    
    // Guruh va fanni auto-select qilish
    const currentGroup = groups.find(g => g.id === resource.groupId || (resource.isGlobal && g.id === 'global'));
    if (currentGroup || resource.isGlobal) {
      const group = resource.isGlobal ? { id: 'global', name: 'Barcha guruhlar' } : currentGroup;
      setModalSelectedGroup(group);
      
      // Fanni topish
      if (group?.subjectTeachers) {
        const subject = group.subjectTeachers.find(st => st.subjectId === resource.subjectId);
        if (subject) {
          setModalSelectedSubject({ id: subject.subjectId, name: subject.subjectName });
        }
      }
    }
    
    setShowAddModal(true);
  };

  // Collection methods
  const loadCollections = async () => {
    setLoadingCollections(true);
    try {
      // Barcha o'qituvchilarning to'plamlarini yuklash (filtersi yo'q)
      const result = await collectionService.getAllCollections();
      if (result.success) {
        // Eng eski bo'yicha (o'suvchi tartib)
        const sorted = result.data.sort((a, b) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return aTime - bTime;
        });
        setCollections(sorted);
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
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getCollectionsByTeacher = () => {
    const grouped = {};
    collections.forEach(collection => {
      const teacherName = collection.teacherName || 'Noma\'lum o\'qituvchi';
      if (!grouped[teacherName]) {
        grouped[teacherName] = [];
      }
      grouped[teacherName].push(collection);
    });
    
    // O'z to'plamlarini birinchi, keyin qolganlarni alifbo tartibida
    const entries = Object.entries(grouped);
    return entries.sort((a, b) => {
      const aIsCurrentUser = collections.some(c => c.teacherName === a[0] && c.teacherId === currentUser.uid);
      const bIsCurrentUser = collections.some(c => c.teacherName === b[0] && c.teacherId === currentUser.uid);
      
      if (aIsCurrentUser && !bIsCurrentUser) return -1;
      if (!aIsCurrentUser && bIsCurrentUser) return 1;
      return a[0].localeCompare(b[0]);
    });
  };

  const getResourcesByTeacher = () => {
    const grouped = {};
    resources.forEach(resource => {
      const teacherName = resource.teacherName || 'Noma\'lum o\'qituvchi';
      if (!grouped[teacherName]) {
        grouped[teacherName] = [];
      }
      grouped[teacherName].push(resource);
    });
    
    // O'z resurslarini birinchi, keyin qolganlarni alifbo tartibida
    const entries = Object.entries(grouped);
    return entries.sort((a, b) => {
      const aIsCurrentUser = resources.some(r => r.teacherName === a[0] && r.teacherId === currentUser.uid);
      const bIsCurrentUser = resources.some(r => r.teacherName === b[0] && r.teacherId === currentUser.uid);
      
      if (aIsCurrentUser && !bIsCurrentUser) return -1;
      if (!aIsCurrentUser && bIsCurrentUser) return 1;
      return a[0].localeCompare(b[0]);
    });
  };

  const toggleTeacherExpand = (teacherName) => {
    setExpandedTeachers(prev => ({
      ...prev,
      [teacherName]: !prev[teacherName]
    }));
  };

  const loadModalSubjects = (groupId) => {
    if (!userData?.subjectIds) {
      setModalSubjects([]);
      return [];
    }

    const teacherSubjectIds = userData.subjectIds || [];
    const uniqueSubjects = [];
    const seenSubjects = new Set();

    // Tanlangan gruruddagi fanlarni olish
    const sourceGroups =
      groupId === 'global'
        ? groups
        : groups.filter(g => g.id === groupId);

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

    setModalSubjects(uniqueSubjects);
    return uniqueSubjects;
  };

  const handleModalGroupChange = (groupId) => {
    if (groupId) {
      const group = groupId === 'global' 
        ? { id: 'global', name: 'Barcha guruhlar' }
        : groups.find(g => g.id === groupId);
      setModalSelectedGroup(group || null);
      setModalSelectedSubject(null);
      
      // Fanlarni yuklash
      const subjects = loadModalSubjects(groupId);
      
      // Agar bitta fan bo'lsa avtomatik tanlash
      if (subjects.length === 1) {
        setModalSelectedSubject(subjects[0]);
      }
    }
  };

  const loadCollectionModalSubjects = (groupId) => {
    if (!userData?.subjectIds) {
      setCollectionModalSubjects([]);
      return [];
    }

    const teacherSubjectIds = userData.subjectIds || [];
    const uniqueSubjects = [];
    const seenSubjects = new Set();

    // Tanlangan gruruddagi fanlarni olish
    const sourceGroups =
      groupId === 'global'
        ? groups
        : groups.filter(g => g.id === groupId);

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

    setCollectionModalSubjects(uniqueSubjects);
    return uniqueSubjects;
  };

  const handleCollectionModalGroupChange = (groupId) => {
    if (groupId) {
      const subjectsForGroup = loadCollectionModalSubjects(groupId);
      
      // Agar bitta fan bo'lsa avtomatik tanlash
      if (subjectsForGroup.length === 1) {
        setCollectionFormData(prev => ({
          ...prev,
          selectedGroupId: groupId,
          selectedSubjectId: subjectsForGroup[0].id
        }));
      } else {
        setCollectionFormData(prev => ({
          ...prev,
          selectedGroupId: groupId,
          selectedSubjectId: null
        }));
      }
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
          {/* Barcha resurslar - filtersiz */}
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingResource(null);
              setFormData({ title: '', lessonType: 'ma\'ruza', file: null });
              setModalSelectedGroup(null);
              setModalSelectedSubject(null);
              setModalSubjects([]);
              setShowAddModal(true);
            }}
            style={{ marginBottom: '20px' }}
          >
            <FiPlus /> {t('teacher.resources.newResource')}
          </button>

          <div className="resources-table-container">
            {loadingResources ? (
              <LoadingSpinner />
            ) : resources.length === 0 ? (
              <div className="empty-state">
                <FiFile size={48} />
                <p>{t('teacher.resources.noResources')}</p>
              </div>
            ) : (
              <table className="resources-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t('teacher.resources.title')}</th>
                    <th>{t('teacher.resources.lessonType')}</th>
                    <th>{t('teacher.resources.staff')}</th>
                    <th>{t('grades.subject')}</th>
                    <th>{t('teacher.attendance.group')}</th>
                    <th>{t('lessons.createdAt')}</th>
                    <th style={{ width: '50px', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {getResourcesByTeacher().map(([teacherName, teacherResources]) => {
                    const isExpanded = expandedTeachers[teacherName] !== false; // Default true
                    return (
                    <React.Fragment key={teacherName}>
                      {/* O'qituvchi sarlavhasi */}
                      <tr 
                        className="teacher-header-row" 
                        onClick={() => toggleTeacherExpand(teacherName)}
                      >
                        <td colSpan="9" className="teacher-header-cell">
                          <FiChevronDown 
                            size={20}
                            className={`collapse-icon ${isExpanded ? 'expanded' : ''}`}
                            style={{ marginRight: '10px', display: 'inline' }}
                          />
                          <strong>{teacherName}</strong> ({teacherResources.length})
                        </td>
                      </tr>
                      {/* O'qituvchining resurslari - Collapsable */}
                      {isExpanded && teacherResources.map((resource, index) => (
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
                          <td>{resource.subjectName || '-'}</td>
                          <td>{resource.groupName || 'Global'}</td>
                          <td>{formatDate(resource.createdAt)}</td>
                          <td style={{ textAlign: 'center', position: 'relative' }}>
                            {resource.teacherId === currentUser.uid && (
                              <>
                                <button
                                  className="btn-menu"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowResourceMenu(showResourceMenu === resource.id ? null : resource.id);
                                  }}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '18px',
                                    color: '#666',
                                    padding: '4px 8px'
                                  }}
                                >
                                  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                                </button>
                                {showResourceMenu === resource.id && (
                                  <div className="resource-menu" style={{
                                    position: 'absolute',
                                    top: '100%',
                                    right: 0,
                                    backgroundColor: 'white',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    zIndex: 1000,
                                    minWidth: '120px'
                                  }}>
                                    <button
                                      onClick={() => handleEditResource(resource)}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        fontSize: '14px',
                                        color: '#333',
                                        borderBottom: '1px solid #eee'
                                      }}
                                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                    >
                                      <FiEdit2 size={16} /> Tahrirlash
                                    </button>
                                    <button
                                      onClick={() => {
                                        handleDeleteResource(resource.id);
                                        setShowResourceMenu(null);
                                      }}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        fontSize: '14px',
                                        color: '#d9534f'
                                      }}
                                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                    >
                                      <FiTrash2 size={16} /> O'chirish
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Collections Tab */}
      {activeTab === 'collections' && (
        <>
          {/* Yangi to'plam tugmasi */}
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingCollection(null);
              setCollectionFormData({
                title: '',
                description: '',
                previewImage: null,
                selectedGroupId: null,
                selectedSubjectId: null
              });
              setShowAddCollectionModal(true);
            }}
            style={{ marginBottom: '20px' }}
          >
            <FiPlus /> Yangi to'plam yaratish
          </button>

          {loadingCollections ? (
            <LoadingSpinner />
          ) : collections.length === 0 ? (
            <div className="empty-state">
              <FiBookOpen size={48} />
              <p>To'plamlari yo'q</p>
            </div>
          ) : (
            <div className="collections-table-container">
              <table className="collections-table">
                <thead>
                  <tr>
                    <th colSpan="6">To'plamlar</th>
                  </tr>
                </thead>
                <tbody>
                  {getCollectionsByTeacher().map(([teacherName, teacherCollections]) => {
                    const isExpanded = expandedTeachers[teacherName] !== false; // Default true
                    return (
                    <React.Fragment key={teacherName}>
                      {/* O'qituvchi sarlavhasi */}
                      <tr 
                        className="teacher-header-row" 
                        onClick={() => toggleTeacherExpand(teacherName)}
                      >
                        <td colSpan="6" className="teacher-header-cell">
                          <FiChevronDown 
                            size={20}
                            className={`collapse-icon ${isExpanded ? 'expanded' : ''}`}
                            style={{ marginRight: '10px', display: 'inline' }}
                          />
                          <strong>{teacherName}</strong> ({teacherCollections.length})
                        </td>
                      </tr>
                      {/* O'qituvchining to'plamlari - Collapsable */}
                      {isExpanded && teacherCollections.map((collection) => (
                        <tr key={collection.id} className="collection-row">
                          <td colSpan="6" className="collection-cell">
                            <CollectionCard
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
                              isOwner={collection.teacherId === currentUser.uid}
                            />
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Add Resource Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingResource(null);
          setFormData({ title: '', lessonType: 'ma\'ruza', file: null });
          setUploadProgress(0);
          setModalSelectedGroup(null);
          setModalSelectedSubject(null);
          setModalSubjects([]);
        }}
        title={editingResource ? "Resursni tahrirlash" : "Yangi resurs qo'shish"}
      >
        <div className="modal-form">
          <div className="form-group">
            <label className="form-label">{t('teacher.attendance.group')} <span className="required">*</span></label>
            <select
              className="form-input"
              value={modalSelectedGroup?.id || ''}
              onChange={(e) => handleModalGroupChange(e.target.value)}
            >
              <option value="">Guruh tanlang</option>
              <option value="global">{t('tests.forAll')}</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.year}-kurs)
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{t('grades.subject')} <span className="required">*</span></label>
            <select
              className="form-input"
              value={modalSelectedSubject?.id || ''}
              onChange={(e) => {
                const subject = modalSubjects.find(s => s.id === e.target.value);
                setModalSelectedSubject(subject);
              }}
              disabled={!modalSelectedGroup}
            >
              <option value="">Fan tanlang</option>
              {modalSubjects.map(subject => (
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
            <label className="form-label">Fayl {!editingResource && <span className="required">*</span>}</label>
            {editingResource && <small style={{ color: '#666' }}>(Ixtiyoriy - yangi fayl yuklash uchun)</small>}
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
              disabled={uploading || !formData.title.trim() || (!editingResource && !formData.file) || !modalSelectedGroup || !modalSelectedSubject}
            >
              {uploading 
                ? (editingResource ? 'Yangilash jarayonida...' : 'Yuklanmoqda...')
                : (editingResource ? 'Saqlash' : 'Qo\'shish')}
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
              onChange={(e) => handleCollectionModalGroupChange(e.target.value)}
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
              {collectionModalSubjects.map(subject => (
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