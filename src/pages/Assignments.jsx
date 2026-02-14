import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { assignmentService } from '../services/assignmentService';
import { storageService } from '../services/storageService';
import { FiFileText, FiPlus, FiClock, FiCheckCircle, FiXCircle, FiArrowLeft, FiUpload, FiFile, FiDownload, FiUser, FiEdit, FiTrash2, FiEye, FiMoreVertical } from 'react-icons/fi';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import ConfirmModal from '../components/common/ConfirmModal';
import { toast } from 'react-toastify';
import { formatDate, isPastDate, getTimeRemaining } from '../utils/helpers';
import './Assignments.css';

const Assignments = () => {
  const navigate = useNavigate();
  const { userData, isTeacher, isStudent } = useAuth();
  const { t } = useTranslation();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [studentSubmissions, setStudentSubmissions] = useState({}); // Store student submissions for status
  const [ungradedCounts, setUngradedCounts] = useState({}); // Store ungraded submissions count for each assignment
  const [selectedTab, setSelectedTab] = useState('all');
  const [submissionsTab, setSubmissionsTab] = useState('all'); // Tab for submissions modal
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    maxScore: 100
  });
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [submissionFile, setSubmissionFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [grading, setGrading] = useState({});
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [deleteAssignmentId, setDeleteAssignmentId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const fileInputRef = useRef(null);
  const submissionFileInputRef = useRef(null);
  const menuRefs = useRef({});

  useEffect(() => {
    loadAssignments();
  }, [userData]);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      if (isTeacher) {
        const result = await assignmentService.getAssignmentsByTeacher(userData.uid);
        if (result.success) {
          setAssignments(result.data);
          
          // Load ungraded submissions count for each assignment
          const ungradedMap = {};
          for (const assignment of result.data) {
            const submissionsResult = await assignmentService.getSubmissionsByAssignment(assignment.id);
            if (submissionsResult.success) {
              const ungraded = submissionsResult.data.filter(
                s => s.grade === null || s.grade === undefined
              ).length;
              ungradedMap[assignment.id] = ungraded;
            }
          }
          setUngradedCounts(ungradedMap);
        }
      } else {
        const result = await assignmentService.getAllAssignments();
        if (result.success) {
          setAssignments(result.data);
          
          // Load student submissions for all assignments to show status
          const submissionsMap = {};
          for (const assignment of result.data) {
            const submissionResult = await assignmentService.getSubmissionByStudentAndAssignment(
              userData.uid,
              assignment.id
            );
            if (submissionResult.success) {
              submissionsMap[assignment.id] = submissionResult.data;
            }
          }
          setStudentSubmissions(submissionsMap);
        }
      }
    } catch (error) {
      console.error('Load assignments error:', error);
      toast.error('Topshiriqlarni yuklashda xatolik');
    }
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.dueDate) {
      toast.error('Barcha majburiy maydonlarni to\'ldiring');
      return;
    }

    setUploading(true);
    try {
      // Create assignment first to get assignment ID
      const result = await assignmentService.createAssignment({
        ...formData,
        createdBy: userData.uid,
        createdByName: userData.displayName,
        attachedFiles: []
      });

      if (!result.success) {
        throw new Error(result.error || 'Topshiriq yaratishda xatolik');
      }

      const assignmentId = result.assignmentId;

      // Upload attached files with actual assignment ID
      const attachedFilesURLs = [];
      for (const file of attachedFiles) {
        const uploadResult = await storageService.uploadAssignmentAttachment(
          assignmentId,
          file,
          () => {}
        );
        if (uploadResult.success) {
          attachedFilesURLs.push({
            name: file.name,
            url: uploadResult.url,
            size: file.size
          });
        }
      }

      // Update assignment with attached files URLs
      if (attachedFilesURLs.length > 0) {
        await assignmentService.updateAssignment(assignmentId, {
          attachedFiles: attachedFilesURLs
        });
      }

      // Optimistic add to UI
      const newAssignment = {
        id: assignmentId,
        ...formData,
        createdBy: userData.uid,
        createdByName: userData.displayName,
        attachedFiles: attachedFilesURLs,
        createdAt: new Date().toISOString()
      };
      setAssignments([newAssignment, ...assignments]);

      toast.success('Topshiriq yaratildi!');
      setShowCreateModal(false);
      setFormData({ title: '', description: '', dueDate: '', maxScore: 100 });
      setAttachedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Create assignment error:', error);
      toast.error(error.message || 'Topshiriq yaratishda xatolik');
      loadAssignments();
    }
    setUploading(false);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setAttachedFiles([...attachedFiles, ...files]);
  };

  const removeAttachedFile = (index) => {
    setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
  };

  const handleEdit = (assignment) => {
    setEditingAssignment(assignment);
    // Format dueDate for datetime-local input
    let formattedDueDate = '';
    if (assignment.dueDate) {
      const date = new Date(assignment.dueDate);
      formattedDueDate = date.toISOString().slice(0, 16);
    }
    setFormData({
      title: assignment.title,
      description: assignment.description,
      dueDate: formattedDueDate,
      maxScore: assignment.maxScore || 100
    });
    // Set existing attached files (they are objects with url, name, size)
    setAttachedFiles(assignment.attachedFiles || []);
    setShowEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.dueDate) {
      toast.error('Barcha majburiy maydonlarni to\'ldiring');
      return;
    }

    if (!editingAssignment) return;

    setUploading(true);
    try {
      const assignmentId = editingAssignment.id;
      const existingFiles = editingAssignment.attachedFiles || [];
      
      // Upload new attached files (only File objects)
      const newFiles = attachedFiles.filter(file => file instanceof File);
      const newFilesURLs = [];
      
      for (const file of newFiles) {
        const uploadResult = await storageService.uploadAssignmentAttachment(
          assignmentId,
          file,
          () => {}
        );
        if (uploadResult.success) {
          newFilesURLs.push({
            name: file.name,
            url: uploadResult.url,
            size: file.size
          });
        }
      }

      // Combine existing files (that are objects with url) with new files
      const existingFileObjects = attachedFiles.filter(file => typeof file === 'object' && !(file instanceof File) && file.url);
      const allAttachedFiles = [...existingFileObjects, ...newFilesURLs];

      // Update assignment
      const result = await assignmentService.updateAssignment(assignmentId, {
        title: formData.title,
        description: formData.description,
        dueDate: formData.dueDate,
        maxScore: formData.maxScore,
        attachedFiles: allAttachedFiles
      });

      if (!result.success) {
        throw new Error(result.error || 'Topshiriqni yangilashda xatolik');
      }

      // Optimistic update in UI
      const updatedAssignments = assignments.map(a => 
        a.id === assignmentId 
          ? {
              ...a,
              title: formData.title,
              description: formData.description,
              dueDate: formData.dueDate,
              maxScore: formData.maxScore,
              attachedFiles: allAttachedFiles
            }
          : a
      );
      setAssignments(updatedAssignments);

      toast.success('Topshiriq yangilandi!');
      setShowEditModal(false);
      setEditingAssignment(null);
      setFormData({ title: '', description: '', dueDate: '', maxScore: 100 });
      setAttachedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Update assignment error:', error);
      toast.error(error.message || 'Topshiriqni yangilashda xatolik');
      loadAssignments();
    }
    setUploading(false);
  };

  const handleViewAssignment = async (assignment) => {
    setSelectedAssignment(assignment);
    setShowDetailModal(true);
    
    if (isStudent) {
      // Check if submission already loaded in state
      if (studentSubmissions[assignment.id]) {
        setSubmissionFile(studentSubmissions[assignment.id].file);
      } else {
        // Load student's submission if exists
        const submissionResult = await assignmentService.getSubmissionByStudentAndAssignment(
          userData.uid,
          assignment.id
        );
        if (submissionResult.success) {
          setSubmissionFile(submissionResult.data.file);
          // Update state
          setStudentSubmissions({
            ...studentSubmissions,
            [assignment.id]: submissionResult.data
          });
        }
      }
    }
  };

  const handleViewSubmissions = async (assignment) => {
    setSelectedAssignment(assignment);
    setShowSubmissionsModal(true);
    setSubmissionsTab('all');
    
    const result = await assignmentService.getSubmissionsByAssignment(assignment.id);
    if (result.success) {
      setSubmissions(result.data);
      // Update ungraded count
      const ungraded = result.data.filter(
        s => s.grade === null || s.grade === undefined
      ).length;
      setUngradedCounts({
        ...ungradedCounts,
        [assignment.id]: ungraded
      });
    }
  };

  // Get submission status for student
  const getSubmissionStatus = (assignmentId) => {
    const submission = studentSubmissions[assignmentId];
    if (!submission) {
      return { status: 'not_submitted', text: t('assignments.notSubmitted'), color: '#ef4444' };
    }
    if (submission.grade !== null && submission.grade !== undefined) {
      return { status: 'graded', text: t('assignments.graded'), color: '#10b981' };
    }
    return { status: 'submitted', text: t('assignments.submittedStatus'), color: '#f59e0b' };
  };

  // Get filtered submissions based on tab
  const getFilteredSubmissions = () => {
    if (submissionsTab === 'graded') {
      return submissions.filter(s => s.grade !== null && s.grade !== undefined);
    } else if (submissionsTab === 'ungraded') {
      return submissions.filter(s => s.grade === null || s.grade === undefined);
    }
    return submissions;
  };

  // Get submission statistics
  const getSubmissionStats = () => {
    const total = submissions.length;
    const graded = submissions.filter(s => s.grade !== null && s.grade !== undefined).length;
    const ungraded = total - graded;
    return { total, graded, ungraded };
  };

  const handleDeleteAssignment = (assignmentId) => {
    setDeleteAssignmentId(assignmentId);
    setOpenMenuId(null);
    setShowConfirmDeleteModal(true);
  };

  const confirmDeleteAssignment = async () => {
    if (!deleteAssignmentId) return;
    
    try {
      // Optimistic delete - remove from UI immediately
      setAssignments(assignments.filter(a => a.id !== deleteAssignmentId));
      
      const result = await assignmentService.deleteAssignment(deleteAssignmentId);
      if (result.success) {
        toast.success('Topshiriq o\'chirildi');
      } else {
        // Restore if delete failed
        loadAssignments();
        toast.error(result.error || 'Topshiriqni o\'chirishda xatolik');
      }
    } catch (error) {
      console.error('Delete assignment error:', error);
      // Restore if delete failed
      loadAssignments();
      toast.error('Topshiriqni o\'chirishda xatolik');
    } finally {
      setShowConfirmDeleteModal(false);
      setDeleteAssignmentId(null);
    }
  };

  const handleSubmitAssignment = async () => {
    if (!submissionFile) {
      toast.error('Fayl tanlang');
      return;
    }

    setSubmitting(true);
    try {
      // Upload submission file
      const uploadResult = await storageService.uploadAssignmentSubmission(
        selectedAssignment.id,
        userData.uid,
        submissionFile,
        () => {}
      );

      if (uploadResult.success) {
        // Create submission record
        const result = await assignmentService.createSubmission({
          assignmentId: selectedAssignment.id,
          assignmentTitle: selectedAssignment.title,
          studentId: userData.uid,
          studentName: userData.displayName,
          studentPhoto: userData.photoURL,
          file: {
            name: submissionFile.name,
            url: uploadResult.url,
            size: submissionFile.size
          }
        });

        if (result.success) {
          // Update student submissions state optimistically
          const newSubmission = {
            id: result.submissionId,
            assignmentId: selectedAssignment.id,
            studentId: userData.uid,
            studentName: userData.displayName,
            studentPhoto: userData.photoURL,
            file: {
              name: submissionFile.name,
              url: uploadResult.url,
              size: submissionFile.size
            },
            submittedAt: new Date().toISOString(),
            grade: null
          };
          setStudentSubmissions({
            ...studentSubmissions,
            [selectedAssignment.id]: newSubmission
          });

          toast.success('Topshiriq muvaffaqiyatli jo\'natildi!');
          setShowDetailModal(false);
          setSubmissionFile(null);
          if (submissionFileInputRef.current) {
            submissionFileInputRef.current.value = '';
          }
        } else {
          throw new Error(result.error || 'Topshiriqni jo\'natishda xatolik');
        }
      } else {
        throw new Error('Fayl yuklashda xatolik');
      }
    } catch (error) {
      console.error('Submit assignment error:', error);
      toast.error(error.message || 'Topshiriqni jo\'natishda xatolik');
    }
    setSubmitting(false);
  };

  const handleGradeSubmission = async (submissionId, grade) => {
    if (!grade || grade < 0 || grade > selectedAssignment.maxScore) {
      toast.error(`Ball 0 dan ${selectedAssignment.maxScore} gacha bo'lishi kerak`);
      return;
    }

    setGrading({ ...grading, [submissionId]: true });
    try {
      const result = await assignmentService.updateSubmission(submissionId, {
        grade: parseFloat(grade),
        gradedBy: userData.uid,
        gradedByName: userData.displayName
      });

      if (result.success) {
        // Optimistic update - update submission in the list
        const updatedSubmissions = submissions.map(s =>
          s.id === submissionId
            ? { ...s, grade: parseFloat(grade), gradedBy: userData.uid, gradedByName: userData.displayName }
            : s
        );
        setSubmissions(updatedSubmissions);

        // Update ungraded count
        const ungraded = updatedSubmissions.filter(
          s => s.grade === null || s.grade === undefined
        ).length;
        setUngradedCounts({
          ...ungradedCounts,
          [selectedAssignment.id]: ungraded
        });

        toast.success('Baholandi!');
      } else {
        throw new Error(result.error || 'Baholashda xatolik');
      }
    } catch (error) {
      console.error('Grade submission error:', error);
      toast.error(error.message || 'Baholashda xatolik');
    }
    setGrading({ ...grading, [submissionId]: false });
  };

  const filteredAssignments = assignments.filter(assignment => {
    if (selectedTab === 'pending') {
      return !isPastDate(assignment.dueDate);
    } else if (selectedTab === 'overdue') {
      return isPastDate(assignment.dueDate);
    }
    return true;
  });

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
    <div className="assignments-page">
      <button 
        className="back-btn"
        onClick={() => navigate('/dashboard')}
      >
        <FiArrowLeft /> {t('common.back')}
      </button>
      <div className="page-header">
        <div>
          <h1>{t('assignments.title')}</h1>
          <p>{isTeacher ? t('assignments.manageAssignments') : t('assignments.yourAssignments')}</p>
          {/* {isTeacher && Object.values(ungradedCounts).reduce((sum, count) => sum + count, 0) > 0 && (
            <div className="header-stats">
              <span className="ungraded-count-badge">
                <FiClock />
                {Object.values(ungradedCounts).reduce((sum, count) => sum + count, 0)} {t('assignments.ungradedAssignments')}
              </span>
            </div>
          )} */}
        </div>
        {isTeacher && (
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <FiPlus /> {t('assignments.newAssignment')}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${selectedTab === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedTab('all')}
        >
          {t('assignments.all')} ({assignments.length})
        </button>
        <button 
          className={`tab ${selectedTab === 'pending' ? 'active' : ''}`}
          onClick={() => setSelectedTab('pending')}
        >
          {t('assignments.active')}
        </button>
        <button 
          className={`tab ${selectedTab === 'overdue' ? 'active' : ''}`}
          onClick={() => setSelectedTab('overdue')}
        >
          {t('assignments.overdue')}
        </button>
      </div>

      {/* Assignments List */}
      {filteredAssignments.length === 0 ? (
        <div className="empty-state-large">
          <FiFileText size={64} />
          <h2>{t('assignments.noAssignments')}</h2>
          <p>{t('assignments.noAssignments')}</p>
        </div>
      ) : (
        <div className="assignments-grid">
          {filteredAssignments.map((assignment) => {
            const isOverdue = isPastDate(assignment.dueDate);
            const timeRemaining = getTimeRemaining(assignment.dueDate);
            const submissionStatus = isStudent ? getSubmissionStatus(assignment.id) : null;
            
            return (
              <div key={assignment.id} className="assignment-card">
                <div className="assignment-header">
                  <div className="assignment-icon">
                    <FiFileText />
                  </div>
                  <div className="assignment-status">
                    {isOverdue ? (
                      <span className="status-badge overdue">
                        <FiXCircle /> {t('assignments.overdue')}
                      </span>
                    ) : (
                      <span className="status-badge active">
                        <FiClock /> {t('assignments.active')}
                      </span>
                    )}
                    {isStudent && submissionStatus && (
                      <span 
                        className="status-badge submission-status" 
                        style={{ backgroundColor: `${submissionStatus.color}15`, color: submissionStatus.color }}
                      >
                        {submissionStatus.text}
                      </span>
                    )}
                  </div>
                </div>

                <h3>{assignment.title}</h3>
                <p className="assignment-description">{assignment.description}</p>

                <div className="assignment-meta">
                  <div className="meta-item">
                    <FiClock />
                    <span>{t('assignments.deadline')}: {formatDate(assignment.dueDate)}</span>
                  </div>
                  {isStudent && timeRemaining && (
                    <div className="meta-item">
                      <span 
                        className="time-remaining"
                        style={{ color: timeRemaining.expired ? '#ef4444' : '#f59e0b' }}
                      >
                        {timeRemaining.text}
                      </span>
                    </div>
                  )}
                  <div className="meta-item">
                    <span className="score-badge">{assignment.maxScore} {t('assignments.points')}</span>
                  </div>
                  {assignment.attachedFiles && assignment.attachedFiles.length > 0 && (
                    <div className="meta-item">
                      <FiFile />
                      <span>{assignment.attachedFiles.length} {t('assignments.files')}</span>
                    </div>
                  )}
                  {isTeacher && ungradedCounts[assignment.id] > 0 && (
                    <div className="meta-item">
                      <span className="ungraded-badge">
                        <FiClock />
                        {ungradedCounts[assignment.id]} {t('assignments.ungraded')}
                      </span>
                    </div>
                  )}
                  {isStudent && studentSubmissions[assignment.id] && (
                    <div className="meta-item">
                      {studentSubmissions[assignment.id].grade !== null && 
                       studentSubmissions[assignment.id].grade !== undefined ? (
                        <span className="grade-display">
                          {t('assignments.score')}: {studentSubmissions[assignment.id].grade} / {assignment.maxScore}
                        </span>
                      ) : (
                        <span className="submitted-info">
                          {t('assignments.submitted')}: {formatDate(studentSubmissions[assignment.id].submittedAt)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="assignment-footer">
                  {isTeacher ? (
                    <div className="assignment-actions">
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => handleViewSubmissions(assignment)}
                      >
                        <FiEye /> {t('assignments.viewAssignments')}
                      </button>
                      <div className="action-menu-wrapper" ref={el => menuRefs.current[assignment.id] = el}>
                        <button 
                          className="btn-icon-menu" 
                          onClick={() => setOpenMenuId(openMenuId === assignment.id ? null : assignment.id)}
                          aria-label="More actions"
                        >
                          <FiMoreVertical />
                        </button>
                        {openMenuId === assignment.id && (
                          <div className="assignment-menu-dropdown">
                            <button 
                              className="assignment-menu-item"
                              onClick={() => {
                                setOpenMenuId(null);
                                handleEdit(assignment);
                              }}
                            >
                              <FiEdit /> {t('assignments.editAssignment')}
                            </button>
                            <button 
                              className="assignment-menu-item assignment-menu-item-danger"
                              onClick={() => handleDeleteAssignment(assignment.id)}
                            >
                              <FiTrash2 /> {t('common.delete')}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => handleViewAssignment(assignment)}
                    >
                      {t('assignments.submit')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Assignment Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setFormData({ title: '', description: '', dueDate: '', maxScore: 100 });
          setAttachedFiles([]);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }}
        title={t('assignments.newAssignment')}
        size="large"
      >
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">{t('assignments.assignmentTitle')} *</label>
            <input
              type="text"
              className="form-input"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('assignments.description')} *</label>
            <textarea
              className="form-textarea"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows="5"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('assignments.dueDate')} *</label>
              <input
                type="datetime-local"
                className="form-input"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('assignments.maxScore')}</label>
              <input
                type="number"
                className="form-input"
                value={formData.maxScore}
                onChange={(e) => setFormData({ ...formData, maxScore: parseInt(e.target.value) })}
                min="1"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('assignments.attachedFiles')}</label>
            <div className="file-upload-wrapper">
              <input
                type="file"
                ref={fileInputRef}
                className="file-input-hidden"
                multiple
                onChange={handleFileChange}
              />
              <button
                type="button"
                className="file-upload-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <FiUpload /> {t('assignments.uploadFile')}
              </button>
            </div>
            {attachedFiles.length > 0 && (
              <div className="attached-files-list">
                {attachedFiles.map((file, index) => (
                  <div key={index} className="attached-file-item">
                    <FiFile />
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">({(file.size / 1024).toFixed(2)} KB)</span>
                    <button
                      type="button"
                      className="btn-icon-small"
                      onClick={() => removeAttachedFile(index)}
                    >
                      <FiXCircle />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => {
                setShowCreateModal(false);
                setFormData({ title: '', description: '', dueDate: '', maxScore: 100 });
                setAttachedFiles([]);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            >
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={uploading}>
              {uploading ? t('common.uploading') : t('common.create')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Assignment Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingAssignment(null);
          setFormData({ title: '', description: '', dueDate: '', maxScore: 100 });
          setAttachedFiles([]);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }}
        title={t('assignments.editAssignment')}
        size="large"
      >
        <form onSubmit={handleUpdate}>
          <div className="form-group">
            <label className="form-label">{t('assignments.assignmentTitle')} *</label>
            <input
              type="text"
              className="form-input"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('assignments.description')} *</label>
            <textarea
              className="form-textarea"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows="5"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('assignments.dueDate')} *</label>
              <input
                type="datetime-local"
                className="form-input"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('assignments.maxScore')}</label>
              <input
                type="number"
                className="form-input"
                value={formData.maxScore}
                onChange={(e) => setFormData({ ...formData, maxScore: parseInt(e.target.value) })}
                min="1"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('assignments.attachedFiles')}</label>
            <div className="file-upload-wrapper">
              <input
                type="file"
                ref={fileInputRef}
                className="file-input-hidden"
                multiple
                onChange={handleFileChange}
              />
              <button
                type="button"
                className="file-upload-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <FiUpload /> {t('assignments.uploadFile')}
              </button>
            </div>
            {attachedFiles.length > 0 && (
              <div className="attached-files-list">
                {attachedFiles.map((file, index) => (
                  <div key={index} className="attached-file-item">
                    <FiFile />
                    <span className="file-name">
                      {file.name || file.url?.split('/').pop() || 'Fayl'}
                    </span>
                    {file.size && (
                      <span className="file-size">({(file.size / 1024).toFixed(2)} KB)</span>
                    )}
                    {file.url && (
                      <a 
                        href={file.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="file-download-link"
                      >
                        <FiDownload />
                      </a>
                    )}
                    <button
                      type="button"
                      className="btn-icon-small"
                      onClick={() => removeAttachedFile(index)}
                    >
                      <FiXCircle />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => {
                setShowEditModal(false);
                setEditingAssignment(null);
                setFormData({ title: '', description: '', dueDate: '', maxScore: 100 });
                setAttachedFiles([]);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            >
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={uploading}>
              {uploading ? t('common.uploading') : t('common.save')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirmDeleteModal}
        onClose={() => setShowConfirmDeleteModal(false)}
        onConfirm={confirmDeleteAssignment}
        title="Tasdiqlash"
        message="Rostdan ham o'chirmoqchimisiz?"
        confirmText="Ha, o'chirish"
        cancelText="Bekor qilish"
        type="danger"
      />

      {/* Assignment Detail Modal (for students) */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedAssignment(null);
          setSubmissionFile(null);
          if (submissionFileInputRef.current) {
            submissionFileInputRef.current.value = '';
          }
        }}
        title={selectedAssignment?.title}
        size="large"
      >
        {selectedAssignment && (
          <div className="assignment-detail">
            <div className="assignment-info">
              <p className="assignment-description-full">{selectedAssignment.description}</p>
              
              <div className="assignment-meta-full">
                <div className="meta-item">
                  <FiClock />
                  <span>{t('assignments.dueDateLabel')} {formatDate(selectedAssignment.dueDate)}</span>
                </div>
                {isStudent && (() => {
                  const timeRemaining = getTimeRemaining(selectedAssignment.dueDate);
                  return timeRemaining && (
                    <div className="meta-item">
                      <span 
                        className="time-remaining"
                        style={{ color: timeRemaining.expired ? '#ef4444' : '#f59e0b' }}
                      >
                        {timeRemaining.text}
                      </span>
                    </div>
                  );
                })()}
                <div className="meta-item">
                  <span className="score-badge">{selectedAssignment.maxScore} {t('assignments.pointsLabel')}</span>
                </div>
                {isStudent && studentSubmissions[selectedAssignment.id] && (
                  <div className="meta-item">
                    {(() => {
                      const submission = studentSubmissions[selectedAssignment.id];
                      const status = getSubmissionStatus(selectedAssignment.id);
                      return (
                        <>
                          <span 
                            className="status-badge submission-status" 
                            style={{ backgroundColor: `${status.color}15`, color: status.color }}
                          >
                            {status.text}
                          </span>
                          {submission.grade !== null && submission.grade !== undefined && (
                            <span className="grade-display">
                              {t('assignments.score')}: {submission.grade} / {selectedAssignment.maxScore}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {selectedAssignment.attachedFiles && selectedAssignment.attachedFiles.length > 0 && (
                <div className="assignment-files">
                  <h4>{t('assignments.attachedFilesLabel')}</h4>
                  <div className="files-list">
                    {selectedAssignment.attachedFiles.map((file, index) => (
                      <a
                        key={index}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="file-download-link"
                      >
                        <FiFile />
                        <span>{file.name}</span>
                        <FiDownload />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="submission-section">
                {isStudent && studentSubmissions[selectedAssignment.id] ? (
                  <>
                    <h4>{t('assignments.submittedAssignment')}</h4>
                    <div className="submitted-file-info">
                      <div className="submitted-file-details">
                        <FiFile />
                        <div>
                          <span className="file-name">{studentSubmissions[selectedAssignment.id].file?.name}</span>
                          <span className="file-size">
                            ({(studentSubmissions[selectedAssignment.id].file?.size / 1024).toFixed(2)} KB)
                          </span>
                        </div>
                        <a
                          href={studentSubmissions[selectedAssignment.id].file?.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="file-download-link"
                        >
                          <FiDownload />
                        </a>
                      </div>
                      <div className="submission-meta">
                        <span>{t('assignments.submittedAt')}: {formatDate(studentSubmissions[selectedAssignment.id].submittedAt)}</span>
                        {studentSubmissions[selectedAssignment.id].grade !== null && 
                         studentSubmissions[selectedAssignment.id].grade !== undefined && (
                          <span className="grade-display">
                            Ball: {studentSubmissions[selectedAssignment.id].grade} / {selectedAssignment.maxScore}
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h4>{t('assignments.submitAssignment')}</h4>
                    <div className="file-upload-wrapper">
                      <input
                        type="file"
                        ref={submissionFileInputRef}
                        className="file-input-hidden"
                        onChange={(e) => setSubmissionFile(e.target.files[0])}
                      />
                      <button
                        type="button"
                        className="file-upload-btn"
                        onClick={() => submissionFileInputRef.current?.click()}
                      >
                        <FiUpload /> {t('assignments.selectFile')}
                      </button>
                    </div>
                    {submissionFile && (
                      <div className="selected-file-info">
                        <FiFile />
                        <span>{submissionFile.name}</span>
                        <span className="file-size">({(submissionFile.size / 1024).toFixed(2)} KB)</span>
                      </div>
                    )}
                    <button
                      className="btn btn-primary"
                      onClick={handleSubmitAssignment}
                      disabled={!submissionFile || submitting}
                    >
                      {submitting ? t('assignments.submitting') : t('assignments.submit')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Submissions Modal (for teachers) */}
      <Modal
        isOpen={showSubmissionsModal}
        onClose={() => {
          setShowSubmissionsModal(false);
          setSelectedAssignment(null);
          setSubmissions([]);
        }}
        title={`${selectedAssignment?.title} - ${t('assignments.submissionsTitle')}`}
        size="large"
      >
        {selectedAssignment && (
          <div className="submissions-list">
            {submissions.length === 0 ? (
              <div className="empty-state">
                <FiFileText size={48} />
                <p>{t('assignments.noSubmissions')}</p>
              </div>
            ) : (
              <>
                {/* Statistics */}
                <div className="submissions-stats">
                  {(() => {
                    const stats = getSubmissionStats();
                    return (
                      <>
                        <div className="stat-item">
                          <span className="stat-label">{t('assignments.total')}</span>
                          <span className="stat-value">{stats.total}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">{t('assignments.gradedCount')}</span>
                          <span className="stat-value" style={{ color: '#10b981' }}>{stats.graded}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">{t('assignments.ungradedCount')}</span>
                          <span className="stat-value" style={{ color: '#f59e0b' }}>{stats.ungraded}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Tabs */}
                <div className="submissions-tabs">
                  <button 
                    className={`submission-tab ${submissionsTab === 'all' ? 'active' : ''}`}
                    onClick={() => setSubmissionsTab('all')}
                  >
                    {t('assignments.allSubmissions')} ({submissions.length})
                  </button>
                  <button 
                    className={`submission-tab ${submissionsTab === 'ungraded' ? 'active' : ''}`}
                    onClick={() => setSubmissionsTab('ungraded')}
                  >
                    {t('assignments.ungradedSubmissions')} ({getSubmissionStats().ungraded})
                  </button>
                  <button 
                    className={`submission-tab ${submissionsTab === 'graded' ? 'active' : ''}`}
                    onClick={() => setSubmissionsTab('graded')}
                  >
                    {t('assignments.gradedSubmissions')} ({getSubmissionStats().graded})
                  </button>
                </div>

                <div className="submissions-table">
                  <table>
                    <thead>
                      <tr>
                        <th>{t('assignments.student')}</th>
                        <th>{t('assignments.submittedDate')}</th>
                        <th>{t('assignments.file')}</th>
                        <th>{t('assignments.grade')}</th>
                        <th>{t('assignments.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredSubmissions().map((submission) => (
                      <tr key={submission.id}>
                        <td>
                          <div className="student-info">
                            {submission.studentPhoto && (
                              <img 
                                src={submission.studentPhoto} 
                                alt={submission.studentName}
                                className="student-avatar"
                              />
                            )}
                            <span>{submission.studentName}</span>
                          </div>
                        </td>
                        <td>{formatDate(submission.submittedAt)}</td>
                        <td>
                          {submission.file && (
                            <a
                              href={submission.file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="file-download-link"
                            >
                              <FiFile />
                              <span>{submission.file.name}</span>
                              <FiDownload />
                            </a>
                          )}
                        </td>
                        <td>
                          {submission.grade !== null && submission.grade !== undefined ? (
                            <span className="grade-value">{submission.grade} / {selectedAssignment.maxScore}</span>
                          ) : (
                            <span className="grade-pending">{t('assignments.gradePending')}</span>
                          )}
                        </td>
                        <td>
                          {submission.grade === null || submission.grade === undefined ? (
                            <div className="grade-input-group">
                              <input
                                type="number"
                                className="grade-input"
                                placeholder={t('assignments.score')}
                                min="0"
                                max={selectedAssignment.maxScore}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleGradeSubmission(submission.id, e.target.value);
                                  }
                                }}
                              />
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={(e) => {
                                  const input = e.target.previousElementSibling;
                                  handleGradeSubmission(submission.id, input.value);
                                }}
                                disabled={grading[submission.id]}
                              >
                                {grading[submission.id] ? '...' : t('assignments.gradeAction')}
                              </button>
                            </div>
                          ) : (
                            <span className="graded-badge">
                              <FiCheckCircle /> {t('assignments.gradedBadge')}
                            </span>
                          )}
                        </td>
                      </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Assignments;
