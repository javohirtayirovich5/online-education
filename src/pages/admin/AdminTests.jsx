import { useState, useEffect } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { testService } from '../../services/testService';
import { groupService } from '../../services/groupService';
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

  const handleEditTest = async (testData) => {
    try {
      const result = await testService.updateTest(editingTest.id, testData);

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
        <h1>{t('teacher.tests.title')}</h1>
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
