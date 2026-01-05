import { useState, useEffect } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { testService } from '../../services/testService';
import { FiX } from 'react-icons/fi';
import LoadingSpinner from '../common/LoadingSpinner';
import './TestResultsModal.css';

const TestResultsModal = ({ isOpen, onClose, test }) => {
  const { t } = useTranslation();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('score'); // 'score' or 'name'

  useEffect(() => {
    if (isOpen) {
      loadResults();
    }
  }, [isOpen, test]);

  const loadResults = async () => {
    setLoading(true);
    try {
      const result = await testService.getTestSubmissions(test.id);
      if (result.success) {
        setSubmissions(result.data);
      }
    } catch (error) {
      console.error('Load results error:', error);
    }
    setLoading(false);
  };

  const getSortedSubmissions = () => {
    const sorted = [...submissions];
    if (sortBy === 'score') {
      sorted.sort((a, b) => (b.score || 0) - (a.score || 0));
    } else {
      sorted.sort((a, b) => (a.studentName || '').localeCompare(b.studentName || ''));
    }
    return sorted;
  };

  if (!isOpen) return null;

  const sortedSubmissions = getSortedSubmissions();
  const avgScore = submissions.length > 0 
    ? (submissions.reduce((sum, s) => sum + (s.score || 0), 0) / submissions.length).toFixed(2)
    : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{test.title} - {t('teacher.tests.viewResults')}</h2>
          <button className="modal-close" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="modal-body">
          {/* Statistics */}
          <div className="results-stats">
            <div className="stat-card">
              <span className="stat-label">{t('assignments.title')}</span>
              <span className="stat-value">{submissions.length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">{t('teacher.grades.averageGrade')}</span>
              <span className="stat-value">{avgScore}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">{t('teacher.grades.highest')}</span>
              <span className="stat-value">
                {submissions.length > 0 
                  ? Math.max(...submissions.map(s => s.score || 0))
                  : 0}
              </span>
            </div>
          </div>

          {/* Sort Controls */}
          <div className="results-controls">
            <label>{t('teacher.grades.sortBy')}:</label>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="form-select"
            >
              <option value="score">{t('teacher.grades.sortByGrade')}</option>
              <option value="name">{t('teacher.grades.sortByName')}</option>
            </select>
          </div>

          {/* Results List */}
          {loading ? (
            <LoadingSpinner />
          ) : sortedSubmissions.length === 0 ? (
            <div className="empty-state">
              <p>{t('assignments.noAssignments')}</p>
            </div>
          ) : (
            <div className="results-table">
              <div className="table-header">
                <div className="col-rank">#</div>
                <div className="col-name">{t('teacher.grades.studentName')}</div>
                <div className="col-score">{t('tests.score')}</div>
                <div className="col-percentage">{t('attendance.percentage')}</div>
                <div className="col-date">{t('common.date')}</div>
              </div>

              {sortedSubmissions.map((submission, index) => (
                <div key={submission.id} className="table-row">
                  <div className="col-rank">
                    <span className={`rank-badge rank-${index + 1}`}>
                      {index + 1}
                    </span>
                  </div>
                  <div className="col-name">{submission.studentName}</div>
                  <div className="col-score">
                    <strong>{submission.score || 0} / {submission.maxScore}</strong>
                  </div>
                  <div className="col-percentage">
                    <div className="percentage-bar">
                      <div 
                        className="percentage-fill"
                        style={{ width: `${submission.percentage || 0}%` }}
                      />
                    </div>
                    <span>{submission.percentage}%</span>
                  </div>
                  <div className="col-date">
                    {new Date(submission.submittedAt).toLocaleDateString('uz-UZ')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestResultsModal;
