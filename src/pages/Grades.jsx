import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { gradeService } from '../services/gradeService';
import { groupService } from '../services/groupService';
import { 
  FiAward, 
  FiTrendingUp,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiBookOpen
} from 'react-icons/fi';
import LoadingSpinner from '../components/common/LoadingSpinner';
import './Grades.css';

// Oy nomlari
const MONTH_NAMES = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
];

const Grades = () => {
  const { userData, currentUser } = useAuth();
  const { t } = useTranslation();
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overallAverage, setOverallAverage] = useState(0);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Fanlar ro'yxatini yuklash
  useEffect(() => {
    const loadSubjects = async () => {
      if (!userData?.groupId) {
        setLoading(false);
        return;
      }

      try {
        const groupResult = await groupService.getGroupById(userData.groupId);
        if (groupResult.success && groupResult.data.subjectTeachers) {
          const subjectTeachers = groupResult.data.subjectTeachers;
          
          // Remove duplicate subjects based on subjectId
          const uniqueSubjects = [];
          const seenSubjectIds = new Set();
          for (const st of subjectTeachers) {
            if (!seenSubjectIds.has(st.subjectId)) {
              seenSubjectIds.add(st.subjectId);
              uniqueSubjects.push({
                id: st.subjectId,
                name: st.subjectName,
                teacherId: st.teacherId,
                teacherName: st.teacherName
              });
            }
          }
          setSubjects(uniqueSubjects);
        }
      } catch (error) {
        console.error('Load subjects error:', error);
      }
    };

    loadSubjects();
  }, [userData]);

  // Baholarni yuklash
  const loadGrades = useCallback(async () => {
    const studentId = currentUser?.uid || userData?.uid;
    if (!studentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let allGrades = [];

      if (selectedSubject === 'all') {
        // Barcha fanlar bo'yicha baholar
        const result = await gradeService.getGradesByStudent(studentId);
        if (result.success) {
          allGrades = result.data;
        }
      } else {
        // Tanlangan fan bo'yicha baholar
        const result = await gradeService.getGradesByStudentAndSubject(
          studentId,
          selectedSubject
        );
        if (result.success) {
          allGrades = result.data.grades;
        }
      }

      // Oy bo'yicha filtrlash
      const filteredGrades = allGrades.filter(grade => {
        const gradeDate = new Date(grade.date);
        return gradeDate.getMonth() === selectedMonth && 
               gradeDate.getFullYear() === selectedYear;
      });

      // Remove duplicates based on grade.id
      const uniqueGrades = [];
      const seenIds = new Set();
      for (const grade of filteredGrades) {
        if (!seenIds.has(grade.id)) {
          seenIds.add(grade.id);
          uniqueGrades.push(grade);
        }
      }

      setGrades(uniqueGrades);

      // Umumiy o'rtacha bahoni hisoblash
      if (uniqueGrades.length > 0) {
        const total = uniqueGrades.reduce((sum, grade) => sum + grade.grade, 0);
        setOverallAverage(Math.round((total / uniqueGrades.length) * 100) / 100);
      } else {
        setOverallAverage(0);
      }
    } catch (error) {
      console.error('Load grades error:', error);
    }
    setLoading(false);
  }, [currentUser, userData, selectedSubject, selectedMonth, selectedYear]);

  useEffect(() => {
    if (userData?.uid || currentUser?.uid) {
      loadGrades();
    }
  }, [userData, currentUser, loadGrades]);

  // Oldingi oy
  const prevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  // Keyingi oy
  const nextMonth = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Kelgusi oylarga o'tmaslik
    if (selectedYear === currentYear && selectedMonth >= currentMonth) {
      return;
    }
    
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const canGoNext = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    return !(selectedYear === currentYear && selectedMonth >= currentMonth);
  }, [selectedMonth, selectedYear]);

  // Baho rangini olish
  const getGradeColor = (grade) => {
    if (grade >= 4.5) return '#10b981'; // Green
    if (grade >= 3.5) return '#3b82f6'; // Blue
    if (grade >= 2.5) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  };

  // Sana formatini o'zgartirish (DD/MM/YYYY)
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="grades-page">
      <div className="page-header">
        <div>
          <h1>{t('grades.title')}</h1>
          <p>{t('grades.title')}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grades-stats">
        <div className="stat-card-large">
          <FiAward className="stat-icon-large" />
          <div>
            <span className="stat-label-large">{t('grades.average')}</span>
            <h2 
              className="stat-value-large" 
              style={{ color: getGradeColor(overallAverage) }}
            >
              {overallAverage > 0 ? overallAverage.toFixed(2) : '-'}
            </h2>
          </div>
        </div>

        <div className="stat-card-large">
          <FiTrendingUp className="stat-icon-large" />
          <div>
            <span className="stat-label-large">Jami baholar</span>
            <h2 className="stat-value-large">{grades.length}</h2>
          </div>
        </div>

        <div className="stat-card-large">
          <FiBookOpen className="stat-icon-large" />
          <div>
            <span className="stat-label-large">Fanlar soni</span>
            <h2 className="stat-value-large">{subjects.length}</h2>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grades-filters">
        <div className="filter-group">
          <label>FAN</label>
          <select 
            className="filter-select"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            <option value="all">{t('grades.allSubjects')}</option>
            {subjects.map(subject => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>

        <div className="month-selector">
          <button className="month-nav" onClick={prevMonth}>
            <FiChevronLeft />
          </button>
          <div className="month-display">
            <FiCalendar />
            <span>{MONTH_NAMES[selectedMonth]} {selectedYear}</span>
          </div>
          <button 
            className="month-nav" 
            onClick={nextMonth}
            disabled={!canGoNext}
          >
            <FiChevronRight />
          </button>
        </div>
      </div>

      {/* Grades Table */}
      {grades.length === 0 ? (
        <div className="empty-state-large">
          <FiAward size={64} />
          <h2>{t('grades.noGrades')}</h2>
          <p>{t('grades.noGrades')}</p>
        </div>
      ) : (
        <div className="grades-table-container">
          <table className="grades-table">
            <thead>
              <tr>
                <th>{t('grades.subject')}</th>
                <th>{t('grades.grade')}</th>
                <th>{t('grades.date')}</th>
                <th>{t('common.teacher')}</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((grade) => {
                const subject = subjects.find(s => s.id === grade.subjectId);
                return (
                  <tr key={grade.id}>
                    <td className="grade-name">
                      {subject?.name || grade.subjectName || 'Noma\'lum fan'}
                    </td>
                    <td>
                      <span 
                        className="grade-badge"
                        style={{ 
                          backgroundColor: getGradeColor(grade.grade) + '20', 
                          color: getGradeColor(grade.grade) 
                        }}
                      >
                        {grade.grade}
                      </span>
                    </td>
                    <td className="grade-date">
                      {formatDate(grade.date)}
                    </td>
                    <td className="grade-teacher">
                      {grade.teacherName || 'Noma\'lum'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Grades;
