import { useState, useEffect, useRef } from 'react';
import { FiX, FiPlus, FiTrash2, FiChevronDown } from 'react-icons/fi';
import { toast } from 'react-toastify';
import './TestEditor.css';

const TestEditor = ({ initialData = null, groups = [], onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    visibleFor: 'all',
    groupId: null,
    questions: [],
    timeLimit: null,
    ...initialData
  });

  const [currentQuestion, setCurrentQuestion] = useState({
    type: 'multiple',
    text: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    correctAnswers: []
  });

  const questionTextareaRef = useRef(null);

  // Auto-adjust textarea height
  useEffect(() => {
    if (questionTextareaRef.current) {
      questionTextareaRef.current.style.height = 'auto';
      questionTextareaRef.current.style.height = Math.max(40, questionTextareaRef.current.scrollHeight) + 'px';
    }
  }, [currentQuestion.text]);

  const [editingQuestionIndex, setEditingQuestionIndex] = useState(null);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'timeLimit' ? (value ? parseInt(value) : null) : value
    }));
  };

  const handleQuestionChange = (field, value) => {
    setCurrentQuestion(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOptionChange = (index, value) => {
    setCurrentQuestion(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
    }));
  };

  const handleAddQuestion = () => {
    if (!currentQuestion.text.trim()) {
      toast.error('Savol matni bo\'sh bo\'lishi mumkin emas');
      return;
    }

    if (currentQuestion.type === 'multiple' && !currentQuestion.options.every(opt => opt.trim())) {
      toast.error('Barcha variantlar to\'ldirilishi kerak');
      return;
    }

    if (currentQuestion.type === 'text' && !currentQuestion.correctAnswer) {
      toast.error('Matnli savol uchun to\'g\'ri javob qo\'shish kerak');
      return;
    }

    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, currentQuestion]
    }));

    // Reset forma savol turini 'multiple' ga qaytarish
    setCurrentQuestion({
      type: 'multiple',
      text: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      correctAnswers: []
    });
  };

  const handleUpdateQuestionText = (index, newText) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === index ? { ...q, text: newText } : q
      )
    }));
  };

  const handleUpdateQuestionOption = (questionIndex, optionIndex, newValue) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === questionIndex
          ? { ...q, options: q.options.map((opt, oi) => oi === optionIndex ? newValue : opt) }
          : q
      )
    }));
  };

  const handleUpdateQuestionCorrectAnswer = (questionIndex, correctIndex) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === questionIndex ? { ...q, correctAnswer: correctIndex } : q
      )
    }));
  };

  const handleDeleteQuestion = (index) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Test nomi bo\'sh bo\'lishi mumkin emas');
      return;
    }

    if (formData.questions.length === 0) {
      toast.error('Kamida bitta savol qo\'shing');
      return;
    }

    if (formData.visibleFor === 'group' && !formData.groupId) {
      toast.error('Guruh tanlanishi kerak');
      return;
    }

    onSave(formData);
  };

  return (
    <div className="test-editor">
      <form onSubmit={handleSubmit} className="test-editor-form">
        {/* Basic Information */}
        <div className="editor-section">
          <h3>Asosiy ma'lumotlar</h3>

          <div className="form-group">
            <label>Test nomi *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleFormChange}
              placeholder="Test nomi"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Tavsif</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              placeholder="Test tavsifi"
              className="form-textarea"
              rows="3"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Kim uchun? *</label>
              <select
                name="visibleFor"
                value={formData.visibleFor}
                onChange={handleFormChange}
                className="form-select"
              >
                <option value="all">Hamma uchun</option>
                <option value="group">Maxsus guruh</option>
              </select>
            </div>

            {formData.visibleFor === 'group' && (
              <div className="form-group">
                <label>Guruh tanlang *</label>
                <select
                  name="groupId"
                  value={formData.groupId || ''}
                  onChange={handleFormChange}
                  className="form-select"
                >
                  <option value="">Guruhni tanlang</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Vaqt chegarasi (daqiqa) <small>(ixtiyori)</small></label>
              <input
                type="number"
                name="timeLimit"
                value={formData.timeLimit || ''}
                onChange={handleFormChange}
                className="form-input"
                min="1"
              />
            </div>
          </div>
        </div>

        {/* Questions Section */}
        <div className="editor-section">
          <h3>Savollar ({formData.questions.length})</h3>

          {/* Questions List */}
          {formData.questions.length > 0 && (
            <div className="questions-list">
              {formData.questions.map((question, index) => (
                <div key={index} className="question-item">
                  <div className="question-header">
                    <div style={{ flex: 1 }}>
                      <div className="d-flex">
                        <h4>Savol {index + 1}</h4>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(index)}
                          className="btn btn-sm btn-danger"
                          title="O'chirish">
                          <FiTrash2 />
                        </button></div>
                      <textarea
                        value={question.text}
                        onChange={(e) => handleUpdateQuestionText(index, e.target.value)}
                        className="form-textarea question-edit-textarea"
                        rows="2"
                      />
                    </div>

                  </div>
                  {question.type === 'multiple' && (
                    <div className="question-options">
                      {question.options.map((option, optIndex) => (
                        <div
                          key={optIndex}
                          className="option-item"
                        >
                          <input
                            type="radio"
                            name={`correct-${index}`}
                            checked={optIndex === question.correctAnswer}
                            onChange={() => handleUpdateQuestionCorrectAnswer(index, optIndex)}
                            className="option-radio"
                          />
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => handleUpdateQuestionOption(index, optIndex, e.target.value)}
                            placeholder={`Variant ${optIndex + 1}`}
                            className={`form-input ${optIndex === question.correctAnswer ? 'correct-option' : ''}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {question.type === 'text' && (
                    <div className="form-group">
                      <label>To'g'ri javob</label>
                      <input
                        type="text"
                        value={question.correctAnswer || ''}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            questions: prev.questions.map((q, i) =>
                              i === index ? { ...q, correctAnswer: e.target.value } : q
                            )
                          }));
                        }}
                        placeholder="Matnli savolga to'g'ri javobni kiriting"
                        className="form-input"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Question Adder */}
          <div className="question-adder">
            <h4 className="question-adder-title">Savol {formData.questions.length + 1}</h4>

            <div className="form-group">
              <label>Savol turi</label>
              <select
                value={currentQuestion.type}
                onChange={(e) => handleQuestionChange('type', e.target.value)}
                className="form-select"
              >
                <option value="multiple">Bitta variantni tanlash</option>
                <option value="text">Matnli javob</option>
              </select>
            </div>

            <div className="form-group">
              <label>Savol matni *</label>
              <textarea
                ref={questionTextareaRef}
                value={currentQuestion.text}
                onChange={(e) => handleQuestionChange('text', e.target.value)}
                placeholder="Savolni kiriting"
                className="form-textarea"
                rows="1"
              />
            </div>

            {currentQuestion.type === 'multiple' && (
              <div className="form-group">
                <label>Variantlar *</label>
                <div className="options-list">
                  {currentQuestion.options.map((option, index) => (
                    <div key={index} className="option-item">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={currentQuestion.correctAnswer === index}
                        onChange={() => handleQuestionChange('correctAnswer', index)}
                        className="option-radio"
                      />
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`Variant ${index + 1}`}
                        className={`form-input ${currentQuestion.correctAnswer === index ? 'correct-option' : ''}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentQuestion.type === 'text' && (
              <div className="form-group">
                <label>To'g'ri javob *</label>
                <input
                  type="text"
                  value={currentQuestion.correctAnswer || ''}
                  onChange={(e) => handleQuestionChange('correctAnswer', e.target.value)}
                  placeholder="Matnli savolga to'g'ri javobni kiriting"
                  className="form-input"
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleAddQuestion}
              className="btn btn-secondary"
            >
              <FiPlus />
              {editingQuestionIndex !== null ? 'Savolni yangilash' : 'Savolni qo\'shish'}
            </button>

            {editingQuestionIndex !== null && (
              <button
                type="button"
                onClick={() => {
                  setEditingQuestionIndex(null);
                  setCurrentQuestion({
                    type: 'multiple',
                    text: '',
                    points: 1,
                    options: ['', '', '', ''],
                    correctAnswer: 0,
                    correctAnswers: []
                  });
                }}
                className="btn btn-outline"
              >
                Bekor qilish
              </button>
            )}
          </div>


        </div>

        {/* Submit Buttons */}
        <div className="editor-actions">
          <button type="button" onClick={onCancel} className="btn btn-outline">
            Bekor qilish
          </button>
          <button type="submit" className="btn btn-primary">
            {initialData ? 'O\'zgartirishlarni saqlash' : 'Test yaratish'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TestEditor;
