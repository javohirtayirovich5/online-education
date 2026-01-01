import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { testService } from '../../services/testService';
import { FiClock, FiCheckCircle, FiChevronRight } from 'react-icons/fi';
import { toast } from 'react-toastify';
import './StudentTestTaker.css';

const StudentTestTaker = ({ test, onComplete, onCancel }) => {
  const { userData } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(test.timeLimit ? test.timeLimit * 60 : null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(null);

  useEffect(() => {
    if (!timeRemaining || !testStarted) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, testStarted]);

  const formatTime = (seconds) => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (answer) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion]: answer
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestion < test.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmitTest = async () => {
    setIsSubmitting(true);
    try {
      // Calculate score
      const { score: testScore, maxScore } = testService.calculateScore(test.questions, answers);
      
      // Save answers
      const result = await testService.saveAnswers({
        studentId: userData.uid,
        studentName: userData.displayName,
        testId: test.id,
        testTitle: test.title,
        groupId: userData.groupId,
        answers: answers,
        score: testScore,
        maxScore: maxScore,
        percentage: (testScore / maxScore * 100).toFixed(2)
      });

      if (result.success) {
        setScore({
          earned: testScore,
          max: maxScore,
          percentage: (testScore / maxScore * 100).toFixed(2)
        });
        setShowResults(true);
        toast.success('Test muvaffaqiyatli yuborildi');
      }
    } catch (error) {
      console.error('Submit test error:', error);
      toast.error('Testni yuborishda xatolik');
    }
    setIsSubmitting(false);
  };

  if (showResults && score) {
    return (
      <div className="test-results-container">
        <div className="results-content">
          <FiCheckCircle className="results-icon" />
          <h2>Test yakunlandi!</h2>
          <div className="results-score">
            <div className="score-circle">
              <span className="score-percentage">{score.percentage}%</span>
            </div>
            <div className="score-details">
              <p>To'plangan ball: <strong>{score.earned} / {score.max}</strong></p>
              <p>Siz testni muvaffaqiyatli yakunladingiz</p>
            </div>
          </div>
          <button 
            className="btn btn-primary"
            onClick={onComplete}
          >
            Tugatish
          </button>
        </div>
      </div>
    );
  }

  if (!testStarted) {
    return (
      <div className="test-start-container">
        <div className="start-content">
          <h2>{test.title}</h2>
          <p className="test-description">{test.description}</p>
          
          <div className="test-info">
            <div className="info-item">
              <span className="label">Savollar soni:</span>
              <span className="value">{test.questions.length}</span>
            </div>
            {test.timeLimit && (
              <div className="info-item">
                <span className="label">Vaqt chegarasi:</span>
                <span className="value">{test.timeLimit} daqiqa</span>
              </div>
            )}
            <div className="info-item">
              <span className="label">Umumiy ball:</span>
              <span className="value">{test.questions.reduce((sum, q) => sum + (q.points || 1), 0)}</span>
            </div>
          </div>

          <div className="start-warning">
            <p>⚠️ Testni boshlashdan keyin orqaga qaytish mumkin emas. Testni to'liq o'qib chiqing va ehtiyot bo'ling.</p>
          </div>

          <div className="start-actions">
            <button className="btn btn-outline" onClick={onCancel}>
              Bekor qilish
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => setTestStarted(true)}
            >
              Testni boshlash
            </button>
          </div>
        </div>
      </div>
    );
  }

  const question = test.questions[currentQuestion];
  const isAnswered = answers[currentQuestion] !== undefined;

  return (
    <div className="test-taker">
      {/* Header */}
      <div className="test-taker-header">
        <div className="test-progress">
          <span>Savol {currentQuestion + 1} / {test.questions.length}</span>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${((currentQuestion + 1) / test.questions.length) * 100}%` }}
            />
          </div>
        </div>

        {test.timeLimit && (
          <div className={`timer ${timeRemaining && timeRemaining < 60 ? 'warning' : ''}`}>
            <FiClock />
            <span>{formatTime(timeRemaining)}</span>
          </div>
        )}
      </div>

      {/* Question */}
      <div className="test-taker-content">
        <div className="question-section">
          <h2>{question.text}</h2>
          <span className="question-points">({question.points} ball)</span>
        </div>

        {/* Answers */}
        {question.type === 'multiple' && (
          <div className="answers-section">
            {question.options.map((option, index) => (
              <label key={index} className="answer-option">
                <input
                  type="radio"
                  name="answer"
                  value={index}
                  checked={answers[currentQuestion] === index}
                  onChange={(e) => handleAnswerChange(parseInt(e.target.value))}
                />
                <span className="option-text">{option}</span>
              </label>
            ))}
          </div>
        )}

        {question.type === 'text' && (
          <div className="text-answer-section">
            <textarea
              value={answers[currentQuestion] || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
              placeholder="Javobingizni yozing..."
              className="text-answer"
              rows="4"
            />
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="test-taker-footer">
        <div className="navigation-buttons">
          <button
            className="btn btn-outline"
            onClick={handlePreviousQuestion}
            disabled={currentQuestion === 0}
          >
            Oldingi
          </button>

          {currentQuestion < test.questions.length - 1 ? (
            <button
              className="btn btn-secondary"
              onClick={handleNextQuestion}
            >
              Keyingi
              <FiChevronRight />
            </button>
          ) : (
            <button
              className="btn btn-success"
              onClick={handleSubmitTest}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Jo\'natilmoqda...' : 'Testni jo\'natish'}
            </button>
          )}
        </div>

        {/* Question Indicators */}
        <div className="question-indicators">
          {test.questions.map((_, index) => (
            <button
              key={index}
              className={`indicator ${
                index === currentQuestion ? 'active' : 
                answers[index] !== undefined ? 'answered' : ''
              }`}
              onClick={() => setCurrentQuestion(index)}
              title={`Savol ${index + 1}`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentTestTaker;
