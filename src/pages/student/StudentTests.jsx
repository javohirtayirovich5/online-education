import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { testService } from '../../services/testService';
import { FiPlay, FiBarChart2, FiClock } from 'react-icons/fi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import StudentTestTaker from '../../components/tests/StudentTestTaker';
import TestResultsCard from '../../components/tests/TestResultsCard';
import { toast } from 'react-toastify';
import { formatDate } from '../../utils/helpers';
import './StudentTests.css';

const StudentTests = () => {
  const { userData } = useAuth();
  const [tests, setTests] = useState([]);
  const [completedTests, setCompletedTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [selectedTab, setSelectedTab] = useState('available'); // 'available' or 'results'
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTests();
  }, [userData]);

  const loadTests = async () => {
    setLoading(true);
    try {
      const testsResult = await testService.getTestsForStudent(userData.groupId);
      
      if (testsResult.success) {
        const allTests = testsResult.data;
        const completed = [];
        const available = [];

        for (const test of allTests) {
          const submissionResult = await testService.getStudentTestSubmission(
            userData.uid,
            test.id
          );

          if (submissionResult.success) {
            completed.push({
              ...test,
              submission: submissionResult.data
            });
          } else {
            available.push(test);
          }
        }

        setTests(available);
        setCompletedTests(completed);
      }
    } catch (error) {
      console.error('Load tests error:', error);
      toast.error('Testlarni yuklashda xatolik');
    }
    setLoading(false);
  };

  const handleStartTest = (test) => {
    setSelectedTest(test);
    setShowTestModal(true);
  };

  const handleTestComplete = async () => {
    setShowTestModal(false);
    setSelectedTest(null);
    toast.success('Test muvaffaqiyatli yuborildi');
    loadTests();
  };

  const availableFiltered = tests.filter(test =>
    test.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const completedFiltered = completedTests.filter(test =>
    test.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="student-tests-container">
      <div className="tests-header">
        <h1>Testlar</h1>
      </div>

      <div className="tests-tabs">
        <button
          className={`tab ${selectedTab === 'available' ? 'active' : ''}`}
          onClick={() => setSelectedTab('available')}
        >
          <FiPlay size={18} />
          Mavjud testlar ({tests.length})
        </button>
        <button
          className={`tab ${selectedTab === 'results' ? 'active' : ''}`}
          onClick={() => setSelectedTab('results')}
        >
          <FiBarChart2 size={18} />
          Mening natijalarim ({completedTests.length})
        </button>
      </div>

      <div className="tests-search">
        <input
          type="text"
          placeholder="Test qidirish..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {selectedTab === 'available' ? (
        <div className="available-tests">
          {availableFiltered.length === 0 ? (
            <div className="empty-state">
              <p>Hozircha mavjud testlar yo'q</p>
            </div>
          ) : (
            <div className="tests-grid">
              {availableFiltered.map(test => (
                <div key={test.id} className="test-item">
                  <div className="test-item-header">
                    <h3>{test.title}</h3>
                  </div>
                  <div className="test-item-body">
                    <p className="test-description">{test.description}</p>
                    <div className="test-details">
                      <span className="test-questions">
                        {test.questions?.length || 0} savol
                      </span>
                      <span className="test-date">
                        {formatDate(test.createdAt)}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn btn-primary btn-block"
                    onClick={() => handleStartTest(test)}
                  >
                    <FiPlay /> Testni boshlash
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="results-tests">
          {completedFiltered.length === 0 ? (
            <div className="empty-state">
              <p>Siz hali testlarni yakunlamagan</p>
            </div>
          ) : (
            <div className="results-list">
              {completedFiltered.map(test => (
                <TestResultsCard
                  key={test.id}
                  test={test}
                  submission={test.submission}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Test Taker Modal */}
      {selectedTest && (
        <Modal
          isOpen={showTestModal}
          onClose={() => setShowTestModal(false)}
          title={selectedTest.title}
          size="fullscreen"
          closeButtonVisible={false}
        >
          <StudentTestTaker
            test={selectedTest}
            onComplete={handleTestComplete}
            onCancel={() => setShowTestModal(false)}
          />
        </Modal>
      )}
    </div>
  );
};

export default StudentTests;
