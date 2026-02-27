import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { testService } from '../../services/testService';
import { groupService } from '../../services/groupService';
import { imageService } from '../../services/imageService';
import { FiPlus, FiEdit, FiTrash2, FiEye, FiBarChart2, FiMoreVertical } from 'react-icons/fi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import ConfirmModal from '../../components/common/ConfirmModal';
import TestEditor from '../../components/tests/TestEditor';
import StudentTestTaker from '../../components/tests/StudentTestTaker';
import TestResultsModal from '../../components/tests/TestResultsModal';
import { toast } from 'react-toastify';
import { formatDate } from '../../utils/helpers';
import './TeacherTests.css';

const TeacherTests = () => {
  const { userData } = useAuth();
  const { t } = useTranslation();
  const [tests, setTests] = useState([]);
  const [allTests, setAllTests] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('myTests');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [editingTest, setEditingTest] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, [userData]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [testsResult, allTestsResult, groupsResult] = await Promise.all([
        testService.getTestsByTeacher(userData.uid),
        testService.getAllTests(),
        groupService.getAllGroups()
      ]);

      if (testsResult.success) {
        setTests(testsResult.data);
      }
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
            
            // For arrays (options, matching pairs), clean recursively
            if (Array.isArray(value)) {
              finalQ[key] = value.map(item => {
                if (typeof item === 'object' && item !== null) {
                  const cleaned = {};
                  Object.keys(item).forEach(itemKey => {
                    const itemValue = item[itemKey];
                    // Remove base64 from objects in arrays
                    if (!isBase64DataUrl(itemValue) && 
                        !(itemValue instanceof File) && 
                        !(itemValue instanceof Blob) &&
                        typeof itemValue !== 'function') {
                      cleaned[itemKey] = itemValue;
                    }
                  });
                  return cleaned;
                }
                // Remove base64 from string arrays
                if (!isBase64DataUrl(item)) {
                  return item;
                }
                return null;
              }).filter(item => item !== null);
              return;
            }
            
            finalQ[key] = value;
          }
        });
        
        return finalQ;
      });
    }
    
    // Remove any undefined values from top level
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === undefined || typeof cleaned[key] === 'function') {
        delete cleaned[key];
      }
    });
    
    return cleaned;
  };

  const handleCreateTest = async (testData, imageFilesToUpload = [], removedImageFileNames = []) => {
    try {
      setUploading(true);
      setUploadProgress(0);

      const groupIds = Array.isArray(testData.groupIds) ? testData.groupIds : [];
      const primaryGroupId = groupIds[0] || testData.groupId || null;

      // Step 0: Clean testData - remove all non-serializable objects
      const cleanTestData = cleanTestDataForFirestore(testData);

      // Step 1: Create test in Firestore (without images)
      const result = await testService.createTest({
        ...cleanTestData,
        createdBy: userData.uid,
        createdByName: userData.displayName,
        groupId: primaryGroupId,
        groupIds
      });

      if (result.success) {
        const testId = result.data.id;
        let updatedTestData = { ...cleanTestData };

        // Step 2: Upload images sequentially with progress tracking
        if (imageFilesToUpload && imageFilesToUpload.length > 0) {
          for (let i = 0; i < imageFilesToUpload.length; i++) {
            const imageData = imageFilesToUpload[i];
            const progressCallback = (progress) => {
              // Each image gets an equal segment of the progress bar
              const segmentSize = 100 / imageFilesToUpload.length;
              // Progress from completed images
              const completedProgress = (i / imageFilesToUpload.length) * 100;
              // Progress from current image (0-100) normalized to its segment (0-segmentSize)
              const currentProgress = (progress / 100) * segmentSize;
              const totalProgress = completedProgress + currentProgress;
              setUploadProgress(Math.min(totalProgress, 99));
            };

            const uploadResult = await imageService.uploadTestImage(
              testId,
              imageData.file,
              progressCallback
            );

            if (uploadResult && uploadResult.success) {
              const questionIndex = imageData.questionIndex;
              const question = updatedTestData.questions[questionIndex];

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

            setUploadProgress(Math.round(((i + 1) / imageFilesToUpload.length) * 100));
          }

          // Step 3: Update test in Firestore with image URLs
          await testService.updateTest(testId, updatedTestData);
        }

        setUploadProgress(100);
        toast.success('Test muvaffaqiyatli yaratildi');
        setShowCreateModal(false);
        loadData();
      }
    } catch (error) {
      console.error('Create test error:', error);
      toast.error('Testni yaratishda xatolik');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
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

        // Delete old matching pair images if replaced
        if (oldQuestion.pairs && Array.isArray(oldQuestion.pairs)) {
          const newPairs = newQuestion.pairs || [];
          oldQuestion.pairs.forEach((oldPair, pairIndex) => {
            const newPair = newPairs[pairIndex];
            
            // Check left image replacement
            if (oldPair.leftImageFileName && newPair) {
              if (!newPair.leftImageFileName || oldPair.leftImageFileName !== newPair.leftImageFileName) {
                replaceDeletePromises.push(
                  imageService.deleteTestImage(testId, oldPair.leftImageFileName)
                );
              }
            }
            
            // Check right image replacement
            if (oldPair.rightImageFileName && newPair) {
              if (!newPair.rightImageFileName || oldPair.rightImageFileName !== newPair.rightImageFileName) {
                replaceDeletePromises.push(
                  imageService.deleteTestImage(testId, oldPair.rightImageFileName)
                );
              }
            }
          });
        }

        // Delete old sub-question matching pair images if replaced (for audio questions)
        if (oldQuestion.subQuestions && Array.isArray(oldQuestion.subQuestions)) {
          const newSubQuestions = newQuestion.subQuestions || [];
          oldQuestion.subQuestions.forEach((oldSubQ, subIndex) => {
            const newSubQ = newSubQuestions[subIndex];
            
            if (oldSubQ.pairs && Array.isArray(oldSubQ.pairs) && newSubQ) {
              const newSubPairs = newSubQ.pairs || [];
              oldSubQ.pairs.forEach((oldPair, pairIndex) => {
                const newPair = newSubPairs[pairIndex];
                
                // Check left image replacement
                if (oldPair.leftImageFileName && newPair) {
                  if (!newPair.leftImageFileName || oldPair.leftImageFileName !== newPair.leftImageFileName) {
                    replaceDeletePromises.push(
                      imageService.deleteTestImage(testId, oldPair.leftImageFileName)
                    );
                  }
                }
                
                // Check right image replacement
                if (oldPair.rightImageFileName && newPair) {
                  if (!newPair.rightImageFileName || oldPair.rightImageFileName !== newPair.rightImageFileName) {
                    replaceDeletePromises.push(
                      imageService.deleteTestImage(testId, oldPair.rightImageFileName)
                    );
                  }
                }
              });
            }
          });
        }
      });

      if (replaceDeletePromises.length > 0) {
        await Promise.all(replaceDeletePromises);
      }

      // Step 3: Update test in Firestore with all data
      const result = await testService.updateTest(testId, finalTestData);

      if (result.success) {
        setUploadProgress(100);
        toast.success('Test muvaffaqiyatli o\'zgartirildi');
        setShowEditModal(false);
        setEditingTest(null);
        loadData();
      }
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
      const testId = selectedTest.id;
      
      // Step 1: Get test details to find all images
      const testResult = await testService.getTestById(testId);
      if (testResult.success) {
        const test = testResult.data;
        const deletePromises = [];

        // Collect all image file names to delete from Storage
        if (test.questions && Array.isArray(test.questions)) {
          test.questions.forEach(question => {
            // Delete simple question image
            if (question.imageFileName) {
              deletePromises.push(
                imageService.deleteTestImage(testId, question.imageFileName)
              );
            }

            // Delete matching pair images
            if (question.pairs && Array.isArray(question.pairs)) {
              question.pairs.forEach(pair => {
                if (pair.leftImageFileName) {
                  deletePromises.push(
                    imageService.deleteTestImage(testId, pair.leftImageFileName)
                  );
                }
                if (pair.rightImageFileName) {
                  deletePromises.push(
                    imageService.deleteTestImage(testId, pair.rightImageFileName)
                  );
                }
              });
            }

            // Delete sub-question matching pair images (audio questions)
            if (question.subQuestions && Array.isArray(question.subQuestions)) {
              question.subQuestions.forEach(subQ => {
                if (subQ.pairs && Array.isArray(subQ.pairs)) {
                  subQ.pairs.forEach(pair => {
                    if (pair.leftImageFileName) {
                      deletePromises.push(
                        imageService.deleteTestImage(testId, pair.leftImageFileName)
                      );
                    }
                    if (pair.rightImageFileName) {
                      deletePromises.push(
                        imageService.deleteTestImage(testId, pair.rightImageFileName)
                      );
                    }
                  });
                }
              });
            }

            // Delete audio file if exists
            if (question.audioFileName) {
              deletePromises.push(
                imageService.deleteTestImage(testId, question.audioFileName)
              );
            }
          });
        }

        // Delete all images from Storage
        if (deletePromises.length > 0) {
          await Promise.all(deletePromises);
        }
      }

      // Step 2: Delete test from Firestore (this also deletes test answers)
      const result = await testService.deleteTest(testId);

      if (result.success) {
        toast.success('Test va uning rasmlar muvaffaqiyatli o\'chirildi');
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

  const filteredTests = (activeTab === 'myTests' ? tests : allTests).filter(test => {
    const matchesSearch = test.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTeacher = activeTab === 'myTests' || !selectedTeacherFilter || test.createdByName === selectedTeacherFilter;
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
        {activeTab === 'myTests' && (
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <FiPlus /> {t('teacher.tests.newTest')}
          </button>
        )}
      </div>

      <div className="tests-tabs">
        <button
          className={`tab-button ${activeTab === 'myTests' ? 'active' : ''}`}
          onClick={() => setActiveTab('myTests')}
        >
          {t('teacher.tests.myTests')}
        </button>
        <button
          className={`tab-button ${activeTab === 'allTests' ? 'active' : ''}`}
          onClick={() => setActiveTab('allTests')}
        >
          {t('teacher.tests.allTests')}
        </button>
      </div>

      <div className="tests-search">
        <input
          type="text"
          placeholder={t('teacher.tests.searchTests') + '...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        {activeTab === 'allTests' && (
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
        )}
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
                    {(() => {
                      let total = 0;
                      (test.questions || []).forEach(q => {
                        if (q.type === 'audio' && q.subQuestions) {
                          total += 1 + q.subQuestions.length;
                        } else {
                          total += 1;
                        }
                      });
                      return total;
                    })()} {t('tests.questionsFrom')} • {getGroupName(test)}
                    {activeTab === 'allTests' && test.createdByName && (
                      <> • <span className="teacher-name">{test.createdByName}</span></>
                    )}
                  </p>
                </div>
                <div className="test-actions">
                  {activeTab === 'allTests' && (
                    <button
                      className="btn btn-sm btn-icon"
                      onClick={() => {
                        setSelectedTest(test);
                        setShowViewModal(true);
                      }}
                      title={t('student.tests.viewQuestions')}
                    >
                      <FiEye /> {t('student.tests.viewQuestions')}
                    </button>
                  )}
                  {activeTab === 'myTests' && (
                    <button
                      className="btn btn-sm btn-icon"
                      onClick={() => handleViewResults(test)}
                      title={t('teacher.tests.viewResults')}
                    >
                      <FiBarChart2 /> {t('teacher.tests.viewResults')}
                    </button>
                  )}
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
                        {activeTab === 'allTests' && (
                          <button
                            className="dropdown-menu-item"
                            onClick={() => {
                              handleViewResults(test);
                              setOpenDropdownId(null);
                            }}
                          >
                            <FiBarChart2 /> {t('teacher.tests.viewResults')}
                          </button>
                        )}
                        {activeTab === 'myTests' && (
                          <>
                            <button
                              className="dropdown-menu-item"
                              onClick={() => {
                                handleViewResults(test);
                                setOpenDropdownId(null);
                              }}
                            >
                              <FiBarChart2 /> {t('teacher.tests.viewResults')}
                            </button>
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
                          </>
                        )}
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

      {/* Create Test Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => !uploading && setShowCreateModal(false)}
        title={t('teacher.tests.newTest')}
        size="large"
        disableEscClose={uploading}
      >
        {uploading && (
          <div className="upload-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <span className="progress-text">{Math.round(uploadProgress)}% - {t('common.uploading')}</span>
          </div>
        )}
        <TestEditor
          groups={groups}
          onSave={handleCreateTest}
          onCancel={() => !uploading && setShowCreateModal(false)}
          disabled={uploading}
        />
      </Modal>

      {/* Edit Test Modal */}
      {editingTest && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            if (!uploading) {
              setShowEditModal(false);
              setEditingTest(null);
            }
          }}
          title={t('teacher.tests.edit')}
          size="large"
          disableEscClose={uploading}
        >
          {uploading && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <span className="progress-text">{Math.round(uploadProgress)}% - {t('common.uploading')}</span>
            </div>
          )}
          <TestEditor
            initialData={editingTest}
            groups={groups}
            onSave={handleEditTest}
            onCancel={() => {
              if (!uploading) {
                setShowEditModal(false);
                setEditingTest(null);
              }
            }}
            disabled={uploading}
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

      {/* View Test Questions Modal */}
      {selectedTest && (
        <Modal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedTest(null);
          }}
          title={selectedTest.title}
          size="large"
        >
          <StudentTestTaker
            test={selectedTest}
            onCancel={() => {
              setShowViewModal(false);
              setSelectedTest(null);
            }}
            readOnly={true}
          />
        </Modal>
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

export default TeacherTests;
