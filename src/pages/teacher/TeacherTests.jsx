import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { testService } from '../../services/testService';
import { groupService } from '../../services/groupService';
import { FiPlus, FiEdit, FiTrash2, FiEye, FiBarChart2 } from 'react-icons/fi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import ConfirmModal from '../../components/common/ConfirmModal';
import TestEditor from '../../components/tests/TestEditor';
import TestResultsModal from '../../components/tests/TestResultsModal';
import { toast } from 'react-toastify';
import { formatDate } from '../../utils/helpers';
import './TeacherTests.css';

const TeacherTests = () => {
  const { userData } = useAuth();
  const { t } = useTranslation();
  const [tests, setTests] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [editingTest, setEditingTest] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [userData]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [testsResult, groupsResult] = await Promise.all([
        testService.getTestsByTeacher(userData.uid),
        groupService.getAllGroups()
      ]);

      if (testsResult.success) {
        setTests(testsResult.data);
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

  const handleCreateTest = async (testData) => {
    try {
      const result = await testService.createTest({
        ...testData,
        createdBy: userData.uid,
        createdByName: userData.displayName,
        groupId: testData.groupId || null
      });

      if (result.success) {
        toast.success('Test muvaffaqiyatli yaratildi');
        setShowCreateModal(false);
        loadData();
      }
    } catch (error) {
      console.error('Create test error:', error);
      toast.error('Testni yaratishda xatolik');
    }
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

  const filteredTests = tests.filter(test =>
    test.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getGroupName = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : t('tests.forAll');
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="tests-container">
      <div className="tests-header">
        <h1>{t('teacher.tests.title')}</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          <FiPlus /> {t('teacher.tests.newTest')}
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
                    {test.questions?.length || 0} {t('tests.questionsFrom')} • {getGroupName(test.groupId)}
                  </p>
                </div>
                <div className="test-actions">
                  <button
                    className="btn btn-sm btn-icon"
                    onClick={() => handleViewResults(test)}
                    title={t('teacher.tests.viewResults')}
                  >
                    <FiBarChart2 />
                  </button>
                  <button
                    className="btn btn-sm btn-icon"
                    onClick={() => {
                      setEditingTest(test);
                      setShowEditModal(true);
                    }}
                    title={t('teacher.tests.edit')}
                  >
                    <FiEdit />
                  </button>
                  <button
                    className="btn btn-sm btn-icon btn-danger"
                    onClick={() => {
                      setSelectedTest(test);
                      setShowDeleteConfirm(true);
                    }}
                    title={t('teacher.tests.delete')}
                  >
                    <FiTrash2 />
                  </button>
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
