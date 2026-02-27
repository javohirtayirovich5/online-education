import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { FiX, FiPlus, FiTrash2, FiChevronDown, FiMoreVertical} from 'react-icons/fi';
import { toast } from 'react-toastify';
import AudioUploader from './AudioUploader';
import ImageUploader from './ImageUploader';
import { imageService } from '../../services/imageService';
import './TestEditor.css';

const TestEditor = ({ initialData = null, groups = [], onSave, onCancel }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState(() => {
    const base = {
      title: '',
      description: '',
      visibleFor: initialData?.visibleFor || 'all',
      groupIds: [],
      sections: initialData?.sections || [],
      questions: initialData?.questions || [
        {
          type: 'multiple',
          text: '',
          sectionId: null,
          options: ['', '', '', ''],
          correctAnswer: 0,
          correctAnswers: [],
          imageUrl: null,
          imageFileName: null
        }
      ],
      timeLimit: initialData?.timeLimit || null,
      ...initialData
    };

    // Backward compatibility: eski testlarda faqat bitta groupId bo'lishi mumkin
    if (initialData?.groupIds && Array.isArray(initialData.groupIds)) {
      base.groupIds = initialData.groupIds;
    } else if (initialData?.groupId) {
      base.groupIds = [initialData.groupId];
    }

    return base;
  });

  const [removedImageFileNames, setRemovedImageFileNames] = useState([]);
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);

  const questionTextareaRef = useRef(null);
  const clozeEditorRefs = useRef({});

  // Inline small dropdown to trigger file picker from menu
  const ImageUploadDropdown = ({ onFile }) => {
    const [open, setOpen] = useState(false);
    const inputRef = useRef(null);

    const handleMenuToggle = (e) => {
      e.stopPropagation();
      setOpen(prev => !prev);
    };

    const handleChooseUpload = (e) => {
      e.stopPropagation();
      setOpen(false);
      if (inputRef.current) inputRef.current.click();
    };

    const handleFile = (e) => {
      const file = e.target.files?.[0];
      if (file && onFile) onFile(file);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
      const onDoc = () => setOpen(false);
      if (open) document.addEventListener('click', onDoc);
      return () => document.removeEventListener('click', onDoc);
    }, [open]);

    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button type="button" onClick={handleMenuToggle} className="upload-button" aria-haspopup="true" aria-expanded={open}>
          <FiMoreVertical />
        </button>
        {open && (
          <div className="image-upload-dropdown" style={{ position: 'absolute', right: 0, top: '110%', zIndex: 40, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 6, padding: 6, boxShadow: '0 8px 24px rgba(15,23,42,0.12)' }}>
            <button type="button" className="btn btn-sm" onClick={handleChooseUpload}>Rasm yuklash</button>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
      </div>
    );
  };

  // Sync cloze editor content only when question.text changes externally (not from user input)
  useEffect(() => {
    formData.questions.forEach((question, index) => {
      if (question.type === 'wordbank') {
        const editor = index === formData.questions.length - 1 ? questionTextareaRef.current : clozeEditorRefs.current[`q${index}`];
        if (editor && editor.innerHTML !== (question.text || '<p></p>')) {
          // Only update if editor is not focused to avoid cursor jumping
          if (document.activeElement !== editor) {
            editor.innerHTML = question.text || '<p></p>';
          }
        }
      }
    });
  }, [formData.questions.map(q => q.type === 'wordbank' ? q.text : '').join('|')]);

  // Auto-adjust textarea height
  useEffect(() => {
    if (questionTextareaRef.current) {
      questionTextareaRef.current.style.height = 'auto';
      questionTextareaRef.current.style.height = Math.max(40, questionTextareaRef.current.scrollHeight) + 'px';
    }
  }, [formData.questions]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'timeLimit' ? (value ? parseInt(value) : null) : value
    }));
  };

  const toggleGroupSelection = (groupId) => {
    setFormData(prev => {
      const current = prev.groupIds || [];
      const exists = current.includes(groupId);
      const next = exists ? current.filter(id => id !== groupId) : [...current, groupId];
      return {
        ...prev,
        groupIds: next
      };
    });
  };

  // Sections handlers
  const handleAddSection = () => {
    const newSectionId = `sec_${Date.now()}`;
    const sectionNumber = (formData.sections || []).length + 1;
    setFormData(prev => ({
      ...prev,
      sections: [
        ...(prev.sections || []),
        {
          id: newSectionId,
          title: `Text ${sectionNumber}`,
          passage: ''
        }
      ]
    }));
    toast.success('Yangi bo\'lim qo\'shildi');
  };

  const handleUpdateSection = (sectionId, field, value) => {
    setFormData(prev => ({
      ...prev,
      sections: (prev.sections || []).map(sec =>
        sec.id === sectionId
          ? { ...sec, [field]: value }
          : sec
      )
    }));
  };

  const handleDeleteSection = (sectionId) => {
    // Remove section from all questions that reference it
    setFormData(prev => ({
      ...prev,
      sections: (prev.sections || []).filter(sec => sec.id !== sectionId),
      questions: prev.questions.map(q =>
        q.sectionId === sectionId
          ? { ...q, sectionId: null }
          : q
      )
    }));
    toast.success('Bo\'lim o\'chirildi');
  };

  const handleSetQuestionSection = (questionIndex, sectionId) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === questionIndex
          ? { ...q, sectionId: sectionId || null }
          : q
      )
    }));
  };

  const QUESTION_TYPES = useMemo(() => [
    { value: 'multiple', label: t('tests.questionTypeMultiple') },
    { value: 'text', label: t('tests.questionTypeText') },
    { value: 'truefalse', label: t('tests.questionTypeTrueFalse') },
    { value: 'wordbank', label: t('tests.questionTypeWordBank') },
    { value: 'matching', label: t('tests.questionTypeMatching') },
    { value: 'audio', label: t('tests.questionTypeAudio') }
  ], [t]);

  const normalizeQuestionForType = (type) => {
    switch (type) {
      case 'multiple':
        return { type: 'multiple', text: '', options: ['', '', '', ''], correctAnswer: 0, correctAnswers: [] };
      case 'text':
        return { type: 'text', text: '', correctAnswer: '' };
      case 'truefalse':
        return { type: 'truefalse', text: '', correctAnswer: true };
      case 'wordbank':
        return { type: 'wordbank', text: '', bank: [], correctAnswers: {}, nextBlankId: 1 };
      case 'matching':
        return { type: 'matching', text: '', pairs: [{ id: '1', left: '', right: '', leftImage: null, rightImage: null }] };
      case 'audio':
        return {
          type: 'audio',
          text: '',
          audioUrl: null,
          audioFileName: null,
          audioDuration: 0,
          subQuestions: []
        };
      default:
        return { type: 'text', text: '', correctAnswer: '' };
    }
  };

  const handleQuestionChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === index ? { ...q, [field]: value } : q
      )
    }));
  };

  const handleQuestionImageChange = (index, imageData) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === index
          ? {
            ...q,
            imageUrl: imageData.url || imageData.file ? URL.createObjectURL(imageData.file) : null,
            imageFileName: imageData.fileName,
            imageFile: imageData.file || null, // Store file for later upload
            isImageLocal: imageData.isLocal || false // Mark if image is local (not yet uploaded)
          }
          : q
      )
    }));
  };

  const handleQuestionImageRemove = (index) => {
    setFormData(prev => {
      const q = prev.questions[index];
      // Track removed image fileName (don't delete immediately - delete after test save)
      if (q && q.imageFileName && !q.imageFileName.startsWith('blob:')) {
        setRemovedImageFileNames(removed => [...removed, q.imageFileName]);
      }
      return {
        ...prev,
        questions: prev.questions.map((q, i) =>
          i === index
            ? { ...q, imageUrl: null, imageFileName: null }
            : q
        )
      };
    });
  };

  const handleChangeQuestionType = (index, newType) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => {
        if (i === index) {
          // Agar yangi tur wordbank emas bo'lsa, text maydonini bo'sh qilish
          const normalized = normalizeQuestionForType(newType);
          // Preserve image URL when changing type
          normalized.imageUrl = q.imageUrl;
          normalized.imageFileName = q.imageFileName;

          if (newType !== 'wordbank') {
            normalized.text = '';
          } else {
            // Agar wordbank ga o'tilayotgan bo'lsa, text ni saqlash (lekin <p></p> bo'lsa bo'sh qilish)
            const oldText = q.text || '';
            normalized.text = (oldText === '<p></p>' || oldText.trim() === '') ? '' : oldText;
          }
          return normalized;
        }
        return q;
      })
    }));
    if (newType === 'wordbank') {
      setTimeout(() => updateEditorSelects(index), 0);
    }
  };

  const handleOptionChange = (questionIndex, optionIndex, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === questionIndex
          ? { ...q, options: q.options.map((opt, oi) => oi === optionIndex ? value : opt) }
          : q
      )
    }));
  };

  const handleAddMatchingPair = (questionIndex) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === questionIndex
          ? { ...q, pairs: [...(q.pairs || []), { id: Date.now().toString(), left: '', right: '', leftImage: null, rightImage: null }] }
          : q
      )
    }));
  };

  const handleRemoveMatchingPair = (questionIndex, pairId) => {
    // Collect image file names from the pair being deleted
    const question = formData.questions[questionIndex];
    const pairToDelete = question.pairs?.find(p => p.id === pairId);
    const newRemovedFileNames = [...removedImageFileNames];

    if (pairToDelete) {
      if (pairToDelete.leftImageFileName) {
        newRemovedFileNames.push(pairToDelete.leftImageFileName);
      }
      if (pairToDelete.rightImageFileName) {
        newRemovedFileNames.push(pairToDelete.rightImageFileName);
      }
      setRemovedImageFileNames(newRemovedFileNames);
    }

    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === questionIndex
          ? { ...q, pairs: q.pairs.filter(p => p.id !== pairId) }
          : q
      )
    }));
  };

  const handleUpdateMatchingPair = (questionIndex, pairId, field, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === questionIndex
          ? { ...q, pairs: q.pairs.map(p => p.id === pairId ? { ...p, [field]: value } : p) }
          : q
      )
    }));
  };

  // Remove sub-question matching pair with image cleanup
  const handleRemoveSubQuestionMatchingPair = (questionIndex, subQuestionIndex, pairIndex) => {
    const question = formData.questions[questionIndex];
    const subQ = question.subQuestions?.[subQuestionIndex];
    const pairToDelete = subQ?.pairs?.[pairIndex];
    const newRemovedFileNames = [...removedImageFileNames];

    if (pairToDelete) {
      if (pairToDelete.leftImageFileName) {
        newRemovedFileNames.push(pairToDelete.leftImageFileName);
      }
      if (pairToDelete.rightImageFileName) {
        newRemovedFileNames.push(pairToDelete.rightImageFileName);
      }
      setRemovedImageFileNames(newRemovedFileNames);
    }

    handleSubQuestionChange(
      questionIndex,
      subQuestionIndex,
      'pairs',
      subQ.pairs.filter((_, pi) => pi !== pairIndex)
    );
  };

  // Audio question handlers
  const handleAudioChange = (questionIndex, audioData) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === questionIndex
          ? {
            ...q,
            audioUrl: audioData.url,
            audioFileName: audioData.fileName,
            audioDuration: audioData.duration
          }
          : q
      )
    }));
  };

  const handleRemoveAudio = (questionIndex) => {
    const question = formData.questions[questionIndex];
    const newRemovedFileNames = [...removedImageFileNames];

    if (question.audioFileName) {
      newRemovedFileNames.push(question.audioFileName);
      setRemovedImageFileNames(newRemovedFileNames);
    }

    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === questionIndex
          ? {
            ...q,
            audioUrl: null,
            audioFileName: null,
            audioDuration: 0
          }
          : q
      )
    }));
  };

  // Sub-question handlers
  const handleAddSubQuestion = (questionIndex) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === questionIndex
          ? {
            ...q,
            subQuestions: [
              ...(q.subQuestions || []),
              {
                type: 'multiple',
                text: '',
                options: ['', '', '', ''],
                correctAnswer: 0,
                correctAnswers: []
              }
            ]
          }
          : q
      )
    }));
    toast.success('Yangi sub-savol qo\'shildi');
  };

  const handleDeleteSubQuestion = (questionIndex, subQuestionIndex) => {
    // Collect all image file names from this sub-question to be deleted
    const question = formData.questions[questionIndex];
    const subQuestionToDelete = question.subQuestions?.[subQuestionIndex];
    const newRemovedFileNames = [...removedImageFileNames];

    if (subQuestionToDelete) {
      // Add matching pair images from sub-question
      if (subQuestionToDelete.pairs && Array.isArray(subQuestionToDelete.pairs)) {
        subQuestionToDelete.pairs.forEach(pair => {
          if (pair.leftImageFileName) {
            newRemovedFileNames.push(pair.leftImageFileName);
          }
          if (pair.rightImageFileName) {
            newRemovedFileNames.push(pair.rightImageFileName);
          }
        });
      }

      setRemovedImageFileNames(newRemovedFileNames);
    }

    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === questionIndex
          ? {
            ...q,
            subQuestions: (q.subQuestions || []).filter((_, sqi) => sqi !== subQuestionIndex)
          }
          : q
      )
    }));
    toast.success('Sub-savol va uning rasmlar o\'chirildi');
  };

  const handleSubQuestionChange = (questionIndex, subQuestionIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === questionIndex
          ? {
            ...q,
            subQuestions: (q.subQuestions || []).map((sq, sqi) =>
              sqi === subQuestionIndex ? { ...sq, [field]: value } : sq
            )
          }
          : q
      )
    }));
  };

  const handleChangeSubQuestionType = (questionIndex, subQuestionIndex, newType) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === questionIndex
          ? {
            ...q,
            subQuestions: (q.subQuestions || []).map((sq, sqi) => {
              if (sqi === subQuestionIndex) {
                // Agar yangi tur wordbank emas bo'lsa, text maydonini bo'sh qilish
                const normalized = normalizeQuestionForType(newType);
                if (newType !== 'wordbank') {
                  normalized.text = '';
                } else {
                  // Agar wordbank ga o'tilayotgan bo'lsa, text ni saqlash (lekin <p></p> bo'lsa bo'sh qilish)
                  const oldText = sq.text || '';
                  normalized.text = (oldText === '<p></p>' || oldText.trim() === '') ? '' : oldText;
                }
                return normalized;
              }
              return sq;
            })
          }
          : q
      )
    }));
  };

  const handleSubQuestionOptionChange = (questionIndex, subQuestionIndex, optionIndex, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === questionIndex
          ? {
            ...q,
            subQuestions: (q.subQuestions || []).map((sq, sqi) =>
              sqi === subQuestionIndex
                ? {
                  ...sq,
                  options: sq.options.map((opt, oi) => oi === optionIndex ? value : opt)
                }
                : sq
            )
          }
          : q
      )
    }));
  };
  // Insert a <select> blank at current caret in the contenteditable editor for a given question
  const insertBlankAtCursor = (questionIndex) => {
    // Check if this is a subquestion (format: "0_1")
    const isSubQuestion = typeof questionIndex === 'string' && questionIndex.includes('_');
    let editor = null;
    let q = null;
    let questionIdx = null;
    let subQuestionIdx = null;

    if (isSubQuestion) {
      [questionIdx, subQuestionIdx] = questionIndex.split('_').map(Number);
      const refKey = `sq${questionIdx}_${subQuestionIdx}`;
      editor = clozeEditorRefs.current[refKey];
      q = formData.questions[questionIdx]?.subQuestions?.[subQuestionIdx];
    } else {
      editor = questionTextareaRef.current;
      q = formData.questions[questionIndex];
      questionIdx = questionIndex;
    }

    if (!editor || !q) return;

    // Ensure editor has focus
    editor.focus();

    const blankId = `${Date.now()}-${(q.nextBlankId || 1)}`;

    // Update nextBlankId and correctAnswers in state
    if (isSubQuestion) {
      handleSubQuestionChange(questionIdx, subQuestionIdx, 'nextBlankId', (q.nextBlankId || 1) + 1);
      handleSubQuestionChange(questionIdx, subQuestionIdx, 'correctAnswers', { ...(q.correctAnswers || {}), [blankId]: '' });
    } else {
      handleQuestionChange(questionIdx, 'nextBlankId', (q.nextBlankId || 1) + 1);
      handleQuestionChange(questionIdx, 'correctAnswers', { ...(q.correctAnswers || {}), [blankId]: '' });
    }

    // Create select element with options from bank
    const sel = document.createElement('select');
    sel.setAttribute('data-blank-id', blankId);
    sel.className = 'cloze-select';

    // placeholder empty option
    const emptyOpt = document.createElement('option');
    emptyOpt.value = '';
    emptyOpt.textContent = '';
    sel.appendChild(emptyOpt);

    (q.bank || []).forEach(w => {
      const o = document.createElement('option');
      o.value = w;
      o.textContent = w;
      sel.appendChild(o);
    });

    // Always select the empty option by default
    sel.value = '';

    // Attach change listener to update state when instructor selects the correct answer.
    // Use functional state updates to avoid stale closure problems so multiple blanks
    // won't overwrite each other's values.
    sel.addEventListener('change', (e) => {
      const val = e.target.value;
      if (isSubQuestion) {
        setFormData(prev => {
          const questions = prev.questions.map((qq, qi) => {
            if (qi !== questionIdx) return qq;
            const subQuestions = (qq.subQuestions || []).map((sqq, sqi) => {
              if (sqi !== subQuestionIdx) return sqq;
              return { ...sqq, correctAnswers: { ...(sqq.correctAnswers || {}), [blankId]: val } };
            });
            return { ...qq, subQuestions };
          });
          return { ...prev, questions };
        });
      } else {
        setFormData(prev => {
          const questions = prev.questions.map((qq, qi) => qi === questionIdx ? { ...qq, correctAnswers: { ...(qq.correctAnswers || {}), [blankId]: val } } : qq);
          return { ...prev, questions };
        });
      }
    });

    // Get current selection and cursor position
    const selection = window.getSelection();
    let range = null;
    let insertedNode = null;

    if (selection.rangeCount > 0) {
      range = selection.getRangeAt(0);

      // Insert select element at cursor position
      range.deleteContents();
      range.insertNode(sel);

      // Create a space text node after the select for user-friendly spacing
      const spaceNode = document.createTextNode(' ');
      range.setStartAfter(sel);
      range.setEndAfter(sel);
      range.insertNode(spaceNode);

      // Create a text node after the space to maintain cursor position
      const textNode = document.createTextNode('\u200B'); // Zero-width space
      range.setStartAfter(spaceNode);
      range.setEndAfter(spaceNode);
      range.insertNode(textNode);
      insertedNode = textNode;
    } else {
      // No selection, append to end
      editor.appendChild(sel);
      // Create a space text node after the select
      const spaceNode = document.createTextNode(' ');
      editor.appendChild(spaceNode);
      // Create a text node after the space
      const textNode = document.createTextNode('\u200B');
      editor.appendChild(textNode);
      insertedNode = textNode;
    }

    // Set cursor position after the inserted select element
    if (insertedNode) {
      const newRange = document.createRange();
      newRange.setStart(insertedNode, 0);
      newRange.setEnd(insertedNode, 0);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }

    // Save innerHTML back to state
    handleQuestionChange(questionIndex, 'text', editor.innerHTML);

    // Restore cursor position after state update
    requestAnimationFrame(() => {
      if (insertedNode && insertedNode.parentNode) {
        try {
          const newRange = document.createRange();
          newRange.setStart(insertedNode, 0);
          newRange.setEnd(insertedNode, 0);
          const newSelection = window.getSelection();
          newSelection.removeAllRanges();
          newSelection.addRange(newRange);
          editor.focus();
        } catch (e) {
          // If node was removed, set cursor at end of editor
          const range = document.createRange();
          range.selectNodeContents(editor);
          range.collapse(false);
          const newSelection = window.getSelection();
          newSelection.removeAllRanges();
          newSelection.addRange(range);
          editor.focus();
        }
      }
    });
  };

  // Ensure selects in editor reflect current bank (update options)
  const updateEditorSelects = (questionIndex, newBank = null, editorElement = null) => {
    const editor = editorElement || questionTextareaRef.current;
    if (!editor) return;
    const q = formData.questions[questionIndex];
    const bank = newBank !== null ? newBank : (q.bank || []);
    const selects = editor.querySelectorAll('select[data-blank-id]');
    selects.forEach(sel => {
      const blankId = sel.getAttribute('data-blank-id');
      const savedAnswer = (q.correctAnswers || {})[blankId]; // Get saved correct answer
      const cur = sel.value;
      // remove all options
      while (sel.firstChild) sel.removeChild(sel.firstChild);
      const emptyOpt = document.createElement('option'); emptyOpt.value = ''; emptyOpt.textContent = '—'; sel.appendChild(emptyOpt);
      bank.forEach(w => { const o = document.createElement('option'); o.value = w; o.textContent = w; sel.appendChild(o); });
      // restore selected value: first try saved answer, then current, then first bank word
      let valueToSet = '';
      if (savedAnswer && [...sel.options].some(o => o.value === savedAnswer)) {
        valueToSet = savedAnswer; // Use saved correct answer
      } else if ([...sel.options].some(o => o.value === cur)) {
        valueToSet = cur; // Use current value if still present
      } else {
        valueToSet = bank && bank[0] ? bank[0] : ''; // Default to first bank word
      }
      sel.value = valueToSet;
    });
    if (editorElement) {
      // For sub-questions, update the sub-question text
      handleSubQuestionChange(questionIndex, null, 'text', editor.innerHTML);
    } else {
      handleQuestionChange(questionIndex, 'text', editor.innerHTML);
    }
  };

  // Update selects for sub-question
  const updateSubQuestionEditorSelects = (questionIndex, subQuestionIndex, newBank = null) => {
    const refKey = `sq${questionIndex}_${subQuestionIndex}`;
    const editor = clozeEditorRefs.current[refKey];
    if (!editor) return;
    const q = formData.questions[questionIndex];
    const subQ = (q.subQuestions || [])[subQuestionIndex];
    if (!subQ) return;
    const bank = newBank !== null ? newBank : (subQ.bank || []);
    const selects = editor.querySelectorAll('select[data-blank-id]');
    selects.forEach(sel => {
      const blankId = sel.getAttribute('data-blank-id');
      const savedAnswer = (subQ.correctAnswers || {})[blankId]; // Get saved correct answer
      const cur = sel.value;
      // remove all options
      while (sel.firstChild) sel.removeChild(sel.firstChild);
      const emptyOpt = document.createElement('option'); emptyOpt.value = ''; emptyOpt.textContent = '—'; sel.appendChild(emptyOpt);
      bank.forEach(w => { const o = document.createElement('option'); o.value = w; o.textContent = w; sel.appendChild(o); });
      // restore selected value: first try saved answer, then current, then first bank word
      let valueToSet = '';
      if (savedAnswer && [...sel.options].some(o => o.value === savedAnswer)) {
        valueToSet = savedAnswer; // Use saved correct answer
      } else if ([...sel.options].some(o => o.value === cur)) {
        valueToSet = cur; // Use current value if still present
      } else {
        valueToSet = bank && bank[0] ? bank[0] : ''; // Default to first bank word
      }
      sel.value = valueToSet;
    });
    handleSubQuestionChange(questionIndex, subQuestionIndex, 'text', editor.innerHTML);
  };

  const syncEditorCorrectAnswers = (questionIndex) => {
    const refKey = `q${questionIndex}`;
    const editor = (questionIndex === formData.questions.length - 1) ? questionTextareaRef.current : clozeEditorRefs.current[refKey];
    if (!editor) return {};
    const selects = editor.querySelectorAll('select[data-blank-id]');
    const map = {};
    selects.forEach(sel => {
      const id = sel.getAttribute('data-blank-id');
      map[id] = sel.value;
    });
    return map;
  };

  const syncSubQuestionCorrectAnswers = (questionIndex, subQuestionIndex) => {
    const refKey = `sq${questionIndex}_${subQuestionIndex}`;
    const editor = clozeEditorRefs.current[refKey];
    if (!editor) return {};
    const selects = editor.querySelectorAll('select[data-blank-id]');
    const map = {};
    selects.forEach(sel => {
      const id = sel.getAttribute('data-blank-id');
      map[id] = sel.value;
    });
    return map;
  };

  const handleAddQuestion = () => {
    // Add new empty question at the end
    setFormData(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          type: 'multiple',
          text: '',
          options: ['', '', '', ''],
          correctAnswer: 0,
          correctAnswers: [],
          imageUrl: null,
          imageFileName: null
        }
      ]
    }));

    toast.success('Yangi savol qo\'shildi');
  };

  const handleDeleteQuestion = (index) => {
    if (formData.questions.length === 1) {
      toast.error('Kamida bitta savol bo\'lishi kerak');
      return;
    }

    // Collect all image file names from this question to be deleted
    const questionToDelete = formData.questions[index];
    const newRemovedFileNames = [...removedImageFileNames];

    // Add simple question image
    if (questionToDelete.imageFileName) {
      newRemovedFileNames.push(questionToDelete.imageFileName);
    }

    // Add matching pair images
    if (questionToDelete.pairs && Array.isArray(questionToDelete.pairs)) {
      questionToDelete.pairs.forEach(pair => {
        if (pair.leftImageFileName) {
          newRemovedFileNames.push(pair.leftImageFileName);
        }
        if (pair.rightImageFileName) {
          newRemovedFileNames.push(pair.rightImageFileName);
        }
      });
    }

    // Add sub-question matching pair images
    if (questionToDelete.subQuestions && Array.isArray(questionToDelete.subQuestions)) {
      questionToDelete.subQuestions.forEach(subQ => {
        if (subQ.pairs && Array.isArray(subQ.pairs)) {
          subQ.pairs.forEach(pair => {
            if (pair.leftImageFileName) {
              newRemovedFileNames.push(pair.leftImageFileName);
            }
            if (pair.rightImageFileName) {
              newRemovedFileNames.push(pair.rightImageFileName);
            }
          });
        }
      });
    }

    // Add audio file
    if (questionToDelete.audioFileName) {
      newRemovedFileNames.push(questionToDelete.audioFileName);
    }

    setRemovedImageFileNames(newRemovedFileNames);

    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));

    toast.success('Savol va uning rasmlar o\'chirildi');
  };


  // Helper function to convert base64 data URL to File object
  const dataUrlToFile = (dataUrl, filename) => {
    try {
      const arr = dataUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while(n--){
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new File([u8arr], filename, {type: mime});
    } catch (error) {
      console.error('Error converting data URL to file:', error);
      return null;
    }
  };

  const uploadPendingImages = async (testId) => {
    const pendingImages = [];

    // Find all questions with local image files
    formData.questions.forEach((question, index) => {
      // Check if imageUrl is a blob URL (local preview)
      if (question.imageUrl && question.imageUrl.startsWith('blob:')) {
        // This means we have a file object stored, but we need to get it from the component state
        // Actually, we need to pass the file through onImageChange callback data
        pendingImages.push({ questionIndex: index, question });
      }
    });

    if (pendingImages.length === 0) {
      return; // No images to upload
    }

    // Note: Since ImageUploader gives us the File object in onImageChange,
    // we could store it in formData for this purpose
    // For now, we'll handle images that are already uploaded (have Firebase URLs)
    // and skip blob URLs (they'll be handled after test creation with returned testId)
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Test nomi bo\'sh bo\'lishi mumkin emas');
      return;
    }

    if (formData.questions.length === 0) {
      toast.error('Kamida bitta savol qo\'shing');
      return;
    }

    // Build a snapshot of questions reading current selects so correctAnswers exactly
    // match the editor contents (this ensures we overwrite previous DB values)
    const questionsSnapshot = JSON.parse(JSON.stringify(formData.questions || []));

    questionsSnapshot.forEach((q, qi) => {
      if (q.type === 'wordbank') {
        const map = syncEditorCorrectAnswers(qi) || {};
        q.correctAnswers = map;
      }
      if (q.type === 'audio' && Array.isArray(q.subQuestions)) {
        q.subQuestions.forEach((sq, sqi) => {
          if (sq.type === 'wordbank') {
            const map = syncSubQuestionCorrectAnswers(qi, sqi) || {};
            sq.correctAnswers = map;
          }
        });
      }
    });

    // Validate using the snapshot
    for (let i = 0; i < questionsSnapshot.length; i++) {
      const q = questionsSnapshot[i];

      if (q.type !== 'audio' && !q.text.trim()) {
        toast.error(`Savol ${i + 1}: Savol matni bo'sh bo'lishi mumkin emas`);
        return;
      }

      if (q.type === 'multiple') {
        if (!q.options.every(opt => opt.trim())) {
          toast.error(`Savol ${i + 1}: Barcha variantlar to'ldirilishi kerak`);
          return;
        }
      } else if (q.type === 'text') {
        if (!q.correctAnswer || !q.correctAnswer.toString().trim()) {
          toast.error(`Savol ${i + 1}: To'g'ri javob bo'sh bo'lishi mumkin emas`);
          return;
        }
      } else if (q.type === 'truefalse') {
        if (typeof q.correctAnswer !== 'boolean') {
          toast.error(`Savol ${i + 1}: To'g'ri javob (True yoki False) tanlanishi kerak`);
          return;
        }
      } else if (q.type === 'wordbank') {
        // ensure at least one blank exists in editor
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = q.text || '';
        const selects = tempDiv.querySelectorAll('select[data-blank-id]');
        if (selects.length === 0) {
          toast.error(`Savol ${i + 1}: Hech bo'lmaganda bitta blank qo'shishingiz kerak`);
          return;
        }
        // ensure correctAnswers mapping present for each blank and non-empty
        const corr = q.correctAnswers || {};
        for (const sel of selects) {
          const id = sel.getAttribute('data-blank-id');
          if (!corr[id] || !corr[id].toString().trim()) {
            toast.error(`Savol ${i + 1}: Har bir blank uchun to'g'ri javob tanlanishi kerak`);
            return;
          }
        }
      } else if (q.type === 'matching') {
        if (!q.pairs || q.pairs.length === 0) {
          toast.error(`Savol ${i + 1}: Hech bo'lmaganda bitta juft qo'shishingiz kerak`);
          return;
        }
        for (const pair of q.pairs) {
          if (!pair.left || !pair.left.trim()) {
            toast.error(`Savol ${i + 1}: Barcha juftlar uchun chap tomon matni bo'lishi kerak`);
            return;
          }
          if (!pair.right || !pair.right.trim()) {
            toast.error(`Savol ${i + 1}: Barcha juftlar uchun o'ng tomon matni bo'lishi kerak`);
            return;
          }
        }
      } else if (q.type === 'audio') {
        if (!q.audioUrl) {
          toast.error(`Savol ${i + 1}: Audio fayl yuklanishi kerak`);
          return;
        }
        if (!q.subQuestions || q.subQuestions.length === 0) {
          toast.error(`Savol ${i + 1}: Kamida bitta sub-savol qo'shishingiz kerak`);
          return;
        }
        // Validate each sub-question
        for (let sqi = 0; sqi < q.subQuestions.length; sqi++) {
          const sq = q.subQuestions[sqi];
          if (!sq.text || !sq.text.trim()) {
            toast.error(`Savol ${i + 1}, Sub-savol ${sqi + 1}: Savol matni bo'sh bo'lishi mumkin emas`);
            return;
          }
          if (sq.type === 'multiple') {
            if (!sq.options || !sq.options.every(opt => opt.trim())) {
              toast.error(`Savol ${i + 1}, Sub-savol ${sqi + 1}: Barcha variantlar to'ldirilishi kerak`);
              return;
            }
          } else if (sq.type === 'text') {
            if (!sq.correctAnswer || !sq.correctAnswer.toString().trim()) {
              toast.error(`Savol ${i + 1}, Sub-savol ${sqi + 1}: To'g'ri javob bo'sh bo'lishi mumkin emas`);
              return;
            }
          } else if (sq.type === 'truefalse') {
            if (typeof sq.correctAnswer !== 'boolean') {
              toast.error(`Savol ${i + 1}, Sub-savol ${sqi + 1}: To'g'ri javob (True yoki False) tanlanishi kerak`);
              return;
            }
          } else if (sq.type === 'wordbank') {
            // ensure blanks exist and answers provided
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = sq.text || '';
            const selects = tempDiv.querySelectorAll('select[data-blank-id]');
            if (selects.length === 0) {
              toast.error(`Savol ${i + 1}, Sub-savol ${sqi + 1}: Hech bo'lmaganda bitta blank qo'shishingiz kerak`);
              return;
            }
            const corr = sq.correctAnswers || {};
            for (const sel of selects) {
              const id = sel.getAttribute('data-blank-id');
              if (!corr[id] || !corr[id].toString().trim()) {
                toast.error(`Savol ${i + 1}, Sub-savol ${sqi + 1}: Har bir blank uchun to'g'ri javob tanlanishi kerak`);
                return;
              }
            }
          } else if (sq.type === 'matching') {
            if (!sq.pairs || sq.pairs.length === 0) {
              toast.error(`Savol ${i + 1}, Sub-savol ${sqi + 1}: Hech bo'lmaganda bitta juft qo'shishingiz kerak`);
              return;
            }
            for (const pair of sq.pairs) {
              if (!pair.left || !pair.left.trim()) {
                toast.error(`Savol ${i + 1}, Sub-savol ${sqi + 1}: Barcha juftlar uchun chap tomon matni bo'lishi kerak`);
                return;
              }
              if (!pair.right || !pair.right.trim()) {
                toast.error(`Savol ${i + 1}, Sub-savol ${sqi + 1}: Barcha juftlar uchun o'ng tomon matni bo'lishi kerak`);
                return;
              }
            }
          }
        }
      }
    }

    if (formData.visibleFor === 'group' && (!formData.groupIds || formData.groupIds.length === 0)) {
      toast.error('Kamida bitta guruh tanlanishi kerak');
      return;
    }

    toast.success('Barcha savollar to\'liq va to\'g\'ri!');

    // Clean internal-only fields and local image data before saving
    const questionsClean = (typeof questionsSnapshot !== 'undefined' ? questionsSnapshot : formData.questions).map(q => {
      const clean = { ...q };
      delete clean._newBankWord;
      delete clean.nextBlankId;
      delete clean.isImageLocal; // Don't send local flag

      // If image is still a blob URL (local preview), clear it
      // The imageFile will be sent to parent component for uploading later
      if (clean.imageUrl && clean.imageUrl.startsWith('blob:')) {
        clean.imageUrl = null;
      }

      // If there's no actual file, clear imageFileName
      if (!clean.imageFile) {
        clean.imageFileName = null;
      }

      return clean;
    });

    const payload = { ...formData, questions: questionsClean };

    // visibleFor = all bo'lsa guruhlar tozalanadi
    if (payload.visibleFor === 'all') {
      payload.groupIds = [];
      payload.groupId = null;
    } else if (payload.visibleFor === 'group') {
      // Backward compatibility: birinchi guruhni groupId sifatida saqlab qo'yamiz
      const ids = payload.groupIds || [];
      payload.groupId = ids.length > 0 ? ids[0] : null;
    }

    // Extract image files before sending to Firestore
    // Parent component will handle uploading these files separately
    const imageFilesToUpload = [];

    const questionsForDB = payload.questions.map((q, index) => {
      const qForDB = { ...q };

      // 1. Extract imageFile from simple questions
      if (q.imageFile) {
        imageFilesToUpload.push({
          questionIndex: index,
          file: q.imageFile,
          fileName: q.imageFileName,
          type: 'questionImage'
        });
      }

      // 2. Extract images from matching pairs (main question and sub-questions)
      if (q.pairs && Array.isArray(q.pairs)) {
        q.pairs.forEach((pair, pairIndex) => {
          if (pair.leftImage && pair.leftImage.startsWith('data:')) {
            const file = dataUrlToFile(pair.leftImage, `match-${index}-${pairIndex}-left.png`);
            if (file) {
              imageFilesToUpload.push({
                questionIndex: index,
                pairIndex,
                file,
                fileName: `match-${index}-${pairIndex}-left.png`,
                type: 'matchingLeft'
              });
            }
          }
          if (pair.rightImage && pair.rightImage.startsWith('data:')) {
            const file = dataUrlToFile(pair.rightImage, `match-${index}-${pairIndex}-right.png`);
            if (file) {
              imageFilesToUpload.push({
                questionIndex: index,
                pairIndex,
                file,
                fileName: `match-${index}-${pairIndex}-right.png`,
                type: 'matchingRight'
              });
            }
          }
        });
      }

      // 3. Extract images from sub-question matching pairs (audio questions)
      if (q.subQuestions && Array.isArray(q.subQuestions)) {
        q.subQuestions.forEach((subQ, subIndex) => {
          if (subQ.pairs && Array.isArray(subQ.pairs)) {
            subQ.pairs.forEach((pair, pairIndex) => {
              if (pair.leftImage && pair.leftImage.startsWith('data:')) {
                const file = dataUrlToFile(pair.leftImage, `submatch-${index}-${subIndex}-${pairIndex}-left.png`);
                if (file) {
                  imageFilesToUpload.push({
                    questionIndex: index,
                    subIndex,
                    pairIndex,
                    file,
                    fileName: `submatch-${index}-${subIndex}-${pairIndex}-left.png`,
                    type: 'subMatchingLeft'
                  });
                }
              }
              if (pair.rightImage && pair.rightImage.startsWith('data:')) {
                const file = dataUrlToFile(pair.rightImage, `submatch-${index}-${subIndex}-${pairIndex}-right.png`);
                if (file) {
                  imageFilesToUpload.push({
                    questionIndex: index,
                    subIndex,
                    pairIndex,
                    file,
                    fileName: `submatch-${index}-${subIndex}-${pairIndex}-right.png`,
                    type: 'subMatchingRight'
                  });
                }
              }
            });
          }
        });
      }

      // Don't save File object to Firestore
      delete qForDB.imageFile;

      return qForDB;
    });

    payload.questions = questionsForDB;

    // Pass test data, new files to upload, and removed image file names to parent
    // Parent will delete removed images after test is saved
    onSave(payload, imageFilesToUpload, removedImageFileNames);
  };

  return (
    <div className="test-editor">
      <form onSubmit={handleSubmit} className="test-editor-form">
        {/* Basic Information */}
        <div className="editor-section">
          <h3>{t('tests.basicInfo')}</h3>

          <div className="form-group">
            <label>{t('teacher.tests.testTitle')} *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleFormChange}
              placeholder={t('teacher.tests.testTitle')}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>{t('teacher.tests.testDescription')}</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              placeholder={t('teacher.tests.testDescription')}
              className="form-textarea"
              rows="3"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{t('teacher.tests.visibleFor')} *</label>
              <select
                name="visibleFor"
                value={formData.visibleFor}
                onChange={handleFormChange}
                className="form-select"
              >
                <option value="all">{t('teacher.tests.all')}</option>
                <option value="group">{t('teacher.tests.group')}</option>
              </select>
            </div>

            {formData.visibleFor === 'group' && (
              <div className="form-group">
                <label>{t('auth.selectGroup')} *</label>
                <div className="multi-select">
                  <button
                    type="button"
                    className="multi-select-toggle"
                    onClick={() => setIsGroupDropdownOpen(prev => !prev)}
                  >
                    <span>
                      {formData.groupIds && formData.groupIds.length > 0
                        ? `${formData.groupIds.length} ta guruh tanlandi`
                        : t('auth.selectGroup')}
                    </span>
                    <FiChevronDown className={`chevron ${isGroupDropdownOpen ? 'open' : ''}`} />
                  </button>
                  {isGroupDropdownOpen && (
                    <div className="multi-select-dropdown">
                      {groups.map(group => (
                        <label key={group.id} className="multi-select-option">
                          <input
                            type="checkbox"
                            checked={formData.groupIds?.includes(group.id)}
                            onChange={() => toggleGroupSelection(group.id)}
                          />
                          <span>{group.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="form-group">
              <label>{t('tests.timeLimit')} <small>({t('common.optional')})</small></label>
              <input
                type="number"
                name="timeLimit"
                value={formData.timeLimit || ''}
                onChange={handleFormChange}
                className="form-input"
                min="1"
                placeholder='daqiqa'
              />
            </div>
          </div>
        </div>

        {/* Sections Management */}
        <div className="editor-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>{t('teacher.tests.contextTexts')}</h3>
            <button
              type="button"
              onClick={handleAddSection}
              className="btn btn-sm btn-secondary"
            >
              <FiPlus />{t('teacher.tests.addText')}
            </button>
          </div>

          <div className="sections-list">
            {(!formData.sections || formData.sections.length === 0) ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                {t('teacher.tests.createContextTexts')}
              </p>
            ) : (
              formData.sections.map((section, index) => (
                <div
                  key={section.id}
                  style={{
                    padding: '16px',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    backgroundColor: 'var(--bg-primary)'
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                        {t('teacher.tests.sectionName')}
                      </label>
                      <input
                        type="text"
                        value={section.title || ''}
                        onChange={(e) => handleUpdateSection(section.id, 'title', e.target.value)}
                        placeholder={t('teacher.tests.sectionNamePlaceholder')}
                        className="form-input"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSection(section.id)}
                      className="btn btn-sm btn-danger"
                      style={{ marginTop: '24px' }}
                      title={t('teacher.tests.deleteSection')}
                    >
                      <FiTrash2 />
                    </button>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                      {t('teacher.tests.contextText')}
                    </label>
                    <textarea
                      value={section.passage || ''}
                      onChange={(e) => handleUpdateSection(section.id, 'passage', e.target.value)}
                      placeholder={t('teacher.tests.contextTextPlaceholder')}
                      className="form-textarea"
                      rows="3"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Questions Section */}
        <div className="editor-section">
          <h3>{t('teacher.tests.questions')} ({formData.questions.length})</h3>

          {/* Questions List with inline editing */}
          <div className="questions-list">
            {formData.questions.map((question, index) => (
              <div key={index} className="question-item">
                <div className="question-header">
                  <div style={{ flex: 1 }}>
                    <div className="d-flex">
                      <h4>{t('tests.question')} {index + 1}</h4>
                      {formData.questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(index)}
                          className="btn btn-sm btn-danger"
                          title="O'chirish">
                          <FiTrash2 />
                        </button>
                      )}
                    </div>
                    <div className="form-group-container">
                      <div className="form-group">
                        <label>{t('tests.questionType')}</label>
                        <select
                          value={question.type}
                          onChange={(e) => handleChangeQuestionType(index, e.target.value)}
                          className="form-select"
                        >
                          {QUESTION_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>{t('teacher.tests.addText')} <small>({t('common.optional')})</small></label>
                        <select
                          value={question.sectionId || ''}
                          onChange={(e) => handleSetQuestionSection(index, e.target.value)}
                          className="form-select"
                        >
                          <option value="">—{t("tests.notLinked")}—</option>
                          {(formData.sections || []).map(section => (
                            <option key={section.id} value={section.id}>
                              {section.title || `Matn ${section.id.substring(4, 8)}`}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* Image upload for question */}
                      <div className="form-group">
                        <label>{t('lessons.uploadImage')} <small>({t('common.optional')})</small></label>
                        <ImageUploader
                          initialImageUrl={question.imageUrl}
                          initialFileName={question.imageFileName}
                          onImageChange={(data) => handleQuestionImageChange(index, data)}
                          onRemove={() => handleQuestionImageRemove(index)}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>{t('tests.questionText')} *</label>
                      {question.type === 'audio' ? (
                        <textarea
                          value={question.text || ''}
                          onChange={(e) => handleQuestionChange(index, 'text', e.target.value)}
                          placeholder={t('tests.audioQuestionDescription')}
                          className="form-textarea question-edit-textarea"
                          rows="2"
                        />
                      ) : question.type === 'wordbank' ? (
                        <div className="wordbank-editor">
                          <div
                            ref={(el) => {
                              if (index === formData.questions.length - 1) {
                                questionTextareaRef.current = el;
                              } else {
                                clozeEditorRefs.current[`q${index}`] = el;
                              }
                              // Initialize content only if empty
                              if (el && !el.innerHTML.trim() && question.text) {
                                el.innerHTML = question.text;
                                // Restore select values from correctAnswers after HTML is set
                                setTimeout(() => updateEditorSelects(index, null, el), 0);
                              } else if (el && !el.innerHTML.trim() && !question.text) {
                                el.innerHTML = '<p></p>';
                              }
                            }}
                            contentEditable
                            suppressContentEditableWarning
                            className="cloze-editor"
                            onInput={(e) => {
                              // Update state without re-rendering to prevent cursor jumping
                              const editor = e.currentTarget;
                              handleQuestionChange(index, 'text', editor.innerHTML);
                              const map = syncEditorCorrectAnswers(index) || {};
                              handleQuestionChange(index, 'correctAnswers', map);
                            }}
                            onBlur={(e) => {
                              // Ensure content is saved on blur
                              handleQuestionChange(index, 'text', e.currentTarget.innerHTML);
                              const map = syncEditorCorrectAnswers(index) || {};
                              handleQuestionChange(index, 'correctAnswers', map);
                            }}
                          />

                          <div className="wordbank-controls">
                            <div className="bank-management">
                              <label>{t('tests.wordBank')}</label>
                              <div className="bank-add">
                                <input
                                  type="text"
                                  value={question._newBankWord || ''}
                                  onChange={(e) => handleQuestionChange(index, '_newBankWord', e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const word = (question._newBankWord || '').trim();
                                      if (!word) return;
                                      const newBank = [...(question.bank || []), word];
                                      handleQuestionChange(index, 'bank', newBank);
                                      handleQuestionChange(index, '_newBankWord', '');
                                      // update selects inside editor immediately with new bank
                                      updateEditorSelects(index, newBank);
                                    }
                                  }}
                                  placeholder={t('tests.addWordPlaceholder')}
                                  className="form-input"
                                />
                                <button
                                  type="button"
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => {
                                    const word = (question._newBankWord || '').trim();
                                    if (!word) return;
                                    const newBank = [...(question.bank || []), word];
                                    handleQuestionChange(index, 'bank', newBank);
                                    handleQuestionChange(index, '_newBankWord', '');
                                    // update selects inside editor immediately with new bank
                                    updateEditorSelects(index, newBank);
                                  }}
                                >{t('tests.addWord')}</button>
                              </div>

                              <div className="bank-list">
                                {(question.bank || []).map((w, wi) => (
                                  <div key={wi} className="bank-item">
                                    <span>{w}</span>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-danger"
                                      onClick={() => {
                                        const newBank = question.bank.filter((_, i) => i !== wi);
                                        handleQuestionChange(index, 'bank', newBank);
                                        // update selects inside editor immediately with new bank
                                        updateEditorSelects(index, newBank);
                                      }}
                                    >✖</button>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="bank-actions">
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                onClick={() => insertBlankAtCursor(index)}
                              >{t('tests.addBlank')}</button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <textarea
                          ref={index === formData.questions.length - 1 ? questionTextareaRef : null}
                          value={question.text}
                          onChange={(e) => handleQuestionChange(index, 'text', e.target.value)}
                          placeholder={t('tests.enterQuestion')}
                          className="form-textarea question-edit-textarea"
                          rows="2"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {question.type === 'multiple' && (
                  <div className="form-group">
                    <label>{t('tests.variants')}</label>
                    <div className="options-list">
                      {question.options.map((option, optIndex) => (
                        <div key={optIndex} className="option-item">
                          <input
                            type="radio"
                            name={`correct-${index}`}
                            checked={optIndex === question.correctAnswer}
                            onChange={() => handleQuestionChange(index, 'correctAnswer', optIndex)}
                            className="option-radio"
                          />
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => handleOptionChange(index, optIndex, e.target.value)}
                            placeholder={`Variant ${optIndex + 1}`}
                            className={`form-input ${optIndex === question.correctAnswer ? 'correct-option' : ''}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {question.type === 'text' && (
                  <div className="form-group">
                    <label>{t('tests.correctAnswer')} *</label>
                    <input
                      type="text"
                      value={question.correctAnswer || ''}
                      onChange={(e) => handleQuestionChange(index, 'correctAnswer', e.target.value)}
                      placeholder="Matnli savolga to'g'ri javobni kiriting"
                      className="form-input"
                    />
                  </div>
                )}

                {question.type === 'truefalse' && (
                  <div className="form-group">
                    <label>{t('tests.correctAnswer')} *</label>
                    <div className="truefalse-options">
                      <label className={`tf-option ${question.correctAnswer === true ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name={`tf-${index}`}
                          checked={question.correctAnswer === true}
                          onChange={() => handleQuestionChange(index, 'correctAnswer', true)}
                        />
                        {t('tests.true')}
                      </label>
                      <label className={`tf-option ${question.correctAnswer === false ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name={`tf-${index}`}
                          checked={question.correctAnswer === false}
                          onChange={() => handleQuestionChange(index, 'correctAnswer', false)}
                        />
                        {t('tests.false')}
                      </label>
                    </div>
                  </div>
                )}

                {question.type === 'matching' && (
                  <div className="form-group">
                    <label>{t('tests.questionTypeMatching')} *</label>
                    <div className="matching-pairs">
                      {(question.pairs || []).map((pair, pairIndex) => (
                        <div key={pair.id} className="matching-pair-block">
                          <div className="matching-pair-row">
                            <div className="matching-item-wrapper">
                              <input
                                type="text"
                                value={pair.left}
                                onChange={(e) => handleUpdateMatchingPair(index, pair.id, 'left', e.target.value)}
                                className="form-input"
                                placeholder={t('tests.leftSide')}
                              />
                              {pair.leftImage && (
                                <div className="matching-image-preview">
                                  <img src={pair.leftImage} alt="Left" />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateMatchingPair(index, pair.id, 'leftImage', null)}
                                    className="btn btn-xs btn-danger"
                                    title="O'chirish"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )}
                              <div className="image-upload-label">
                                <ImageUploadDropdown onFile={(file) => {
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      handleUpdateMatchingPair(index, pair.id, 'leftImage', event.target.result);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }} />
                              </div>
                            </div>

                            <span className="matching-arrow">↔</span>

                            <div className="matching-item-wrapper">
                              <input
                                type="text"
                                value={pair.right}
                                onChange={(e) => handleUpdateMatchingPair(index, pair.id, 'right', e.target.value)}
                                className="form-input"
                                placeholder={t('tests.rightSide')}
                              />
                              {pair.rightImage && (
                                <div className="matching-image-preview">
                                  <img src={pair.rightImage} alt="Right" />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateMatchingPair(index, pair.id, 'rightImage', null)}
                                    className="btn btn-xs btn-danger"
                                    title="O'chirish"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )}
                              <div className="image-upload-label">
                                <ImageUploadDropdown onFile={(file) => {
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      handleUpdateMatchingPair(index, pair.id, 'rightImage', event.target.result);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }} />
                              </div>
                            </div>

                            {(question.pairs || []).length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMatchingPair(index, pair.id)}
                                className="btn btn-sm btn-danger"
                                title="O'chirish"
                              >
                                <FiTrash2 />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddMatchingPair(index)}
                      className="btn btn-sm btn-success"
                      style={{ marginTop: '10px' }}
                    >
                      <FiPlus /> {t('tests.addNewPair')}
                    </button>
                  </div>
                )}

                {question.type === 'audio' && (
                  <>
                    <div className="form-group">
                      <AudioUploader
                        testId={initialData?.id || 'temp'}
                        initialAudioUrl={question.audioUrl}
                        initialFileName={question.audioFileName}
                        initialDuration={question.audioDuration}
                        onAudioChange={(audioData) => handleAudioChange(index, audioData)}
                        onRemove={() => handleRemoveAudio(index)}
                      />
                    </div>

                    <div className="form-group">
                      <div className="d-flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <label>Sub-savollar ({(question.subQuestions || []).length})</label>
                        <button
                          type="button"
                          onClick={() => handleAddSubQuestion(index)}
                          className="btn btn-sm btn-success"
                        >
                          <FiPlus /> Sub-savol qo'shish
                        </button>
                      </div>

                      {(question.subQuestions || []).length === 0 ? (
                        <div className="empty-subquestions">
                          <p>Hech qanday sub-savol qo'shilmagan. Audio asosida savollar yaratish uchun "Sub-savol qo'shish" tugmasini bosing.</p>
                        </div>
                      ) : (
                        <div className="sub-questions-list">
                          {(question.subQuestions || []).map((subQ, subIndex) => (
                            <div key={subIndex} className="sub-question-item">
                              <div className="sub-question-header">
                                <h5>Sub-savol {subIndex + 1}</h5>
                                {(question.subQuestions || []).length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSubQuestion(index, subIndex)}
                                    className="btn btn-sm btn-danger"
                                    title="O'chirish"
                                  >
                                    <FiTrash2 />
                                  </button>
                                )}
                              </div>

                              <div className="form-group">
                                <label>Sub-savol turi</label>
                                <select
                                  value={subQ.type}
                                  onChange={(e) => handleChangeSubQuestionType(index, subIndex, e.target.value)}
                                  className="form-select"
                                >
                                  {QUESTION_TYPES.filter(t => t.value !== 'audio').map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="form-group">
                                <label>Sub-savol matni *</label>
                                {subQ.type === 'wordbank' ? (
                                  <div className="wordbank-editor">
                                    <div
                                      ref={(el) => {
                                        const refKey = `sq${index}_${subIndex}`;
                                        if (el) {
                                          clozeEditorRefs.current[refKey] = el;
                                          // Initialize content only if empty
                                          if (!el.innerHTML.trim() && subQ.text) {
                                            el.innerHTML = subQ.text;
                                            // Restore select values from correctAnswers after HTML is set
                                            setTimeout(() => updateSubQuestionEditorSelects(index, subIndex), 0);
                                          } else if (!el.innerHTML.trim() && !subQ.text) {
                                            el.innerHTML = '<p></p>';
                                          }
                                        }
                                      }}
                                      contentEditable
                                      suppressContentEditableWarning
                                      className="cloze-editor"
                                      onInput={(e) => {
                                        // Update state without re-rendering to prevent cursor jumping
                                        const html = e.currentTarget.innerHTML;
                                        handleSubQuestionChange(index, subIndex, 'text', html);
                                        const map = syncSubQuestionCorrectAnswers(index, subIndex) || {};
                                        handleSubQuestionChange(index, subIndex, 'correctAnswers', map);
                                      }}
                                      onBlur={(e) => {
                                        // Ensure content is saved on blur
                                        const html = e.currentTarget.innerHTML;
                                        handleSubQuestionChange(index, subIndex, 'text', html);
                                        const map = syncSubQuestionCorrectAnswers(index, subIndex) || {};
                                        handleSubQuestionChange(index, subIndex, 'correctAnswers', map);
                                      }}
                                    />
                                    <div className="wordbank-controls">
                                      <div className="bank-management">
                                        <label>{t('tests.wordBank')}</label>
                                        <div className="bank-add">
                                          <input
                                            type="text"
                                            value={subQ._newBankWord || ''}
                                            onChange={(e) => handleSubQuestionChange(index, subIndex, '_newBankWord', e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                const word = (subQ._newBankWord || '').trim();
                                                if (!word) return;
                                                const newBank = [...(subQ.bank || []), word];
                                                handleSubQuestionChange(index, subIndex, 'bank', newBank);
                                                handleSubQuestionChange(index, subIndex, '_newBankWord', '');
                                                // update selects inside editor immediately with new bank
                                                updateSubQuestionEditorSelects(index, subIndex, newBank);
                                              }
                                            }}
                                            placeholder={t('tests.addWordPlaceholder')}
                                            className="form-input"
                                          />
                                          <button
                                            type="button"
                                            className="btn btn-sm btn-secondary"
                                            onClick={() => {
                                              const word = (subQ._newBankWord || '').trim();
                                              if (!word) return;
                                              const newBank = [...(subQ.bank || []), word];
                                              handleSubQuestionChange(index, subIndex, 'bank', newBank);
                                              handleSubQuestionChange(index, subIndex, '_newBankWord', '');
                                              // update selects inside editor immediately with new bank
                                              updateSubQuestionEditorSelects(index, subIndex, newBank);
                                            }}
                                          >{t('tests.addWord')}</button>
                                        </div>
                                        <div className="bank-list">
                                          {(subQ.bank || []).map((w, wi) => (
                                            <div key={wi} className="bank-item">
                                              <span>{w}</span>
                                              <button
                                                type="button"
                                                className="btn btn-sm btn-danger"
                                                onClick={() => {
                                                  const newBank = subQ.bank.filter((_, i) => i !== wi);
                                                  handleSubQuestionChange(index, subIndex, 'bank', newBank);
                                                  // update selects inside editor immediately with new bank
                                                  updateSubQuestionEditorSelects(index, subIndex, newBank);
                                                }}
                                              >✖</button>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      <div className="bank-actions">
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-primary"
                                          onClick={() => insertBlankAtCursor(`${index}_${subIndex}`)}
                                        >{t('tests.addBlank')}</button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <textarea
                                    value={subQ.text}
                                    onChange={(e) => handleSubQuestionChange(index, subIndex, 'text', e.target.value)}
                                    placeholder="Sub-savolni kiriting"
                                    className="form-textarea"
                                    rows="2"
                                  />
                                )}
                              </div>

                              {subQ.type === 'multiple' && (
                                <div className="form-group">
                                  <label>{t('tests.variants')}</label>
                                  <div className="options-list">
                                    {subQ.options.map((option, optIndex) => (
                                      <div key={optIndex} className="option-item">
                                        <input
                                          type="radio"
                                          name={`sub-correct-${index}-${subIndex}`}
                                          checked={optIndex === subQ.correctAnswer}
                                          onChange={() => handleSubQuestionChange(index, subIndex, 'correctAnswer', optIndex)}
                                          className="option-radio"
                                        />
                                        <input
                                          type="text"
                                          value={option}
                                          onChange={(e) => handleSubQuestionOptionChange(index, subIndex, optIndex, e.target.value)}
                                          placeholder={`Variant ${optIndex + 1}`}
                                          className={`form-input ${optIndex === subQ.correctAnswer ? 'correct-option' : ''}`}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {subQ.type === 'text' && (
                                <div className="form-group">
                                  <label>{t('tests.correctAnswer')} *</label>
                                  <input
                                    type="text"
                                    value={subQ.correctAnswer || ''}
                                    onChange={(e) => handleSubQuestionChange(index, subIndex, 'correctAnswer', e.target.value)}
                                    placeholder="Matnli savolga to'g'ri javobni kiriting"
                                    className="form-input"
                                  />
                                </div>
                              )}

                              {subQ.type === 'truefalse' && (
                                <div className="form-group">
                                  <label>{t('tests.correctAnswer')} *</label>
                                  <div className="truefalse-options">
                                    <label className={`tf-option ${subQ.correctAnswer === true ? 'selected' : ''}`}>
                                      <input
                                        type="radio"
                                        name={`sub-tf-${index}-${subIndex}`}
                                        checked={subQ.correctAnswer === true}
                                        onChange={() => handleSubQuestionChange(index, subIndex, 'correctAnswer', true)}
                                      />
                                      {t('tests.true')}
                                    </label>
                                    <label className={`tf-option ${subQ.correctAnswer === false ? 'selected' : ''}`}>
                                      <input
                                        type="radio"
                                        name={`sub-tf-${index}-${subIndex}`}
                                        checked={subQ.correctAnswer === false}
                                        onChange={() => handleSubQuestionChange(index, subIndex, 'correctAnswer', false)}
                                      />
                                      {t('tests.false')}
                                    </label>
                                  </div>
                                </div>
                              )}

                              {subQ.type === 'matching' && (
                                <div className="form-group">
                                  <label>Moslashtirish juftlari *</label>
                                  <div className="matching-pairs">
                                    {(subQ.pairs || []).map((pair, pairIndex) => (
                                      <div key={pair.id || pairIndex} className="matching-pair-block">
                                        <div className="matching-pair-row">
                                          <div className="matching-item-wrapper">
                                            <input
                                              type="text"
                                              value={pair.left}
                                              onChange={(e) => {
                                                const newPairs = [...(subQ.pairs || [])];
                                                newPairs[pairIndex] = { ...pair, left: e.target.value };
                                                handleSubQuestionChange(index, subIndex, 'pairs', newPairs);
                                              }}
                                              placeholder="Chap tomon"
                                              className="form-input"
                                            />
                                            {pair.leftImage && (
                                              <div className="matching-image-preview">
                                                <img src={pair.leftImage} alt="Left" />
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const newPairs = [...(subQ.pairs || [])];
                                                    newPairs[pairIndex] = { ...pair, leftImage: null };
                                                    handleSubQuestionChange(index, subIndex, 'pairs', newPairs);
                                                  }}
                                                  className="btn btn-xs btn-danger"
                                                  title="O'chirish"
                                                >
                                                  ✕
                                                </button>
                                              </div>
                                            )}
                                            <div className="image-upload-label">
                                              <ImageUploadDropdown onFile={(file) => {
                                                if (file) {
                                                  const reader = new FileReader();
                                                  reader.onload = (event) => {
                                                    const newPairs = [...(subQ.pairs || [])];
                                                    newPairs[pairIndex] = { ...pair, leftImage: event.target.result };
                                                    handleSubQuestionChange(index, subIndex, 'pairs', newPairs);
                                                  };
                                                  reader.readAsDataURL(file);
                                                }
                                              }} />
                                            </div>
                                          </div>

                                          <span className="matching-arrow">↔</span>

                                          <div className="matching-item-wrapper">
                                            <input
                                              type="text"
                                              value={pair.right}
                                              onChange={(e) => {
                                                const newPairs = [...(subQ.pairs || [])];
                                                newPairs[pairIndex] = { ...pair, right: e.target.value };
                                                handleSubQuestionChange(index, subIndex, 'pairs', newPairs);
                                              }}
                                              placeholder="O'ng tomon"
                                              className="form-input"
                                            />
                                            {pair.rightImage && (
                                              <div className="matching-image-preview">
                                                <img src={pair.rightImage} alt="Right" />
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const newPairs = [...(subQ.pairs || [])];
                                                    newPairs[pairIndex] = { ...pair, rightImage: null };
                                                    handleSubQuestionChange(index, subIndex, 'pairs', newPairs);
                                                  }}
                                                  className="btn btn-xs btn-danger"
                                                  title="O'chirish"
                                                >
                                                  ✕
                                                </button>
                                              </div>
                                            )}
                                            <div className="image-upload-label">
                                              <ImageUploadDropdown onFile={(file) => {
                                                if (file) {
                                                  const reader = new FileReader();
                                                  reader.onload = (event) => {
                                                    const newPairs = [...(subQ.pairs || [])];
                                                    newPairs[pairIndex] = { ...pair, rightImage: event.target.result };
                                                    handleSubQuestionChange(index, subIndex, 'pairs', newPairs);
                                                  };
                                                  reader.readAsDataURL(file);
                                                }
                                              }} />
                                            </div>
                                          </div>

                                          {(subQ.pairs || []).length > 1 && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                handleRemoveSubQuestionMatchingPair(index, subIndex, pairIndex);
                                              }}
                                              className="btn btn-sm btn-danger"
                                              title="O'chirish"
                                            >
                                              <FiTrash2 />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newPair = { id: Date.now().toString(), left: '', right: '', leftImage: null, rightImage: null };
                                      handleSubQuestionChange(index, subIndex, 'pairs', [...(subQ.pairs || []), newPair]);
                                    }}
                                    className="btn btn-sm btn-success"
                                    style={{ marginTop: '10px' }}
                                  >
                                    <FiPlus /> {t('tests.addNewPair')}
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Add new question button */}
          <button
            type="button"
            onClick={handleAddQuestion}
            className="btn btn-secondary btn-block"
          >
            <FiPlus /> {t('tests.addQuestion')}
          </button>
        </div>

        {/* Submit Buttons */}
        <div className="editor-actions">
          <button type="button" onClick={onCancel} className="btn btn-outline">
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn btn-primary">
            {initialData ? t('common.save') : t('tests.createTest')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TestEditor;
