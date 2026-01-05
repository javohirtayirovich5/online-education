import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { testService } from '../../services/testService';
import { FiPlay, FiBarChart2, FiClock } from 'react-icons/fi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import TestResultsCard from '../../components/tests/TestResultsCard';
import { toast } from 'react-toastify';
import { formatDate } from '../../utils/helpers';
import './StudentTests.css';

const StudentTests = () => {
  const { userData } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [completedTests, setCompletedTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTab, setSelectedTab] = useState(searchParams.get('tab') || 'available'); // 'available' or 'results'
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (userData && userData.groupId) {
      loadTests();
    } else {
      setLoading(false);
    }
  }, [userData]);

  const loadTests = async () => {
    if (!userData || !userData.groupId || !userData.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const testsResult = await testService.getTestsForStudent(userData.groupId);
      
      if (testsResult.success) {
        const allTests = testsResult.data || [];
        const completed = [];
        const available = [];

        // Check submissions for each test in parallel for better performance
        const submissionPromises = allTests.map(test =>
          testService.getStudentTestSubmission(userData.uid, test.id)
            .catch(err => {
              console.error('Get submission error:', err);
              return { success: false, error: err.message };
            })
        );

        const submissions = await Promise.all(submissionPromises);

        allTests.forEach((test, index) => {
          const submissionResult = submissions[index];
          if (submissionResult && submissionResult.success && submissionResult.data) {
            completed.push({
              ...test,
              submission: submissionResult.data
            });
          } else {
            available.push(test);
          }
        });

        setTests(available);
        setCompletedTests(completed);
      } else {
        console.error('Get tests error:', testsResult.error);
        toast.error('Testlarni yuklashda xatolik');
      }
    } catch (error) {
      console.error('Load tests error:', error);
      toast.error('Testlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = (test) => {
    navigate(`/tests/${test.id}`);
  };

  const handleTestComplete = async () => {
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
        <h1>{t('student.tests.title')}</h1>
      </div>

      <div className="tests-tabs">
        <button
          className={`tab ${selectedTab === 'available' ? 'active' : ''}`}
          onClick={() => {
            setSelectedTab('available');
            setSearchParams({});
          }}
        >
          <FiPlay size={18} />
          {t('student.tests.availableTests')} ({tests.length})
        </button>
        <button
          className={`tab ${selectedTab === 'results' ? 'active' : ''}`}
          onClick={() => {
            setSelectedTab('results');
            setSearchParams({ tab: 'results' });
          }}
        >
          <FiBarChart2 size={18} />
          {t('student.tests.completedTests')} ({completedTests.length})
        </button>
      </div>

      <div className="tests-search">
        <input
          type="text"
          placeholder={t('common.search') + '...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {selectedTab === 'available' ? (
        <div className="available-tests">
          {availableFiltered.length === 0 ? (
            <div className="empty-state">
              <p>{t('student.tests.noTests')}</p>
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
                        {test.questions?.length || 0} {t('tests.questions')}
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
                    <FiPlay /> {t('student.tests.startTest')}
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
              <p>{t('student.tests.noTests')}</p>
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
    </div>
  );
};

export default StudentTests;
