import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { testService } from '../../services/testService';
import { FiClock, FiCheckCircle, FiChevronRight, FiMaximize2, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import AudioPlayer from './AudioPlayer';
import './StudentTestTaker.css';
import { useTranslation } from '../../hooks/useTranslation';

const StudentTestTaker = ({ test, onComplete, onCancel, readOnly = false }) => {
  const { userData } = useAuth();
  const { t } = useTranslation();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(readOnly ? null : (test.timeLimit ? test.timeLimit * 60 : null));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testStarted, setTestStarted] = useState(readOnly ? true : false);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(null);
  const [matchingState, setMatchingState] = useState({});
  const [matchingShuffled, setMatchingShuffled] = useState({});
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const svgRef = useRef(null);
  const clozeRef = useRef(null);
  const subQuestionClozeRefs = useRef({});

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

  const buildClozeHtml = (q, studentAns = {}) => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = q.text || '';
    // DEBUG: inspect stored HTML and bank
    try {
      console.debug('[buildClozeHtml] q.id?', q.id, 'textLen', (q.text || '').length, 'bankLen', (q.bank || []).length);
    } catch (e) { /* ignore */ }
    const selects = wrapper.querySelectorAll('select[data-blank-id]');
    selects.forEach(sel => {
      const id = sel.getAttribute('data-blank-id');
      const newSel = document.createElement('select');
      newSel.setAttribute('data-blank-id', id);
      const empty = document.createElement('option');
      empty.value = '';
      empty.textContent = '———';
      newSel.appendChild(empty);
      (q.bank || []).forEach(w => {
        const o = document.createElement('option');
        o.value = w;
        o.textContent = w;
        newSel.appendChild(o);
      });
      if (studentAns && typeof studentAns[id] !== 'undefined') {
        newSel.value = studentAns[id] === null ? '' : studentAns[id];
      }
      sel.parentNode.replaceChild(newSel, sel);
    });
    return wrapper.innerHTML;
  };

  // Render wordbank HTML when question changes
  useEffect(() => {
    const question = test.questions[currentQuestion];
    if (!question) return;
    
    // Render main wordbank question
    if (question.type === 'wordbank' && clozeRef.current) {
      try {
        const builtHtml = buildClozeHtml(question, answers[currentQuestion] || {});
        clozeRef.current.innerHTML = builtHtml;
        // Attach fresh change listeners
        const sels = clozeRef.current.querySelectorAll('select[data-blank-id]');
        sels.forEach(sel => {
          sel.addEventListener('change', (e) => {
            const id = e.target.getAttribute('data-blank-id');
            setAnswers(prev => ({ ...prev, [currentQuestion]: { ...(prev[currentQuestion] || {}), [id]: e.target.value } }));
          });
        });
      } catch (err) {
        console.error('Error rendering wordbank:', err);
      }
    }
    
    // Render audio wordbank sub-questions
    if (question.type === 'audio') {
      (question.subQuestions || []).forEach((subQ, subIndex) => {
        if (subQ.type === 'wordbank') {
          const refKey = `${currentQuestion}_${subIndex}`;
          const ref = subQuestionClozeRefs.current[refKey];
          if (ref) {
            try {
              const builtHtml = buildClozeHtml(subQ, answers[currentQuestion]?.subAnswers?.[subIndex] || {});
              ref.innerHTML = builtHtml;
              // Attach fresh change listeners
              const sels = ref.querySelectorAll('select[data-blank-id]');
              sels.forEach(sel => {
                sel.addEventListener('change', (e) => {
                  const id = e.target.getAttribute('data-blank-id');
                  setAnswers(prev => ({
                    ...prev,
                    [currentQuestion]: {
                      ...(prev[currentQuestion] || {}),
                      subAnswers: {
                        ...(prev[currentQuestion]?.subAnswers || {}),
                        [subIndex]: { ...(prev[currentQuestion]?.subAnswers?.[subIndex] || {}), [id]: e.target.value }
                      }
                    }
                  }));
                });
              });
            } catch (err) {
              console.error('Error rendering audio wordbank subquestion:', err);
            }
          }
        }
      });
    }
  }, [currentQuestion, test.questions]);

  // Sync select values when answers change (but don't re-render HTML)
  useEffect(() => {
    const question = test.questions[currentQuestion];
    if (!question) return;
    
    if (question.type === 'wordbank' && clozeRef.current) {
      const sels = clozeRef.current.querySelectorAll('select[data-blank-id]');
      const studentAns = answers[currentQuestion] || {};
      sels.forEach(sel => {
        const id = sel.getAttribute('data-blank-id');
        const val = studentAns[id];
        if (typeof val !== 'undefined' && val !== null) {
          sel.value = val;
        }
      });
    } else if (question.type === 'audio') {
      (question.subQuestions || []).forEach((subQ, subIndex) => {
        if (subQ.type === 'wordbank') {
          const refKey = `${currentQuestion}_${subIndex}`;
          const ref = subQuestionClozeRefs.current[refKey];
          if (ref) {
            const sels = ref.querySelectorAll('select[data-blank-id]');
            const subAnswer = answers[currentQuestion]?.subAnswers?.[subIndex] || {};
            sels.forEach(sel => {
              const id = sel.getAttribute('data-blank-id');
              const val = subAnswer[id];
              if (typeof val !== 'undefined' && val !== null) {
                sel.value = val;
              }
            });
          }
        }
      });
    }
  }, [answers, currentQuestion, test.questions]);

  const formatTime = (seconds) => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const shuffle = (arr) => {
    const newArr = [...arr];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  };

  const drawMatchingLines = () => {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }
    const question = test.questions[currentQuestion];
    if (question?.type !== 'matching') return;
    const state = matchingState[currentQuestion] || {};
    if (!state.matchedPairs || state.matchedPairs.length === 0) return;
    const leftItems = document.querySelectorAll('.matching-left-item');
    const rightItems = document.querySelectorAll('.matching-right-item');
    state.matchedPairs.forEach(pair => {
      const leftEl = Array.from(leftItems).find(el => el.textContent.trim() === pair.left);
      const rightEl = Array.from(rightItems).find(el => el.textContent.trim() === pair.right);
      if (leftEl && rightEl) {
        const leftRect = leftEl.getBoundingClientRect();
        const rightRect = rightEl.getBoundingClientRect();
        const svgRect = svg.getBoundingClientRect();
        const x1 = leftRect.right - svgRect.left;
        const y1 = leftRect.top - svgRect.top + leftRect.height / 2;
        const x2 = rightRect.left - svgRect.left;
        const y2 = rightRect.top - svgRect.top + rightRect.height / 2;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        // Use neutral color for matched lines (do not reveal correctness)
        line.setAttribute('stroke', getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#1976d2');
        line.setAttribute('stroke-width', '3');
        line.setAttribute('stroke-linecap', 'round');
        svg.appendChild(line);
      }
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      drawMatchingLines();
    }, 0);
    return () => clearTimeout(timer);
  }, [matchingState, currentQuestion]);

  const initializeMatchingQuestion = (questionIndex) => {
    const question = test.questions[questionIndex];
    if (question?.type !== 'matching') return;
    if (!matchingShuffled[questionIndex]) {
      const rightItems = shuffle((question.pairs || []).map(p => p.right));
      setMatchingShuffled(prev => ({ ...prev, [questionIndex]: rightItems }));
    }
    if (!matchingState[questionIndex]) {
      setMatchingState(prev => ({
        ...prev,
        [questionIndex]: {
          activeLeft: null,
          activeRight: null,
          matchedPairs: [],
          errorPair: null,
          correctCount: 0
        }
      }));
    }
  };

  const handleMatchingClick = (questionIndex, itemValue, isLeftItem) => {
    // support keys for sub-questions like "{qIndex}_{subIndex}"
    let question;
    if (typeof questionIndex === 'string' && questionIndex.includes('_')) {
      const [qIdx, subIdx] = questionIndex.split('_').map(n => parseInt(n, 10));
      question = test.questions[qIdx]?.subQuestions?.[subIdx];
    } else {
      question = test.questions[questionIndex];
    }
    const state = matchingState[questionIndex] || { matchedPairs: [] };

    // If clicked item is already part of a matched pair, remove that pair (allow changing answer)
    const existingPairIndex = state.matchedPairs.findIndex(p => (p.left === itemValue || p.right === itemValue));
    if (existingPairIndex !== -1) {
      const removed = state.matchedPairs[existingPairIndex];
      const newMatched = state.matchedPairs.filter((_, i) => i !== existingPairIndex);
      setMatchingState(prev => ({
        ...prev,
        [questionIndex]: { ...state, matchedPairs: newMatched }
      }));
      // Update answer stored
      handleAnswerChange({ matchedCount: newMatched.length, total: question.pairs.length });
      return;
    }

    // If clicking an already-matched item -> remove that pair
    // (handled above by existingPairIndex)

    // Clicking an item toggles it as active; clicking a different item on the same side
    // should move the active state to that item immediately.
    if (isLeftItem) {
      if (state.activeLeft === itemValue) {
        setMatchingState(prev => ({ ...prev, [questionIndex]: { ...state, activeLeft: null } }));
        return;
      }

      // If there's an active right selection, create pair immediately
      if (state.activeRight) {
        const leftValue = itemValue;
        const rightValue = state.activeRight;
        const matchingPair = (question?.pairs || []).find(p => p.left === leftValue);
        const isCorrect = matchingPair && matchingPair.right === rightValue;
        const newMatched = [...state.matchedPairs, { left: leftValue, right: rightValue, correct: !!isCorrect }];
        setMatchingState(prev => ({
          ...prev,
          [questionIndex]: {
            ...state,
            matchedPairs: newMatched,
            activeLeft: null,
            activeRight: null,
            correctCount: newMatched.length
          }
        }));
        handleAnswerChange({ matchedCount: newMatched.length, total: (question?.pairs || []).length });
        return;
      }

      // Otherwise set activeLeft to the newly clicked left item (moves if another was active)
      setMatchingState(prev => ({ ...prev, [questionIndex]: { ...state, activeLeft: itemValue } }));
      return;
    }

    // Right side click
    if (!isLeftItem) {
      if (state.activeRight === itemValue) {
        setMatchingState(prev => ({ ...prev, [questionIndex]: { ...state, activeRight: null } }));
        return;
      }

      // If there's an active left selection, create pair immediately
      if (state.activeLeft) {
        const leftValue = state.activeLeft;
        const rightValue = itemValue;
        const matchingPair = (question?.pairs || []).find(p => p.left === leftValue);
        const isCorrect = matchingPair && matchingPair.right === rightValue;
        const newMatched = [...state.matchedPairs, { left: leftValue, right: rightValue, correct: !!isCorrect }];
        setMatchingState(prev => ({
          ...prev,
          [questionIndex]: {
            ...state,
            matchedPairs: newMatched,
            activeLeft: null,
            activeRight: null,
            correctCount: newMatched.length
          }
        }));
        handleAnswerChange({ matchedCount: newMatched.length, total: (question?.pairs || []).length });
        return;
      }

      // Otherwise set activeRight to the newly clicked right item
      setMatchingState(prev => ({ ...prev, [questionIndex]: { ...state, activeRight: itemValue } }));
      return;
    }
  };

  const handleAnswerChange = (answer) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion]: answer
    }));
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  useEffect(() => {
    const question = test.questions[currentQuestion];
    if (question?.type === 'matching') {
      initializeMatchingQuestion(currentQuestion);
    } else if (question?.type === 'audio') {
      (question.subQuestions || []).forEach((subQ, subIndex) => {
        if (subQ.type === 'matching') {
          const subAnswerKey = `${currentQuestion}_${subIndex}`;
          if (!matchingShuffled[subAnswerKey]) {
            const rightItems = shuffle((subQ.pairs || []).map(p => p.right));
            setMatchingShuffled(prev => ({ ...prev, [subAnswerKey]: rightItems }));
          }
          if (!matchingState[subAnswerKey]) {
            setMatchingState(prev => ({
              ...prev,
              [subAnswerKey]: {
                activeLeft: null,
                activeRight: null,
                matchedPairs: [],
                errorPair: null,
                correctCount: 0
              }
            }));
          }
        }
      });
    }
  }, [currentQuestion, test.questions]);

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
    // Check if all questions are properly answered
    const isAnswerValid = (question, questionIndex) => {
      const answer = answers[questionIndex];
      
      // No answer provided
      if (answer === undefined || answer === null) {
        return false;
      }
      
      // Text answer - check if not empty
      if (question.type === 'text') {
        return answer.toString().trim() !== '';
      }
      
      // Wordbank - check if not empty
      if (question.type === 'wordbank') {
        if (typeof answer !== 'object' || Object.keys(answer).length === 0) {
          return false;
        }
        // Check if all blanks have answers
        return Object.values(answer).every(val => val && val.toString().trim() !== '');
      }
      
      // Audio - check all sub-questions
      if (question.type === 'audio') {
        const subAnswers = answer.subAnswers || {};
        return (question.subQuestions || []).every((subQ, subIndex) => {
          const subAnswer = subAnswers[subIndex];
          
          if (subAnswer === undefined || subAnswer === null) {
            return false;
          }
          
          if (subQ.type === 'text') {
            return subAnswer.toString().trim() !== '';
          }
          
          if (subQ.type === 'wordbank') {
            if (typeof subAnswer !== 'object' || Object.keys(subAnswer).length === 0) {
              return false;
            }
            return Object.values(subAnswer).every(val => val && val.toString().trim() !== '');
          }
          
          return true;
        });
      }
      
      // Multiple, truefalse, matching - presence is enough
      return true;
    };

    // Get list of unanswered questions
    const unansweredQuestions = [];
    test.questions.forEach((question, index) => {
      if (!isAnswerValid(question, index)) {
        unansweredQuestions.push(index + 1);
      }
    });

    if (unansweredQuestions.length > 0) {
      const questionsList = unansweredQuestions.join(', ');
      toast.warning(`${unansweredQuestions.length} ta savolga javob tanlanmagan yoki to'ldirilmagan: ${questionsList}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const { score: testScore, maxScore } = testService.calculateScore(test.questions, answers);
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
          <h2>{t('tests.testCompleted')}</h2>
          <div className="results-score">
            <div className="score-circle">
              <span className="score-percentage">{score.percentage}%</span>
            </div>
            <div className="score-details">
              <p>{t('tests.earnedScore')}: <strong>{score.earned} / {score.max}</strong></p>
              <p>{t('tests.testCompletedSuccessfully')}</p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={onComplete}>
            {t('common.close')}
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
              <span className="label">{t('tests.questionsCount')}:</span>
              <span className="value">{test.questions.length}</span>
            </div>
            {test.timeLimit && (
              <div className="info-item">
                <span className="label">{t('tests.timeLimit')}:</span>
                <span className="value">{test.timeLimit} {t('tests.minutes')}</span>
              </div>
            )}
            <div className="info-item">
              <span className="label">{t('tests.totalScore')}:</span>
              <span className="value">{test.questions.reduce((sum, q) => sum + (q.points || 1), 0)}</span>
            </div>
          </div>
          {!readOnly && (
            <>
              <div className="start-warning">
                <p>⚠️ {t('tests.startWarning')}</p>
              </div>
              <div className="start-actions">
                <button className="btn btn-outline" onClick={onCancel}>
                  {t('common.cancel')}
                </button>
                <button className="btn btn-primary" onClick={() => setTestStarted(true)}>
                  {t('tests.startTest')}
                </button>
              </div>
            </>
          )}
          {readOnly && (
            <div className="start-actions">
              <button className="btn btn-outline" onClick={onCancel}>
                {t('common.close')}
              </button>
              <button className="btn btn-primary" onClick={() => setTestStarted(true)}>
                {t('student.tests.viewQuestions')}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const question = test.questions[currentQuestion];

  return (
    <div className="test-taker">
      <div className="test-taker-header">
        <div className="test-progress">
          <span>{t('tests.question')} {currentQuestion + 1} / {test.questions.length}</span>
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

      <div className="test-taker-content">
        <div className="current-question-display">
          {question && (
            <>
              {question.sectionId && (
                <div className="question-section-context">
                  {(() => {
                    const section = (test.sections || []).find(s => s.id === question.sectionId);
                    return section ? (
                      <>
                        {section.passage && (
                          <div className="context-passage">
                            <p>{section.passage}</p>
                          </div>
                        )}
                      </>
                    ) : null;
                  })()}
                </div>
              )}
              {question.type === 'audio' ? (
                <>
                  <div className="question-section">
                    {question.imageUrl && (
                      <div className="question-image-container">
                        <img src={question.imageUrl} alt="Question" />
                        <button 
                          className="fullscreen-btn"
                          onClick={() => setFullscreenImage(question.imageUrl)}
                          title={t('tests.fullscreen') || 'Fullscreen'}
                        >
                          <FiMaximize2 />
                        </button>
                      </div>
                    )}
                    {question.text && <h2>{question.text}</h2>}
                    <div className="audio-question-player">
                      <AudioPlayer audioUrl={question.audioUrl} />
                    </div>
                  </div>
                  <div className="sub-questions-section">
                    <h3>{t('teacher.tests.questions')}:</h3>
                    {(question.subQuestions || []).map((subQ, subIndex) => {
                      const subAnswer = answers[currentQuestion]?.subAnswers?.[subIndex];
                      return (
                        <div key={subIndex} className="sub-question-wrapper">
                          <div className="sub-question-title">
                            <h4>{t('tests.question')} {subIndex + 1}</h4>
                          </div>
                          <div className="sub-question-text">
                            <p>{subQ.text}</p>
                          </div>

                          {subQ.type === 'multiple' && (
                            <div className="answers-section">
                              {subQ.options.map((option, optIndex) => (
                                <label key={optIndex} className="answer-option">
                                  <input
                                    type="radio"
                                    name={`sub-answer-${currentQuestion}-${subIndex}`}
                                    value={optIndex}
                                    checked={subAnswer === optIndex}
                                    onChange={(e) => {
                                      const newSubAnswers = {
                                        ...(answers[currentQuestion]?.subAnswers || {}),
                                        [subIndex]: parseInt(e.target.value)
                                      };
                                      handleAnswerChange({
                                        type: 'audio',
                                        subAnswers: newSubAnswers
                                      });
                                    }}
                                  />
                                  <span className="option-text">{option}</span>
                                </label>
                              ))}
                            </div>
                          )}

                          {subQ.type === 'text' && (
                            <div className="text-answer-section">
                              <textarea
                                value={subAnswer || ''}
                                onChange={(e) => {
                                  const newSubAnswers = {
                                    ...(answers[currentQuestion]?.subAnswers || {}),
                                    [subIndex]: e.target.value
                                  };
                                  handleAnswerChange({
                                    type: 'audio',
                                    subAnswers: newSubAnswers
                                  });
                                }}
                                onPaste={handlePaste}
                                placeholder={t('tests.writeAnswer')}
                                className="text-answer"
                                rows="3"
                              />
                            </div>
                          )}

                          {subQ.type === 'truefalse' && (
                            <div className="answers-section truefalse-answers">
                              {[
                                { label: 'True', value: true },
                                { label: 'False', value: false }
                              ].map((opt, i) => (
                                <label key={i} className={`tf-option ${subAnswer === opt.value ? 'selected' : ''}`}>
                                  <input
                                    type="radio"
                                    name={`sub-tf-${currentQuestion}-${subIndex}`}
                                    value={opt.value}
                                    checked={subAnswer === opt.value}
                                    onChange={() => {
                                      const newSubAnswers = {
                                        ...(answers[currentQuestion]?.subAnswers || {}),
                                        [subIndex]: opt.value
                                      };
                                      handleAnswerChange({
                                        type: 'audio',
                                        subAnswers: newSubAnswers
                                      });
                                    }}
                                  />
                                  <span className="tf-label">{opt.label}</span>
                                </label>
                              ))}
                            </div>
                          )}

                          {subQ.type === 'wordbank' && (
                            <>
                              <div className="sub-question-instruction">
                                <p>{t(tests.fillBlanks)}</p>
                              </div>
                              <div className="answers-section">
                                <div 
                                  ref={(el) => {
                                    if (el) subQuestionClozeRefs.current[`${currentQuestion}_${subIndex}`] = el;
                                  }}
                                  className="cloze-student"
                                />
                              </div>
                              {subQ.bank && subQ.bank.length > 0 && (
                                <div className="word-bank-section">
                                  <h4 className="word-bank-title">{t('tests.keywords')}</h4>
                                  <div className="word-bank-list">
                                    {subQ.bank.map((word, wordIndex) => (
                                      <span key={wordIndex} className="word-bank-item">{word}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                          {subQ.type === 'matching' && (
                            <div className="answers-section matching-answers">
                              <div className="matching-left-items">
                                {/* <div className="matching-column-label">So'zlar</div> */}
                                {(subQ.pairs || []).map((pair, idx) => {
                                  const state = matchingState[`${currentQuestion}_${subIndex}`] || {};
                                  const matchedPair = state.matchedPairs?.find(m => m.left === pair.left);
                                  const isMatched = !!matchedPair;
                                  const isCorrect = matchedPair?.correct;
                                  const isActive = state.activeLeft === pair.left && !isMatched;
                                  
                                  return (
                                    <div
                                      key={idx}
                                      className={`matching-left-item ${isMatched ? 'matched' : ''} ${isActive ? 'active' : ''}`}
                                      onClick={() => handleMatchingClick(`${currentQuestion}_${subIndex}`, pair.left, true)}
                                    >
                                      {pair.left}
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="matching-connections">
                                {(matchingShuffled[`${currentQuestion}_${subIndex}`] || []).map((rightItem, idx) => {
                                  const state = matchingState[`${currentQuestion}_${subIndex}`] || {};
                                  const matchedPair = state.matchedPairs?.find(m => m.right === rightItem);
                                  const isMatched = !!matchedPair;
                                  const isCorrect = matchedPair?.correct;
                                  const isActive = state.activeRight === rightItem && !isMatched;
                                  
                                  return (
                                    <div
                                      key={idx}
                                      className={`matching-right-item ${isMatched ? 'matched' : ''} ${isActive ? 'active' : ''}`}
                                      onClick={() => handleMatchingClick(`${currentQuestion}_${subIndex}`, rightItem, false)}
                                    >
                                      {rightItem}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  {question.type === 'wordbank' ? (
                    <>
                      <div className="question-section">
                        <h2>{t('tests.fillBlanks')}</h2>
                      </div>
                      <div className="answers-section">
                        <div 
                          ref={(el) => {
                            if (el) clozeRef.current = el;
                          }}
                          className="cloze-student" 
                        />
                      </div>
                      {question.bank && question.bank.length > 0 && (
                        <div className="word-bank-section">
                          <h3 className="word-bank-title">{t('tests.keywords')}</h3>
                          <div className="word-bank-list">
                            {question.bank.map((word, index) => (
                              <span key={index} className="word-bank-item">{word}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="question-section">
                        {question.imageUrl && (
                          <div className="question-image-container">
                            <img src={question.imageUrl} alt="Question" />
                            <button 
                              className="fullscreen-btn"
                              onClick={() => setFullscreenImage(question.imageUrl)}
                              title={t('tests.fullscreen') || 'Fullscreen'}
                            >
                              <FiMaximize2 />
                            </button>
                          </div>
                        )}
                        <h2>{question.text}</h2>
                      </div>

                      {question.type === 'multiple' && (
                        <div className="answers-section">
                          {question.options.map((option, index) => {
                            const letter = String.fromCharCode(65 + index); // 65 = 'A'
                            return (
                              <label key={index} className={`answer-option ${answers[currentQuestion] === index ? 'selected' : ''}`} style={{pointerEvents: readOnly ? 'none' : 'auto', opacity: readOnly ? 0.7 : 1}}>
                                <input
                                  type="radio"
                                  name={`answer-${currentQuestion}`}
                                  value={index}
                                  checked={answers[currentQuestion] === index}
                                  disabled={readOnly}
                                  onChange={(e) => handleAnswerChange(parseInt(e.target.value))}
                                />
                                <span className="option-letter">{letter})</span>
                                <span className="option-text">{option}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {question.type === 'text' && (
                        <div className="text-answer-section">
                          <textarea
                            value={answers[currentQuestion] || ''}
                            onChange={(e) => handleAnswerChange(e.target.value)}
                            onPaste={handlePaste}
                            placeholder={t('tests.writeAnswer')}
                            className="text-answer"
                            rows="4"
                            disabled={readOnly}
                            readOnly={readOnly}
                          />
                        </div>
                      )}

                      {question.type === 'truefalse' && (
                        <div className="answers-section truefalse-answers">
                          {[
                            { label: 'True', value: true },
                            { label: 'False', value: false }
                          ].map((opt, i) => (
                            <label key={i} className={`tf-option ${answers[currentQuestion] === opt.value ? 'selected' : ''}`} style={{pointerEvents: readOnly ? 'none' : 'auto', opacity: readOnly ? 0.7 : 1}}>
                              <input
                                type="radio"
                                name="answer"
                                value={opt.value}
                                checked={answers[currentQuestion] === opt.value}
                                disabled={readOnly}
                                onChange={() => handleAnswerChange(opt.value)}
                              />
                              <span className="tf-label">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {question.type === 'matching' && (
                        <div className="answers-section matching-answers">
                          <div className="matching-left-items">
                            {/* <div className="matching-column-label">So'zlar</div> */}
                            {(question.pairs || []).map((pair, idx) => {
                              const state = matchingState[currentQuestion] || {};
                              const matchedPair = state.matchedPairs?.find(m => m.left === pair.left);
                              const isMatched = !!matchedPair;
                              const isCorrect = matchedPair?.correct;
                              const isActive = state.activeLeft === pair.left && !isMatched;
                              
                              return (
                                <div
                                  key={idx}
                                  className={`matching-left-item ${isMatched ? 'matched' : ''} ${isActive ? 'active' : ''}`}
                                  onClick={() => handleMatchingClick(currentQuestion, pair.left, true)}
                                >
                                  {pair.left}
                                </div>
                              );
                            })}
                          </div>
                          <svg
                            ref={svgRef}
                            className="matching-lines-svg"
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              pointerEvents: 'none'
                            }}
                          />
                          <div className="matching-connections">
                            {(matchingShuffled[currentQuestion] || []).map((rightItem, idx) => {
                              const state = matchingState[currentQuestion] || {};
                              const matchedPair = state.matchedPairs?.find(m => m.right === rightItem);
                              const isMatched = !!matchedPair;
                              const isCorrect = matchedPair?.correct;
                              const isActive = state.activeRight === rightItem && !isMatched;
                              
                              return (
                                <div
                                  key={idx}
                                  className={`matching-right-item ${isMatched ? 'matched' : ''} ${isActive ? 'active' : ''}`}
                                  onClick={() => handleMatchingClick(currentQuestion, rightItem, false)}
                                >
                                  {rightItem}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {!readOnly && (
        <div className="test-taker-footer">
          <div className="navigation-buttons">
            <button
              className="btn btn-outline"
              onClick={handlePreviousQuestion}
              disabled={currentQuestion === 0}
            >
              {t('common.previous')}
            </button>

            {currentQuestion < test.questions.length - 1 ? (
              <button className="btn btn-secondary" onClick={handleNextQuestion}>
                {t('common.next')}
                <FiChevronRight />
              </button>
            ) : (
              <button
                className="btn btn-success"
                onClick={handleSubmitTest}
                disabled={isSubmitting}
              >
                {isSubmitting ? t('tests.submitting') : t('tests.submitTest')}
              </button>
            )}
          </div>

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
      )}
      {readOnly && (
        <div className="test-taker-footer">
          <button className="btn btn-outline" onClick={onCancel}>
            {t('common.close')}
          </button>
          <div className="question-indicators">
            {test.questions.map((_, index) => (
              <button
                key={index}
                className={`indicator ${index === currentQuestion ? 'active' : ''}`}
                onClick={() => setCurrentQuestion(index)}
                title={`Savol ${index + 1}`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div className="fullscreen-modal-overlay" onClick={() => setFullscreenImage(null)}>
          <div className="fullscreen-modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="fullscreen-close-btn"
              onClick={() => setFullscreenImage(null)}
            >
              <FiX />
            </button>
            <img src={fullscreenImage} alt="Fullscreen" className="fullscreen-image" />
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentTestTaker;
