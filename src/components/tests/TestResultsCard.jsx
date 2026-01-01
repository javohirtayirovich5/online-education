import './TestResultsCard.css';

const TestResultsCard = ({ test, submission }) => {
  const getResultStatus = (percentage) => {
    if (percentage >= 80) return { status: 'excellent', text: 'A\'lo' };
    if (percentage >= 70) return { status: 'good', text: 'Yaxshi' };
    if (percentage >= 60) return { status: 'satisfactory', text: 'Qoniqarli' };
    if (percentage >= 50) return { status: 'pass', text: 'Qabul' };
    return { status: 'fail', text: 'Rad' };
  };

  const percentage = submission.percentage || 0;
  const result = getResultStatus(percentage);

  return (
    <div className={`test-result-card ${result.status}`}>
      <div className="result-header">
        <div className="result-title">
          <h3>{test.title}</h3>
          <span className="result-date">
            {new Date(submission.submittedAt).toLocaleDateString('uz-UZ')}
          </span>
        </div>
        <div className={`result-badge ${result.status}`}>
          {result.text}
        </div>
      </div>

      <div className="result-content">
        <div className="result-score">
          <div className="score-display">
            <div className="score-circle" style={{
              background: `conic-gradient(
                var(--${result.status}-color) ${percentage}%,
                #e0e0e0 ${percentage}%
              )`
            }}>
              <div className="score-inner">
                <span className="score-percentage">{percentage}%</span>
              </div>
            </div>
          </div>

          <div className="score-details">
            <div className="detail-item">
              <span className="label">To'plangan:</span>
              <span className="value">{submission.score} / {submission.maxScore}</span>
            </div>
            <div className="detail-item">
              <span className="label">Status:</span>
              <span className={`value status-${result.status}`}>
                {result.text}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestResultsCard;
