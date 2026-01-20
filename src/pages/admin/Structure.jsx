import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { toast } from 'react-toastify';
import { 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiSearch, 
  FiBook,
  FiGrid,
  FiUsers,
  FiBookOpen,
  FiChevronDown,
  FiChevronRight,
  FiX,
  FiUser,
  FiLink,
  FiMapPin
} from 'react-icons/fi';
import { facultyService } from '../../services/facultyService';
import { departmentService } from '../../services/departmentService';
import { groupService } from '../../services/groupService';
import { settingsService } from '../../services/settingsService';
import { subjectService } from '../../services/subjectService';
import Modal from '../../components/common/Modal';
import ConfirmModal from '../../components/common/ConfirmModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import './Structure.css';

const Structure = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('faculties');
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [semesterSettings, setSemesterSettings] = useState({
    semesterStartDate: '',
    semesterEndDate: ''
  });
  const [savingSemester, setSavingSemester] = useState(false);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  // Assign teacher modal states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [assignFormData, setAssignFormData] = useState({ 
    subjectId: '', 
    teacherId: '',
    scheduleDays: [], // Hafta kunlari
    lessonType: '', // Dars turi: ma'ruza, amaliyot, laboratoriya
    location: '' // Dars joyi: masalan, 319 EAF
  });
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  // Hafta kunlari
  const WEEK_DAYS = [
    { id: 1, name: 'Dushanba', short: 'Du' },
    { id: 2, name: 'Seshanba', short: 'Se' },
    { id: 3, name: 'Chorshanba', short: 'Ch' },
    { id: 4, name: 'Payshanba', short: 'Pa' },
    { id: 5, name: 'Juma', short: 'Ju' },
    { id: 6, name: 'Shanba', short: 'Sh' }
  ];

  // Expanded items for tree view
  const [expandedFaculties, setExpandedFaculties] = useState({});
  const [expandedDepartments, setExpandedDepartments] = useState({});
  
  // Confirm modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [facultiesRes, departmentsRes, groupsRes, subjectsRes, semesterRes] = await Promise.all([
        facultyService.getAllFaculties(),
        departmentService.getAllDepartments(),
        groupService.getAllGroups(),
        subjectService.getAllSubjects(),
        settingsService.getSemesterSettings()
      ]);

      if (facultiesRes.success) setFaculties(facultiesRes.data);
      if (departmentsRes.success) setDepartments(departmentsRes.data);
      if (groupsRes.success) setGroups(groupsRes.data);
      if (subjectsRes.success) setSubjects(subjectsRes.data);
      if (semesterRes.success && semesterRes.data) {
        setSemesterSettings(prev => ({
          ...prev,
          ...semesterRes.data
        }));
      }
    } catch (error) {
      toast.error('Ma\'lumotlarni yuklashda xatolik');
    }
    setLoading(false);
  };

  // Modal functions
  const openCreateModal = (type) => {
    setModalType(type);
    setEditingItem(null);
    setFormData(getInitialFormData(type));
    setShowModal(true);
  };

  const openEditModal = (type, item) => {
    setModalType(type);
    setEditingItem(item);
    setFormData({ ...item });
    setShowModal(true);
  };

  const getInitialFormData = (type) => {
    switch (type) {
      case 'faculty':
        return { name: '', code: '', dean: '', description: '' };
      case 'department':
        return { name: '', code: '', facultyId: '', head: '', description: '' };
      case 'group':
        return { 
          name: '', 
          departmentId: '', 
          facultyId: '', 
          year: 1, 
          semester: 1, 
          curator: ''
        };
      case 'subject':
        return { name: '' };
      default:
        return {};
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Nomni kiriting');
      return;
    }

    setSaving(true);
    let result;

    try {
      if (editingItem) {
        switch (modalType) {
          case 'faculty':
            result = await facultyService.updateFaculty(editingItem.id, formData);
            break;
          case 'department':
            result = await departmentService.updateDepartment(editingItem.id, formData);
            break;
          case 'group':
            result = await groupService.updateGroup(editingItem.id, formData);
            break;
          case 'subject':
            result = await subjectService.updateSubject(editingItem.id, formData);
            break;
        }
      } else {
        switch (modalType) {
          case 'faculty':
            result = await facultyService.createFaculty(formData);
            break;
          case 'department':
            result = await departmentService.createDepartment(formData);
            break;
          case 'group':
            result = await groupService.createGroup(formData);
            break;
          case 'subject':
            result = await subjectService.createSubject(formData);
            break;
        }
      }

      if (result.success) {
        toast.success(editingItem ? 'Yangilandi' : 'Yaratildi');
        setShowModal(false);
        loadData();
      } else {
        toast.error(result.error || 'Xatolik yuz berdi');
      }
    } catch (error) {
      toast.error('Xatolik yuz berdi');
    }
    setSaving(false);
  };

  const handleDelete = (type, id) => {
    setConfirmMessage('Rostdan ham o\'chirmoqchimisiz?');
    setConfirmAction(() => async () => {
      let result;
      switch (type) {
        case 'faculty':
          result = await facultyService.deleteFaculty(id);
          break;
        case 'department':
          result = await departmentService.deleteDepartment(id);
          break;
        case 'group':
          result = await groupService.deleteGroup(id);
          break;
        case 'subject':
          result = await subjectService.deleteSubject(id);
          break;
      }

      if (result.success) {
        toast.success('O\'chirildi');
        loadData();
      } else {
        toast.error(result.error || 'Xatolik yuz berdi');
      }
    });
    setShowConfirmModal(true);
  };

  // Assign teacher to group modal
  const openAssignModal = (group) => {
    setSelectedGroup(group);
    setAssignFormData({ 
      subjectId: '', 
      teacherId: '', 
      scheduleDays: [],
      lessonType: '',
      location: ''
    });
    setAvailableTeachers([]);
    setShowAssignModal(true);
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

    const result = await groupService.assignSubjectTeacher(selectedGroup.id, {
      subjectId: assignFormData.subjectId,
      subjectName: subject?.name || '',
      teacherId: assignFormData.teacherId,
      teacherName: teacher?.displayName || '',
      scheduleDays: assignFormData.scheduleDays, // Hafta kunlari
      lessonType: assignFormData.lessonType, // Dars turi
      location: assignFormData.location // Dars joyi
    });

    if (result.success) {
      toast.success('O\'qituvchi biriktirildi');
      setShowAssignModal(false);
      loadData();
    } else {
      toast.error(result.error || 'Xatolik yuz berdi');
    }
    setSaving(false);
  };

  // Guruhdan fan-o'qituvchi birikmasini olib tashlash
  const handleRemoveSubjectTeacher = (groupId, subjectId, teacherId, lessonType) => {
    setConfirmMessage('Rostdan ham olib tashlamoqchimisiz?');
    setConfirmAction(() => async () => {
      const result = await groupService.removeSubjectTeacher(groupId, subjectId, teacherId, lessonType);
      if (result.success) {
        toast.success('Olib tashlandi');
        loadData();
      } else {
        toast.error(result.error || 'Xatolik yuz berdi');
      }
    });
    setShowConfirmModal(true);
  };

  const toggleFaculty = (facultyId) => {
    setExpandedFaculties(prev => ({
      ...prev,
      [facultyId]: !prev[facultyId]
    }));
  };

  const toggleDepartment = (departmentId) => {
    setExpandedDepartments(prev => ({
      ...prev,
      [departmentId]: !prev[departmentId]
    }));
  };

  // Semestr sozlamalarini saqlash
  const handleSaveSemesterSettings = async () => {
    const { semesterStartDate, semesterEndDate } = semesterSettings;

    if (!semesterStartDate || !semesterEndDate) {
      toast.error('Semestr boshlanish va tugash sanalarini to\'liq kiriting');
      return;
    }

    const start = new Date(semesterStartDate);
    const end = new Date(semesterEndDate);

    if (start > end) {
      toast.error('Semestr boshlanish sanasi tugash sanasidan keyin bo\'lishi mumkin emas');
      return;
    }

    setSavingSemester(true);
    const result = await settingsService.saveSemesterSettings({
      semesterStartDate,
      semesterEndDate
    });
    setSavingSemester(false);

    if (result.success) {
      toast.success('Semestr sozlamalari saqlandi');
    } else {
      toast.error(result.error || 'Semestr sozlamalarini saqlashda xatolik');
    }
  };

  // Render modal content based on type
  const renderModalContent = () => {
    switch (modalType) {
      case 'faculty':
        return (
          <>
            <div className="form-group">
              <label className="form-label">{t('admin.structure.name')} <span className="required">*</span></label>
              <input
                type="text"
                className="form-input"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Axborot texnologiyalari fakulteti"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Kod</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="IT"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Dekan</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.dean || ''}
                  onChange={(e) => setFormData({ ...formData, dean: e.target.value })}
                  placeholder="Prof. Aliyev A.A."
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Tavsif</label>
              <textarea
                className="form-textarea"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Fakultet haqida qisqacha..."
                rows={3}
              />
            </div>
          </>
        );

      case 'department':
        return (
          <>
            <div className="form-group">
              <label className="form-label">Fakultet <span className="required">*</span></label>
              <select
                className="form-select"
                value={formData.facultyId || ''}
                onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
              >
                <option value="">Fakultetni tanlang</option>
                {faculties.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t('admin.structure.name')} <span className="required">*</span></label>
              <input
                type="text"
                className="form-input"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Dasturiy injiniring"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Kod</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="DI"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Mudiri</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.head || ''}
                  onChange={(e) => setFormData({ ...formData, head: e.target.value })}
                  placeholder="Dos. Karimov B.B."
                />
              </div>
            </div>
          </>
        );

      case 'group':
        return (
          <>
            <div className="form-group">
              <label className="form-label">Fakultet <span className="required">*</span></label>
              <select
                className="form-select"
                value={formData.facultyId || ''}
                onChange={(e) => {
                  setFormData({ ...formData, facultyId: e.target.value, departmentId: '' });
                }}
              >
                <option value="">Fakultetni tanlang</option>
                {faculties.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Yo'nalish <span className="required">*</span></label>
              <select
                className="form-select"
                value={formData.departmentId || ''}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                disabled={!formData.facultyId}
              >
                <option value="">Yo'nalishni tanlang</option>
                {departments
                  .filter(d => d.facultyId === formData.facultyId)
                  .map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Guruh nomi <span className="required">*</span></label>
              <input
                type="text"
                className="form-input"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="DI-21-01"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Kurs (yil)</label>
                <select
                  className="form-select"
                  value={formData.year || 1}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                >
                  {[1, 2, 3, 4].map(y => (
                    <option key={y} value={y}>{y}-kurs</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Semester</label>
                <select
                  className="form-select"
                  value={formData.semester || 1}
                  onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                    <option key={s} value={s}>{s}-semester</option>
                  ))}
                </select>
              </div>
            </div>
          </>
        );

      case 'subject':
        return (
          <>
            <div className="form-group">
              <label className="form-label">Fan nomi <span className="required">*</span></label>
              <input
                type="text"
                className="form-input"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Matematika"
                autoFocus
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const getModalTitle = () => {
    const action = editingItem ? t('admin.structure.edit') : t('admin.structure.add');
    switch (modalType) {
      case 'faculty': return `Fakultet ${action.toLowerCase()}`;
      case 'department': return `Yo'nalish ${action.toLowerCase()}`;
      case 'group': return `Guruh ${action.toLowerCase()}`;
      case 'subject': return `Fan ${action.toLowerCase()}`;
      default: return action;
    }
  };

  // Filter functions
  const filteredFaculties = faculties.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDepartmentsByFaculty = (facultyId) => 
    departments.filter(d => d.facultyId === facultyId);

  const getGroupsByDepartment = (departmentId) => 
    groups.filter(g => g.departmentId === departmentId);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="structure-page">
      {/* Global semester settings */}
      <div className="semester-settings-card">
        <div className="semester-settings-header">
          <div>
            <h2>Semestr sozlamalari</h2>
          </div>
        </div>
        <div className="semester-settings-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Semestr boshlanish sanasi</label>
              <input
                type="date"
                className="form-input"
                value={semesterSettings.semesterStartDate || ''}
                onChange={(e) => setSemesterSettings({ 
                  ...semesterSettings, 
                  semesterStartDate: e.target.value 
                })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Semestr tugash sanasi</label>
              <input
                type="date"
                className="form-input"
                value={semesterSettings.semesterEndDate || ''}
                onChange={(e) => setSemesterSettings({ 
                  ...semesterSettings, 
                  semesterEndDate: e.target.value 
                })}
              />
            </div>
          </div>
          <div className="semester-actions">
            <button 
              className="btn btn-primary"
              onClick={handleSaveSemesterSettings}
              disabled={savingSemester}
            >
              {savingSemester ? 'Saqlanmoqda...' : 'Semestrni saqlash'}
            </button>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <h1>Universitet tuzilmasi</h1>
          <p>Fakultetlar, yo'nalishlar, guruhlar va fanlarni boshqaring</p>
        </div>
      </div>



      {/* Tabs */}
      <div className="structure-tabs">
        <button 
          className={`tab-btn ${activeTab === 'faculties' ? 'active' : ''}`}
          onClick={() => setActiveTab('faculties')}
        >
          <FiBook /> {t('admin.structure.faculties')} ({faculties.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'tree' ? 'active' : ''}`}
          onClick={() => setActiveTab('tree')}
        >
          <FiGrid /> Tuzilma daraxti
        </button>
        <button 
          className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          <FiUsers /> {t('admin.structure.groups')} ({groups.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'subjects' ? 'active' : ''}`}
          onClick={() => setActiveTab('subjects')}
        >
          <FiBookOpen /> {t('admin.structure.subjects')} ({subjects.length})
        </button>
      </div>

      {/* Search and Actions */}
      <div className="structure-toolbar">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Qidirish..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="toolbar-actions">
          {activeTab === 'faculties' && (
            <button className="btn btn-primary" onClick={() => openCreateModal('faculty')}>
              <FiPlus /> Fakultet
            </button>
          )}
          {activeTab === 'tree' && (
            <>
              <button className="btn btn-secondary" onClick={() => openCreateModal('department')}>
                <FiPlus /> Yo'nalish
              </button>
              <button className="btn btn-primary" onClick={() => openCreateModal('faculty')}>
                <FiPlus /> Fakultet
              </button>
            </>
          )}
          {activeTab === 'groups' && (
            <button className="btn btn-primary" onClick={() => openCreateModal('group')}>
              <FiPlus /> Guruh
            </button>
          )}
          {activeTab === 'subjects' && (
            <button className="btn btn-primary" onClick={() => openCreateModal('subject')}>
              <FiPlus /> Fan
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="structure-content">
        {/* Faculties Tab */}
        {activeTab === 'faculties' && (
          <div className="cards-grid">
            {filteredFaculties.map(faculty => (
              <div key={faculty.id} className="structure-card faculty-card">
                <div className="card-header">
                  <div className="card-icon faculty">
                    <FiBook />
                  </div>
                  <div className="card-actions">
                    <button 
                      className="action-btn edit"
                      onClick={() => openEditModal('faculty', faculty)}
                    >
                      <FiEdit2 />
                    </button>
                    <button 
                      className="action-btn delete"
                      onClick={() => handleDelete('faculty', faculty.id)}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
                <h3 className="card-title">{faculty.name}</h3>
                {faculty.code && <span className="card-code">{faculty.code}</span>}
                {faculty.dean && <p className="card-meta">Dekan: {faculty.dean}</p>}
                <div className="card-stats">
                  <span>{getDepartmentsByFaculty(faculty.id).length} yo'nalish</span>
                </div>
              </div>
            ))}
            {filteredFaculties.length === 0 && (
              <div className="empty-state">
                <FiBook size={48} />
                <p>Fakultetlar topilmadi</p>
                <button className="btn btn-primary" onClick={() => openCreateModal('faculty')}>
                  <FiPlus /> Fakultet yaratish
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tree View Tab */}
        {activeTab === 'tree' && (
          <div className="tree-view">
            {filteredFaculties.map(faculty => (
              <div key={faculty.id} className="tree-node faculty-node">
                <div 
                  className="tree-node-header"
                  onClick={() => toggleFaculty(faculty.id)}
                >
                  <span className="tree-toggle">
                    {expandedFaculties[faculty.id] ? <FiChevronDown /> : <FiChevronRight />}
                  </span>
                  <span className="tree-icon faculty"><FiBook /></span>
                  <span className="tree-name">{faculty.name}</span>
                  <span className="tree-badge">{getDepartmentsByFaculty(faculty.id).length}</span>
                  <div className="tree-actions">
                    <button onClick={(e) => { e.stopPropagation(); openEditModal('faculty', faculty); }}>
                      <FiEdit2 />
                    </button>
                  </div>
                </div>
                
                {expandedFaculties[faculty.id] && (
                  <div className="tree-children">
                    {getDepartmentsByFaculty(faculty.id).map(dept => (
                      <div key={dept.id} className="tree-node department-node">
                        <div 
                          className="tree-node-header"
                          onClick={() => toggleDepartment(dept.id)}
                        >
                          <span className="tree-toggle">
                            {expandedDepartments[dept.id] ? <FiChevronDown /> : <FiChevronRight />}
                          </span>
                          <span className="tree-icon department"><FiGrid /></span>
                          <span className="tree-name">{dept.name}</span>
                          <span className="tree-badge">{getGroupsByDepartment(dept.id).length}</span>
                          <div className="tree-actions">
                            <button onClick={(e) => { e.stopPropagation(); openEditModal('department', dept); }}>
                              <FiEdit2 />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete('department', dept.id); }}>
                              <FiTrash2 />
                            </button>
                          </div>
                        </div>
                        
                        {expandedDepartments[dept.id] && (
                          <div className="tree-children">
                            {getGroupsByDepartment(dept.id).map(group => (
                              <div key={group.id} className="tree-node group-node">
                                <div className="tree-node-header">
                                  <span className="tree-toggle empty"></span>
                                  <span className="tree-icon group"><FiUsers /></span>
                                  <span 
                                    className="tree-name clickable"
                                    onClick={() => navigate(`/structure/groups/${group.id}`)}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    {group.name}
                                  </span>
                                  <span className="tree-info">{group.year}-kurs</span>
                                  <span className="tree-badge">{group.students?.length || 0} talaba</span>
                                  <div className="tree-actions">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); openAssignModal(group); }}
                                      title="Fan va o'qituvchi biriktirish"
                                    >
                                      <FiLink />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); openEditModal('group', group); }}>
                                      <FiEdit2 />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete('group', group.id); }}>
                                      <FiTrash2 />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {getGroupsByDepartment(dept.id).length === 0 && (
                              <div className="tree-empty">
                                <button 
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => {
                                    setFormData({ ...getInitialFormData('group'), facultyId: faculty.id, departmentId: dept.id });
                                    setModalType('group');
                                    setEditingItem(null);
                                    setShowModal(true);
                                  }}
                                >
                                  <FiPlus /> Guruh qo'shish
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {getDepartmentsByFaculty(faculty.id).length === 0 && (
                      <div className="tree-empty">
                        <button 
                          className="btn btn-sm btn-secondary"
                          onClick={() => {
                            setFormData({ ...getInitialFormData('department'), facultyId: faculty.id });
                            setModalType('department');
                            setEditingItem(null);
                            setShowModal(true);
                          }}
                        >
                          <FiPlus /> Yo'nalish qo'shish
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Groups Tab */}
        {activeTab === 'groups' && (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Guruh</th>
                  <th>Yo'nalish</th>
                  <th>Kurs</th>
                  <th>Talabalar</th>
                  <th>Biriktirilgan fanlar</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {groups
                  .filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(group => {
                    const dept = departments.find(d => d.id === group.departmentId);
                    return (
                      <tr key={group.id}>
                        <td>
                          <div 
                            className="cell-with-icon clickable"
                            onClick={() => navigate(`/structure/groups/${group.id}`)}
                            style={{ cursor: 'pointer' }}
                          >
                            <span className="cell-icon group"><FiUsers /></span>
                            <strong>{group.name}</strong>
                          </div>
                        </td>
                        <td>{dept?.name || '-'}</td>
                        <td><span className="badge badge-info">{group.year}-kurs</span></td>
                        <td>
                          <span className="badge badge-primary">
                            {group.students?.length || 0} ta
                          </span>
                        </td>
                        <td>
                          <div className="subject-teachers-count">
                            {group.subjectTeachers && group.subjectTeachers.length > 0 ? (
                              <span className="subjects-count-badge">
                                {group.subjectTeachers.length} ta fan
                              </span>
                            ) : (
                              <span className="no-data">Biriktirilmagan</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button 
                              className="action-btn assign"
                              onClick={() => openAssignModal(group)}
                              title="Fan va o'qituvchi biriktirish"
                            >
                              <FiLink />
                            </button>
                            <button 
                              className="action-btn edit"
                              onClick={() => openEditModal('group', group)}
                            >
                              <FiEdit2 />
                            </button>
                            <button 
                              className="action-btn delete"
                              onClick={() => handleDelete('group', group.id)}
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            {groups.length === 0 && (
              <div className="empty-state">
                <FiUsers size={48} />
                <p>Guruhlar topilmadi</p>
                <button className="btn btn-primary" onClick={() => openCreateModal('group')}>
                  <FiPlus /> Guruh yaratish
                </button>
              </div>
            )}
          </div>
        )}

        {/* Subjects Tab */}
        {activeTab === 'subjects' && (
          <div className="cards-grid subjects-grid">
            {subjects
              .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(subject => (
                <div key={subject.id} className="structure-card subject-card">
                  <div className="card-header">
                    <div className="card-icon subject">
                      <FiBookOpen />
                    </div>
                    <div className="card-actions">
                      <button 
                        className="action-btn edit"
                        onClick={() => openEditModal('subject', subject)}
                      >
                        <FiEdit2 />
                      </button>
                      <button 
                        className="action-btn delete"
                        onClick={() => handleDelete('subject', subject.id)}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                  <h3 className="card-title">{subject.name}</h3>
                  {subject.code && <span className="card-code">{subject.code}</span>}
                </div>
              ))}
            {subjects.length === 0 && (
              <div className="empty-state">
                <FiBookOpen size={48} />
                <p>Fanlar topilmadi</p>
                <button className="btn btn-primary" onClick={() => openCreateModal('subject')}>
                  <FiPlus /> Fan yaratish
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={getModalTitle()}>
        <div className="modal-form">
          {renderModalContent()}
          <div className="modal-actions">
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowModal(false)}
              disabled={saving}
            >
              {t('common.cancel')}
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? t('common.loading') : t('admin.structure.save')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Assign Teacher Modal */}
      <Modal 
        isOpen={showAssignModal} 
        onClose={() => setShowAssignModal(false)} 
        title={`Fan va o'qituvchi biriktirish - ${selectedGroup?.name || ''}`}
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
              onClick={() => setShowAssignModal(false)}
              disabled={saving}
            >
              {t('common.cancel')}
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

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setConfirmAction(null);
          setConfirmMessage('');
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

export default Structure;
