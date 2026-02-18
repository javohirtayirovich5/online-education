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

  const handleCreateTest = async (testData, imageFilesToUpload = [], removedImageFileNames = []) => {
    try {
      const groupIds = Array.isArray(testData.groupIds) ? testData.groupIds : [];
      const primaryGroupId = groupIds[0] || testData.groupId || null;

      // Step 1: Create test in Firestore
      const result = await testService.createTest({
        ...testData,
        createdBy: userData.uid,
        createdByName: userData.displayName,
        groupId: primaryGroupId,
        groupIds
      });

      if (result.success) {
        const testId = result.data.id;
        let updatedTestData = { ...testData };

        // Step 2: Upload images for questions that have them
        if (imageFilesToUpload && imageFilesToUpload.length > 0) {
          const uploadPromises = imageFilesToUpload.map(imageData =>
            imageService.uploadTestImage(testId, imageData.file)
          );

          const uploadResults = await Promise.all(uploadPromises);

          // Step 3: Update test data with image URLs
          uploadResults.forEach((uploadResult, index) => {
            if (uploadResult && uploadResult.success) {
              const questionIndex = imageFilesToUpload[index].questionIndex;
              updatedTestData.questions[questionIndex] = {
                ...updatedTestData.questions[questionIndex],
                imageUrl: uploadResult.url,
                imageFileName: uploadResult.fileName
              };
            }
          });

          // Step 4: Update test in Firestore with image URLs
          await testService.updateTest(testId, updatedTestData);
        }

        toast.success('Test muvaffaqiyatli yaratildi');
        setShowCreateModal(false);
        loadData();
      }
    } catch (error) {
      console.error('Create test error:', error);
      toast.error('Testni yaratishda xatolik');
    }
  };

  const handleEditTest = async (testData, imageFilesToUpload = [], removedImageFileNames = []) => {
    try {
      const testId = editingTest.id;
      let finalTestData = { ...testData };

      // Step 1: Upload images first (if any) to get URLs
      if (imageFilesToUpload && imageFilesToUpload.length > 0) {
        const uploadPromises = imageFilesToUpload.map(imageData =>
          imageService.uploadTestImage(testId, imageData.file)
        );

        const uploadResults = await Promise.all(uploadPromises);

        // Update test data with new image URLs
        uploadResults.forEach((uploadResult, index) => {
          if (uploadResult && uploadResult.success) {
            const questionIndex = imageFilesToUpload[index].questionIndex;
            finalTestData.questions[questionIndex] = {
              ...finalTestData.questions[questionIndex],
              imageUrl: uploadResult.url,
              imageFileName: uploadResult.fileName
            };
          }
        });
      }

      // Step 2: Delete removed images and replaced images
      const deletePromises = [];
      
      // Delete explicitly removed images (remove button clicked)
      if (removedImageFileNames && removedImageFileNames.length > 0) {
        removedImageFileNames.forEach(fileName => {
          deletePromises.push(imageService.deleteTestImage(testId, fileName));
        });
      }
      
      // Also delete old images if they were replaced
      editingTest.questions.forEach((oldQuestion, index) => {
        const newQuestion = finalTestData.questions[index];
        
        // If old question had an image and new one doesn't, or image changed
        if (oldQuestion.imageFileName && 
            (!newQuestion.imageFileName || oldQuestion.imageFileName !== newQuestion.imageFileName) &&
            !removedImageFileNames.includes(oldQuestion.imageFileName)) {
          deletePromises.push(imageService.deleteTestImage(testId, oldQuestion.imageFileName));
        }
      });

      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
      }

      // Step 3: Update test in Firestore with all data (including new image URLs)
      const result = await testService.updateTest(testId, finalTestData);

      if (result.success) {
        toast.success('Test muvaffaqiyatli o\'zgartirildi');
        setShowEditModal(false);
        setEditingTest(null);
        loadData();
      }
    } catch (error) {
      console.error('Update test error:', error);
      toast.error('Testni o\'zgartirishda xatolik');
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
                    {test.questions?.length || 0} {t('tests.questionsFrom')} • {getGroupName(test)}
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
        onClose={() => setShowCreateModal(false)}
        title={t('teacher.tests.newTest')}
        size="large"
        disableEscClose={true}
      >
        <TestEditor
          groups={groups}
          onSave={handleCreateTest}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

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
