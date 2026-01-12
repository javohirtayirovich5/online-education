import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { testService } from '../../services/testService';
import { FiClock, FiCheckCircle, FiChevronRight } from 'react-icons/fi';
import { toast } from 'react-toastify';
import AudioPlayer from './AudioPlayer';
import './StudentTestTaker.css';
import { useTranslation } from '../../hooks/useTranslation';

const StudentTestTaker = ({ test, onComplete, onCancel }) => {
  const { userData } = useAuth();
  const { t } = useTranslation();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(test.timeLimit ? test.timeLimit * 60 : null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(null);
  // Matching question state: track active/selected items and shuffled order
  const [matchingState, setMatchingState] = useState({});
  const [matchingShuffled, setMatchingShuffled] = useState({});
  const svgRef = useRef(null);

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

  // Refs and helpers for wordbank cloze rendering (declared unconditionally to preserve hooks order)
  const clozeRef = useRef(null);
  const subQuestionClozeRefs = useRef({});

  const buildClozeHtml = (q, studentAns = {}) => {
    // Parse instructor HTML (with select[data-blank-id]) and rebuild selects with question.bank options
    const wrapper = document.createElement('div');
    wrapper.innerHTML = q.text || '';
    const selects = wrapper.querySelectorAll('select[data-blank-id]');
    selects.forEach(sel => {
      const id = sel.getAttribute('data-blank-id');
      // create new select
      const newSel = document.createElement('select');
      newSel.setAttribute('data-blank-id', id);
      const empty = document.createElement('option'); empty.value = ''; empty.textContent = '—'; newSel.appendChild(empty);
      (q.bank || []).forEach(w => { const o = document.createElement('option'); o.value = w; o.textContent = w; newSel.appendChild(o); });
      // set selected from studentAnswers if present
      if (studentAns && typeof studentAns[id] !== 'undefined') {
        newSel.value = studentAns[id] === null ? '' : studentAns[id];
      }
      sel.parentNode.replaceChild(newSel, sel);
    });
    return wrapper.innerHTML;
  };

  useEffect(() => {
    const question = test.questions[currentQuestion];
    if (!question) return;
    
    if (question.type === 'wordbank') {
      // render initial cloze
      if (clozeRef.current) {
        clozeRef.current.innerHTML = buildClozeHtml(question, answers[currentQuestion] || {});
        // attach change listeners
        const sels = clozeRef.current.querySelectorAll('select[data-blank-id]');
        sels.forEach(sel => {
          sel.addEventListener('change', (e) => {
            const id = e.target.getAttribute('data-blank-id');
            setAnswers(prev => ({ ...prev, [currentQuestion]: { ...(prev[currentQuestion] || {}), [id]: e.target.value } }));
          });
        });
      }
    } else if (question.type === 'audio') {
      // Handle wordbank sub-questions
      (question.subQuestions || []).forEach((subQ, subIndex) => {
        if (subQ.type === 'wordbank') {
          const refKey = `${currentQuestion}_${subIndex}`;
          const ref = subQuestionClozeRefs.current[refKey];
          if (ref) {
            const subAnswer = answers[currentQuestion]?.subAnswers?.[subIndex] || {};
            ref.innerHTML = buildClozeHtml(subQ, subAnswer);
            const sels = ref.querySelectorAll('select[data-blank-id]');
            sels.forEach(sel => {
              sel.addEventListener('change', (e) => {
                const id = e.target.getAttribute('data-blank-id');
                const currentSubAnswer = answers[currentQuestion]?.subAnswers?.[subIndex] || {};
                const newSubAnswer = { ...currentSubAnswer, [id]: e.target.value };
                const newSubAnswers = {
                  ...(answers[currentQuestion]?.subAnswers || {}),
                  [subIndex]: newSubAnswer
                };
                handleAnswerChange({
                  type: 'audio',
                  subAnswers: newSubAnswers
                });
              });
            });
          }
        }
      });
    }
  }, [test.questions, currentQuestion, answers]);

  useEffect(() => {
    const question = test.questions[currentQuestion];
    // whenever answers change for current question, update selects to reflect selection
    if (!question || question.type !== 'wordbank') return;
    if (clozeRef.current) {
      const sels = clozeRef.current.querySelectorAll('select[data-blank-id]');
      sels.forEach(sel => {
        const id = sel.getAttribute('data-blank-id');
        const val = (answers[currentQuestion] || {})[id];
        sel.value = typeof val !== 'undefined' ? val : '';
      });
    }
  }, [answers, currentQuestion, test.questions]);

  const formatTime = (seconds) => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Shuffle array
  const shuffle = (arr) => {
    const newArr = [...arr];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  };

  // Draw lines connecting matched pairs
  const drawMatchingLines = () => {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    
    // Clear existing lines
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
        line.setAttribute('stroke', pair.correct ? '#4caf50' : '#ef5350');
        line.setAttribute('stroke-width', '3');
        line.setAttribute('stroke-linecap', 'round');

        svg.appendChild(line);
      }
    });
  };

  // Redraw lines when state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      drawMatchingLines();
    }, 0);
    return () => clearTimeout(timer);
  }, [matchingState, currentQuestion]);

  // Initialize matching question shuffled items
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

  // Handle matching item click
  const handleMatchingClick = (questionIndex, itemValue, isLeftItem) => {
    const question = test.questions[questionIndex];
    const state = matchingState[questionIndex] || {};
    
    // If in error state, don't allow new clicks
    if (state.errorPair) return;

    // If clicking the same item again, deselect it
    if (isLeftItem && state.activeLeft === itemValue) {
      setMatchingState(prev => ({
        ...prev,
        [questionIndex]: { ...state, activeLeft: null }
      }));
      return;
    }

    if (!isLeftItem && state.activeRight === itemValue) {
      setMatchingState(prev => ({
        ...prev,
        [questionIndex]: { ...state, activeRight: null }
      }));
      return;
    }

    // First selection
    if (isLeftItem && !state.activeLeft) {
      setMatchingState(prev => ({
        ...prev,
        [questionIndex]: { ...state, activeLeft: itemValue }
      }));
      return;
    }

    if (!isLeftItem && !state.activeRight && !state.activeLeft) {
      setMatchingState(prev => ({
        ...prev,
        [questionIndex]: { ...state, activeRight: itemValue }
      }));
      return;
    }

    // Second selection - check if match is correct
    if (!isLeftItem && state.activeLeft) {
      const rightValue = itemValue;
      const leftValue = state.activeLeft;

      // Find the matching pair
      const matchingPair = (question.pairs || []).find(p => p.left === leftValue);
      const isCorrect = matchingPair && matchingPair.right === rightValue;

      if (isCorrect) {
        // Correct match - mark as correct (disabled with green)
        toast.success('✓ To\'g\'ri!');
        const newMatched = [...state.matchedPairs, { left: leftValue, right: rightValue, correct: true }];
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

        // Check if all pairs are matched
        if (newMatched.length === (question.pairs || []).length) {
          // All matched - update answers
          handleAnswerChange({ matchedCount: newMatched.length, total: question.pairs.length });
          setTimeout(() => toast.success('Barcha juftliklar topildi!'), 300);
        }
      } else {
        // Incorrect match - mark as incorrect (disabled with red) - cannot retry
        toast.error('✗ Noto\'g\'ri!');
        const newMatched = [...state.matchedPairs, { left: leftValue, right: rightValue, correct: false }];
        setMatchingState(prev => ({
          ...prev,
          [questionIndex]: {
            ...state,
            matchedPairs: newMatched,
            activeLeft: null,
            activeRight: null,
            errorPair: null
          }
        }));
      }
    }
  };

  const handleAnswerChange = (answer) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion]: answer
    }));
  };

  // Initialize matching question when it comes into view
  useEffect(() => {
    const question = test.questions[currentQuestion];
    if (question?.type === 'matching') {
      initializeMatchingQuestion(currentQuestion);
    } else if (question?.type === 'audio') {
      // Initialize matching for sub-questions
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
          <button 
            className="btn btn-primary"
            onClick={onComplete}
          >
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

          <div className="start-warning">
            <p>⚠️ {t('tests.startWarning')}</p>
          </div>

          <div className="start-actions">
            <button className="btn btn-outline" onClick={onCancel}>
              {t('common.cancel')}
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => setTestStarted(true)}
            >
              {t('tests.startTest')}
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

      {/* Question */}
      <div className="test-taker-content">
        {question.type === 'audio' ? (
          <>
            <div className="question-section">
              {question.text && <h2>{question.text}</h2>}
              <div className="audio-question-player">
                <AudioPlayer audioUrl={question.audioUrl} />
              </div>
            </div>

            {/* Sub-questions */}
            <div className="sub-questions-section">
              <h3>{t('tests.questions')}:</h3>
              {(question.subQuestions || []).map((subQ, subIndex) => {
                const subAnswerKey = `${currentQuestion}_${subIndex}`;
                const subAnswer = answers[currentQuestion]?.subAnswers?.[subIndex];
                
                return (
                  <div key={subIndex} className="sub-question-wrapper">
                    <div className="sub-question-title">
                      <h4>{t('tests.question')} {subIndex + 1}</h4>
                    </div>
                    <div className="sub-question-text">
                      <p>{subQ.text}</p>
                    </div>

                    {/* Sub-question answers */}
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
                          placeholder={t('tests.writeAnswer')}
                          className="text-answer"
                          rows="3"
                        />
                      </div>
                    )}

                    {subQ.type === 'truefalse' && (
                      <div className="answers-section">
                        {[
                          { label: 'True', value: true },
                          { label: 'False', value: false }
                        ].map((opt, i) => (
                          <label
                            key={i}
                            className={`answer-option ${subAnswer === opt.value ? 'selected' : ''}`}
                          >
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
                            <span className="option-text">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {subQ.type === 'wordbank' && (
                      <>
                        <div className="sub-question-instruction">
                          <p>Bo'shliqlarni mos so'zlar bilan to'ldiring.</p>
                        </div>
                        <div className="answers-section">
                          <div 
                            ref={(el) => {
                              if (el) {
                                subQuestionClozeRefs.current[`${currentQuestion}_${subIndex}`] = el;
                              }
                            }}
                            className="cloze-student"
                          />
                        </div>
                        {/* Word Bank for sub-question */}
                        {subQ.bank && subQ.bank.length > 0 && (
                          <div className="word-bank-section">
                            <h4 className="word-bank-title">Kalit so'zlar</h4>
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
                          <div className="matching-column-label">So'zlar</div>
                          {(subQ.pairs || []).map((pair, idx) => {
                            const state = matchingState[subAnswerKey] || {};
                            const matchedPair = state.matchedPairs?.find(m => m.left === pair.left);
                            const isMatched = !!matchedPair;
                            const isCorrect = matchedPair?.correct;
                            const isActive = state.activeLeft === pair.left && !isMatched;
                            
                            return (
                              <div
                                key={idx}
                                className={`matching-left-item ${isMatched ? (isCorrect ? 'correct' : 'incorrect') : ''} ${isActive ? 'active' : ''}`}
                                onClick={() => !isMatched && handleMatchingClick(subAnswerKey, pair.left, true)}
                              >
                                {pair.left}
                              </div>
                            );
                          })}
                        </div>
                        <div className="matching-connections">
                          <div className="matching-column-label">Tarjimalar</div>
                          {(matchingShuffled[subAnswerKey] || []).map((rightItem, idx) => {
                            const state = matchingState[subAnswerKey] || {};
                            const matchedPair = state.matchedPairs?.find(m => m.right === rightItem);
                            const isMatched = !!matchedPair;
                            const isCorrect = matchedPair?.correct;
                            const isActive = state.activeRight === rightItem && !isMatched;
                            
                            return (
                              <div
                                key={idx}
                                className={`matching-right-item ${isMatched ? (isCorrect ? 'correct' : 'incorrect') : ''} ${isActive ? 'active' : ''}`}
                                onClick={() => !isMatched && state.activeLeft && handleMatchingClick(subAnswerKey, rightItem, false)}
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
                  <h2>Bo'shliqlarni mos so'zlar bilan to'ldiring.</h2>
                </div>

                {/* Answers */}
                <div className="answers-section">
                  <div 
                    ref={(el) => {
                      if (el) {
                        clozeRef.current = el;
                        // Immediately render cloze content when ref is attached
                        if (question.type === 'wordbank') {
                          const builtHtml = buildClozeHtml(question, answers[currentQuestion] || {});
                          el.innerHTML = builtHtml;
                          // Attach change listeners
                          const sels = el.querySelectorAll('select[data-blank-id]');
                          sels.forEach(sel => {
                            sel.addEventListener('change', (e) => {
                              const id = e.target.getAttribute('data-blank-id');
                              setAnswers(prev => ({ ...prev, [currentQuestion]: { ...(prev[currentQuestion] || {}), [id]: e.target.value } }));
                            });
                          });
                        }
                      }
                    }}
                    className="cloze-student" 
                  />
                </div>

                {/* Word Bank */}
                {question.bank && question.bank.length > 0 && (
                  <div className="word-bank-section">
                    <h3 className="word-bank-title">Kalit so'zlar</h3>
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
          <h2>{question.text}</h2>
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
              placeholder={t('tests.writeAnswer')}
              className="text-answer"
              rows="4"
            />
          </div>
        )}
              </>
        )}

        {question.type === 'truefalse' && (
          <div className="answers-section">
            {[
              { label: t('tests.true'), value: true },
              { label: t('tests.false'), value: false }
            ].map((opt, i) => (
              <label
                key={i}
                className={`answer-option ${answers[currentQuestion] === opt.value ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="answer"
                  value={opt.value}
                  checked={answers[currentQuestion] === opt.value}
                  onChange={() => handleAnswerChange(opt.value)}
                />
                <span className="option-text">{opt.label}</span>
              </label>
            ))}
          </div>
        )}

        {question.type === 'matching' && (
          <div className="answers-section matching-answers">
            <div className="matching-left-items">
              <div className="matching-column-label">So'zlar</div>
              {(question.pairs || []).map((pair, idx) => {
                const state = matchingState[currentQuestion] || {};
                const matchedPair = state.matchedPairs?.find(m => m.left === pair.left);
                const isMatched = !!matchedPair;
                const isCorrect = matchedPair?.correct;
                const isActive = state.activeLeft === pair.left && !isMatched;
                
                return (
                  <div
                    key={idx}
                    className={`matching-left-item ${isMatched ? (isCorrect ? 'correct' : 'incorrect') : ''} ${isActive ? 'active' : ''}`}
                    onClick={() => !isMatched && handleMatchingClick(currentQuestion, pair.left, true)}
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
              <div className="matching-column-label">Tarjimalar</div>
              {(matchingShuffled[currentQuestion] || []).map((rightItem, idx) => {
                const state = matchingState[currentQuestion] || {};
                const matchedPair = state.matchedPairs?.find(m => m.right === rightItem);
                const isMatched = !!matchedPair;
                const isCorrect = matchedPair?.correct;
                const isActive = state.activeRight === rightItem && !isMatched;
                
                return (
                  <div
                    key={idx}
                    className={`matching-right-item ${isMatched ? (isCorrect ? 'correct' : 'incorrect') : ''} ${isActive ? 'active' : ''}`}
                    onClick={() => !isMatched && state.activeLeft && handleMatchingClick(currentQuestion, rightItem, false)}
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
      </div>

      {/* Navigation */}
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
            <button
              className="btn btn-secondary"
              onClick={handleNextQuestion}
            >
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
