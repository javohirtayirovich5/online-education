import { useState, useEffect } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { testService } from '../../services/testService';
import { groupService } from '../../services/groupService';
import { imageService } from '../../services/imageService';
import { FiEdit, FiTrash2, FiBarChart2, FiMoreVertical } from 'react-icons/fi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import ConfirmModal from '../../components/common/ConfirmModal';
import TestEditor from '../../components/tests/TestEditor';
import TestResultsModal from '../../components/tests/TestResultsModal';
import { toast } from 'react-toastify';
import { formatDate } from '../../utils/helpers';
import '../teacher/TeacherTests.css';

const AdminTests = () => {
  const { t } = useTranslation();
  const [allTests, setAllTests] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [editingTest, setEditingTest] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allTestsResult, groupsResult] = await Promise.all([
        testService.getAllTests(),
        groupService.getAllGroups()
      ]);

      if (allTestsResult.success) {
        setAllTests(allTestsResult.data);
      }
      if (groupsResult.success) {
        setGroups(groupsResult.data);
      }
    } catch (error) {
      console.error('Load data error:', error);
      toast.error('Ma\'lumotlarni yuklashda xatolik');
    }
    setLoading(false);
  };

  // Helper function to clean test data before saving to Firestore
  const cleanTestDataForFirestore = (data) => {
    const cleaned = { ...data };
    
    // Helper to check if string is base64 data URL
    const isBase64DataUrl = (str) => {
      return typeof str === 'string' && str.startsWith('data:');
    };

    // Remove non-serializable properties
    if (cleaned.questions && Array.isArray(cleaned.questions)) {
      cleaned.questions = cleaned.questions.map(question => {
        const { 
          imageFile, imageData, imageBlob, file, 
          image, preview, tempId, editing,
          ...cleanQ 
        } = question;
        
        // Remove undefined values and functions
        const finalQ = {};
        Object.keys(cleanQ).forEach(key => {
          const value = cleanQ[key];
          
          // Skip functions, undefined, null objects, and File/Blob types
          if (typeof value !== 'function' && value !== undefined) {
            if (value instanceof File || value instanceof Blob) {
              return;
            }
            
            // Skip base64 data URLs (they're huge and local-only)
            if (isBase64DataUrl(value)) {
              return;
            }
            
            finalQ[key] = value;
          }
        });
        
        return finalQ;
      });
    }
    
    return cleaned;
  };

  const handleEditTest = async (testData, imageFilesToUpload = [], removedImageFileNames = []) => {
    try {
      setUploading(true);
      setUploadProgress(0);

      const testId = editingTest.id;
      
      // Step 0: Clean testData - remove all non-serializable objects
      const cleanTestData = cleanTestDataForFirestore(testData);

      let finalTestData = { ...cleanTestData };
      const totalSteps = (imageFilesToUpload?.length || 0) + (removedImageFileNames?.length || 0) + 1;
      let completedSteps = 0;

      // Step 1: Upload new images with progress tracking
      if (imageFilesToUpload && imageFilesToUpload.length > 0) {
        for (let i = 0; i < imageFilesToUpload.length; i++) {
          const imageData = imageFilesToUpload[i];
          const progressCallback = (progress) => {
            // Calculate progress based on completed steps and current image upload
            const uploadStartStep = completedSteps;
            const uploadSegmentSize = 100 / totalSteps;
            // Progress from all completed steps
            const stepsProgress = (uploadStartStep / totalSteps) * 100;
            // Progress within this upload (0-100) normalized to this step's segment
            const currentProgress = (progress / 100) * uploadSegmentSize;
            const totalProgress = stepsProgress + currentProgress;
            setUploadProgress(Math.min(totalProgress, 99));
          };

          const uploadResult = await imageService.uploadTestImage(
            testId,
            imageData.file,
            progressCallback
          );

          if (uploadResult && uploadResult.success) {
            const questionIndex = imageData.questionIndex;
            const question = finalTestData.questions[questionIndex];

            if (imageData.type === 'questionImage') {
              // Simple question image
              question.imageUrl = uploadResult.url;
              question.imageFileName = uploadResult.fileName;
            } else if (imageData.type === 'matchingLeft') {
              // Matching pair left image
              if (question.pairs && question.pairs[imageData.pairIndex]) {
                question.pairs[imageData.pairIndex].leftImage = uploadResult.url;
                question.pairs[imageData.pairIndex].leftImageFileName = uploadResult.fileName;
              }
            } else if (imageData.type === 'matchingRight') {
              // Matching pair right image
              if (question.pairs && question.pairs[imageData.pairIndex]) {
                question.pairs[imageData.pairIndex].rightImage = uploadResult.url;
                question.pairs[imageData.pairIndex].rightImageFileName = uploadResult.fileName;
              }
            } else if (imageData.type === 'subMatchingLeft') {
              // Sub-question matching pair left image
              if (question.subQuestions && question.subQuestions[imageData.subIndex] && 
                  question.subQuestions[imageData.subIndex].pairs && 
                  question.subQuestions[imageData.subIndex].pairs[imageData.pairIndex]) {
                question.subQuestions[imageData.subIndex].pairs[imageData.pairIndex].leftImage = uploadResult.url;
                question.subQuestions[imageData.subIndex].pairs[imageData.pairIndex].leftImageFileName = uploadResult.fileName;
              }
            } else if (imageData.type === 'subMatchingRight') {
              // Sub-question matching pair right image
              if (question.subQuestions && question.subQuestions[imageData.subIndex] && 
                  question.subQuestions[imageData.subIndex].pairs && 
                  question.subQuestions[imageData.subIndex].pairs[imageData.pairIndex]) {
                question.subQuestions[imageData.subIndex].pairs[imageData.pairIndex].rightImage = uploadResult.url;
                question.subQuestions[imageData.subIndex].pairs[imageData.pairIndex].rightImageFileName = uploadResult.fileName;
              }
            }
          }

          completedSteps++;
          setUploadProgress(Math.round((completedSteps / totalSteps) * 100));
        }
      }

      // Step 2: Delete removed images
      if (removedImageFileNames && removedImageFileNames.length > 0) {
        const deletePromises = removedImageFileNames.map(fileName =>
          imageService.deleteTestImage(testId, fileName)
        );
        await Promise.all(deletePromises);
        completedSteps += removedImageFileNames.length;
        setUploadProgress(Math.round((completedSteps / totalSteps) * 100));
      }
      
      // Also delete old images if they were replaced (simple questions)
      const replaceDeletePromises = [];
      editingTest.questions.forEach((oldQuestion, index) => {
        const newQuestion = finalTestData.questions[index];
        
        // Delete old simple question image if replaced
        if (oldQuestion.imageFileName && 
            (!newQuestion.imageFileName || oldQuestion.imageFileName !== newQuestion.imageFileName) &&
            !removedImageFileNames?.includes(oldQuestion.imageFileName)) {
          replaceDeletePromises.push(imageService.deleteTestImage(testId, oldQuestion.imageFileName));
        }
      });

      if (replaceDeletePromises.length > 0) {
        await Promise.all(replaceDeletePromises);
        completedSteps += replaceDeletePromises.length;
        setUploadProgress(Math.round((completedSteps / totalSteps) * 100));
      }
      
      // Step 3: Update test in Firestore
      await testService.updateTest(testId, finalTestData);
      completedSteps++;
      setUploadProgress(100);

      toast.success('Test muvaffaqiyatli o\'zgartirildi');
      setShowEditModal(false);
      setEditingTest(null);
      loadData();
    } catch (error) {
      console.error('Update test error:', error);
      toast.error('Testni o\'zgartirishda xatolik');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteTest = async () => {
    try {
      const result = await testService.deleteTest(selectedTest.id);

      if (result.success) {
        toast.success('Test muvaffaqiyatli o\'chirildi');
        setShowDeleteConfirm(false);
        setSelectedTest(null);
        loadData();
      }
    } catch (error) {
      console.error('Delete test error:', error);
      toast.error('Testni o\'chirishda xatolik');
    }
  };

  const handleViewResults = (test) => {
    setSelectedTest(test);
    setShowResultsModal(true);
  };

  const getUniqueTeachers = () => {
    const teachers = allTests
      .map(test => test.createdByName)
      .filter(Boolean);
    return [...new Set(teachers)].sort();
  };

  const filteredTests = allTests.filter(test => {
    const matchesSearch = test.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTeacher = !selectedTeacherFilter || test.createdByName === selectedTeacherFilter;
    return matchesSearch && matchesTeacher;
  });

  const getGroupName = (test) => {
    if (!test) return t('tests.forAll');

    if (test.visibleFor === 'all' || !test.visibleFor) {
      return t('tests.forAll');
    }

    const ids = Array.isArray(test.groupIds) && test.groupIds.length
      ? test.groupIds
      : (test.groupId ? [test.groupId] : []);

    if (!ids.length) {
      return t('tests.forAll');
    }

    if (ids.length === 1) {
      const group = groups.find(g => g.id === ids[0]);
      return group ? group.name : t('tests.forAll');
    }

    return `${ids.length} ta guruh`;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="tests-container">
      <div className="tests-header">
        <h1>
          {t('tests.pageHeaderLine1')}<br />
          {t('tests.pageHeaderLine2')}
        </h1>
      </div>

      <div className="tests-search">
        <input
          type="text"
          placeholder={t('teacher.tests.searchTests') + '...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <select
          className="search-input teacher-filter"
          value={selectedTeacherFilter || ''}
          onChange={(e) => setSelectedTeacherFilter(e.target.value || null)}
        >
          <option value="">{t('teacher.tests.allTeachers')}</option>
          {getUniqueTeachers().map((teacher) => (
            <option key={teacher} value={teacher}>
              {teacher}
            </option>
          ))}
        </select>
      </div>

      {filteredTests.length === 0 ? (
        <div className="empty-state">
          <p>{t('teacher.tests.noTests')}</p>
        </div>
      ) : (
        <div className="tests-list">
          {filteredTests.map(test => (
            <div key={test.id} className="test-card">
              <div className="test-card-header">
                <div>
                  <h3>{test.title}</h3>
                  <p className="test-info">
                    {test.questions?.length || 0} {t('tests.questionsFrom')} • {getGroupName(test)}
                    {test.createdByName && (
                      <> • <span className="teacher-name">{test.createdByName}</span></>
                    )}
                  </p>
                </div>
                <div className="test-actions">
                  <button
                    className="btn btn-sm btn-icon"
                    onClick={() => handleViewResults(test)}
                    title={t('teacher.tests.viewResults')}
                  >
                    <FiBarChart2 /> {t('teacher.tests.viewResults')}
                  </button>
                  <div className="action-menu-container">
                    <button
                      className="btn btn-sm btn-icon"
                      onClick={() => setOpenDropdownId(openDropdownId === test.id ? null : test.id)}
                      title="Qo'shimcha amallar"
                    >
                      <FiMoreVertical />
                    </button>
                    {openDropdownId === test.id && (
                      <div className="action-dropdown-menu">
                        <button
                          className="dropdown-menu-item"
                          onClick={() => {
                            setEditingTest(test);
                            setShowEditModal(true);
                            setOpenDropdownId(null);
                          }}
                        >
                          <FiEdit /> {t('teacher.tests.edit')}
                        </button>
                        <button
                          className="dropdown-menu-item dropdown-menu-danger"
                          onClick={() => {
                            setSelectedTest(test);
                            setShowDeleteConfirm(true);
                            setOpenDropdownId(null);
                          }}
                        >
                          <FiTrash2 /> {t('teacher.tests.delete')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="test-card-body">
                <p className="test-description">{test.description}</p>
                <div className="test-meta">
                  <span>{t('lessons.createdAt')}: {formatDate(test.createdAt)}</span>
                  <span className={`status-badge status-${test.status}`}>
                    {test.status === 'active' ? t('common.active') : t('common.inactive')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Test Modal */}
      {editingTest && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingTest(null);
          }}
          title={t('teacher.tests.edit')}
          size="large"
          disableEscClose={true}
        >
          <TestEditor
            initialData={editingTest}
            groups={groups}
            onSave={handleEditTest}
            onCancel={() => {
              setShowEditModal(false);
              setEditingTest(null);
            }}
          />
        </Modal>
      )}

      {/* Test Results Modal */}
      {selectedTest && (
        <TestResultsModal
          isOpen={showResultsModal}
          onClose={() => {
            setShowResultsModal(false);
            setSelectedTest(null);
          }}
          test={selectedTest}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title={t('teacher.tests.delete')}
        message={`"${selectedTest?.title}" ${t('tests.deleteTestConfirm')}`}
        onConfirm={handleDeleteTest}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedTest(null);
        }}
        confirmText={t('teacher.tests.delete')}
        cancelText={t('common.cancel')}
        isDangerous
      />
    </div>
  );
};

export default AdminTests;
