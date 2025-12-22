import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { 
  FiUsers, 
  FiCalendar, 
  FiSave,
  FiStar,
  FiChevronLeft,
  FiChevronRight,
  FiInfo,
  FiEdit2,
  FiX
} from 'react-icons/fi';
import { groupService } from '../../services/groupService';
import { gradeService } from '../../services/gradeService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import './TeacherGroupGrades.css';

// Hafta kunlari
const WEEK_DAYS = [
  { id: 1, name: 'Dushanba', short: 'Du' },
  { id: 2, name: 'Seshanba', short: 'Se' },
  { id: 3, name: 'Chorshanba', short: 'Ch' },
  { id: 4, name: 'Payshanba', short: 'Pa' },
  { id: 5, name: 'Juma', short: 'Ju' },
  { id: 6, name: 'Shanba', short: 'Sh' },
  { id: 0, name: 'Yakshanba', short: 'Ya' }
];

// Oy nomlari
const MONTH_NAMES = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
];

const TeacherGroupGrades = () => {
  const { currentUser, userData } = useAuth();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  
  // Baholar states
  const [grades, setGrades] = useState({}); // { [studentId]: { [date]: { id, grade } } }
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Oy tanlash
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Tanlangan guruhning fan ma'lumoti
  const [subjectInfo, setSubjectInfo] = useState(null);

  // Dars kunlari nomlarini olish
  const scheduleDaysNames = useMemo(() => {
    if (!subjectInfo?.scheduleDays || subjectInfo.scheduleDays.length === 0) {
      return 'Belgilanmagan';
    }
    return subjectInfo.scheduleDays
      .map(dayId => WEEK_DAYS.find(d => d.id === dayId)?.name || '')
      .filter(Boolean)
      .join(', ');
  }, [subjectInfo]);

  // Tanlangan oy ichidagi dars kunlarini generatsiya qilish
  const scheduledDates = useMemo(() => {
    if (!subjectInfo?.scheduleDays || subjectInfo.scheduleDays.length === 0) {
      return [];
    }

    const dates = [];
    const year = selectedYear;
    const month = selectedMonth;
    
    // Oyning birinchi va oxirgi kunini olish
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Oyning har bir kunini tekshirish
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay(); // 0 = Yakshanba
      
      // Dars kuniga mos kelishini tekshirish
      if (subjectInfo.scheduleDays.includes(dayOfWeek)) {
        // Faqat bugundan oldingi yoki bugungi kunlarni ko'rsatish
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date <= today) {
          const dateStr = date.toISOString().split('T')[0];
          dates.push(dateStr);
        }
      }
    }
    
    return dates;
  }, [subjectInfo, selectedMonth, selectedYear]);

  // O'qituvchiga biriktirilgan guruhlarni yuklash
  useEffect(() => {
    const loadGroups = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      const result = await groupService.getGroupsByTeacher(currentUser.uid);
      
      if (result.success) {
        setGroups(result.data);
        if (result.data.length > 0) {
          // localStorage'dan saqlangan guruhni yuklash
          const savedGroupId = localStorage.getItem('teacher_selected_group_id');
          const savedGroup = savedGroupId 
            ? result.data.find(g => g.id === savedGroupId)
            : null;
          
          const groupToSelect = savedGroup || result.data[0];
          setSelectedGroup(groupToSelect);
          
          const subjectTeacher = (groupToSelect.subjectTeachers || []).find(
            st => st.teacherId === currentUser.uid
          );
          setSubjectInfo(subjectTeacher);
        }
      } else {
        toast.error('Guruhlarni yuklashda xatolik');
      }
      setLoading(false);
    };

    loadGroups();
  }, [currentUser]);

  // Guruh o'zgarganda
  useEffect(() => {
    const loadStudentsAndGrades = async () => {
      if (!selectedGroup) return;
      
      setLoadingStudents(true);
      
      // Fan ma'lumotini oldin yangilash
      const subjectTeacher = (selectedGroup.subjectTeachers || []).find(
        st => st.teacherId === currentUser.uid
      );
      setSubjectInfo(subjectTeacher);
      
      const result = await groupService.getGroupStudents(selectedGroup.id);
      
      if (result.success) {
        setStudents(result.data);
        // Baholarni yuklash
        await loadGrades(subjectTeacher);
      }
      
      setLoadingStudents(false);
    };

    loadStudentsAndGrades();
  }, [selectedGroup, currentUser]);

  // Baholarni yuklash
  const loadGrades = async (subject) => {
    if (!selectedGroup || !subject?.subjectId) {
      setGrades({});
      return;
    }

    const result = await gradeService.getGradesByGroupAndSubject(
      selectedGroup.id,
      subject.subjectId
    );

    if (result.success) {
      // Baholarni talabalar bo'yicha guruhlash
      const groupedGrades = {};
      
      result.data.forEach(grade => {
        const dateStr = grade.date;
        
        if (!groupedGrades[grade.studentId]) {
          groupedGrades[grade.studentId] = {};
        }
        groupedGrades[grade.studentId][dateStr] = {
          id: grade.id,
          grade: grade.grade
        };
      });

      setGrades(groupedGrades);
    } else {
      setGrades({});
    }
  };

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

  // Bahoni o'zgartirish
  const handleGradeChange = (studentId, date, value) => {
    const grade = Math.min(Math.max(parseInt(value) || 0, 0), 5);
    
    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [date]: {
          ...(prev[studentId]?.[date] || {}),
          grade,
          isModified: true
        }
      }
    }));
  };

  // Baholarni saqlash
  const handleSave = async () => {
    if (!selectedGroup || !subjectInfo?.subjectId) {
      toast.error('Guruh yoki fan tanlanmagan');
      return;
    }

    setSaving(true);
    let savedCount = 0;
    let errorCount = 0;

    for (const studentId of Object.keys(grades)) {
      for (const date of Object.keys(grades[studentId])) {
        const gradeData = grades[studentId][date];
        
        // Faqat o'zgartirilgan baholarni saqlash
        if (!gradeData.isModified) continue;
        
        // 0 bo'lsa va mavjud bo'lsa o'chirish
        if (gradeData.grade === 0 && gradeData.id) {
          const result = await gradeService.deleteGrade(gradeData.id);
          if (result.success) {
            savedCount++;
          } else {
            errorCount++;
          }
        } else if (gradeData.grade > 0) {
          // Yangi baho yoki yangilash
          const student = students.find(s => s.id === studentId);
          const payload = {
            groupId: selectedGroup.id,
            subjectId: subjectInfo.subjectId,
            subjectName: subjectInfo.subjectName,
            teacherId: currentUser.uid,
            teacherName: userData?.displayName,
            studentId,
            studentName: student?.displayName || '',
            grade: gradeData.grade,
            date
          };

          let result;
          if (gradeData.id) {
            result = await gradeService.updateGrade(gradeData.id, { grade: gradeData.grade });
          } else {
            result = await gradeService.createGrade(payload);
          }

          if (result.success) {
            savedCount++;
            // ID ni yangilash
            if (!gradeData.id && result.id) {
              setGrades(prev => ({
                ...prev,
                [studentId]: {
                  ...prev[studentId],
                  [date]: {
                    ...prev[studentId][date],
                    id: result.id,
                    isModified: false
                  }
                }
              }));
            }
          } else {
            errorCount++;
          }
        }
      }
    }

    // isModified flaglarini tozalash
    setGrades(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(studentId => {
        Object.keys(updated[studentId]).forEach(date => {
          if (updated[studentId][date].isModified) {
            updated[studentId][date].isModified = false;
          }
        });
      });
      return updated;
    });

    if (errorCount > 0) {
      toast.error(`${errorCount} ta bahoni saqlashda xatolik`);
    } else if (savedCount > 0) {
      toast.success(`${savedCount} ta baho saqlandi`);
    } else {
      toast.info('O\'zgarishlar yo\'q');
    }

    setSaving(false);
  };

  // O'rtacha bahoni hisoblash
  const calculateAverage = (studentId) => {
    const studentGrades = grades[studentId];
    if (!studentGrades) return '-';

    const validGrades = Object.values(studentGrades)
      .map(g => g.grade)
      .filter(g => g > 0);

    if (validGrades.length === 0) return '-';

    const avg = validGrades.reduce((a, b) => a + b, 0) / validGrades.length;
    return avg.toFixed(1);
  };

  // O'rtacha baho rangi
  const getAverageClass = (avg) => {
    if (avg === '-') return '';
    const num = parseFloat(avg);
    if (num >= 4.5) return 'excellent';
    if (num >= 3.5) return 'good';
    if (num >= 2.5) return 'satisfactory';
    return 'poor';
  };

  // Sana formati (kun va hafta kuni)
  const formatDateWithDay = (dateStr) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const dayOfWeek = date.getDay();
    const dayName = WEEK_DAYS.find(d => d.id === dayOfWeek)?.short || '';
    return { day, dayName };
  };

  // Bahoning rangi
  const getGradeClass = (grade) => {
    if (grade >= 5) return 'grade-5';
    if (grade >= 4) return 'grade-4';
    if (grade >= 3) return 'grade-3';
    if (grade >= 2) return 'grade-2';
    return '';
  };

  // Kelgusi oyga o'tish mumkinmi
  const canGoNext = useMemo(() => {
    const today = new Date();
    return !(selectedYear === today.getFullYear() && selectedMonth >= today.getMonth());
  }, [selectedMonth, selectedYear]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (groups.length === 0) {
    return (
      <div className="teacher-grades-page">
        <div className="empty-state-full">
          <FiUsers size={64} />
          <h2>Sizga biriktirilgan guruhlar yo'q</h2>
          <p>Administrator sizni guruhlarga biriktirishi kerak</p>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-grades-page hemis-style">
      {/* Breadcrumb */}
      <div className="page-breadcrumb">
        <span>Asosiy</span>
        <span className="separator">/</span>
        <span>Guruhlar</span>
        <span className="separator">/</span>
        <span className="current">Baholar</span>
      </div>

      {/* Header */}
      <div className="grades-header">
        <div className="header-left">
          <h1><FiStar /> Baholar jadvali</h1>
          <p>{subjectInfo?.subjectName || userData?.subjectName || 'Fan'}</p>
        </div>
        <div className="header-right">
          <select 
            className="group-select"
            value={selectedGroup?.id || ''}
            onChange={(e) => {
              const group = groups.find(g => g.id === e.target.value);
              setSelectedGroup(group);
              // localStorage'ga saqlash
              if (group) {
                localStorage.setItem('teacher_selected_group_id', group.id);
              }
            }}
          >
            {groups.map(group => (
              <option key={group.id} value={group.id}>
                {group.name} ({group.year}-kurs)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Month Selector */}
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

      {/* Schedule Info */}
      <div className="schedule-info-bar">
        <FiInfo />
        <span>Dars kunlari: <strong>{scheduleDaysNames}</strong></span>
        <span className="schedule-count">{scheduledDates.length} ta dars</span>
      </div>

      {/* Grades Table */}
      <div className="grades-table-container">
        {loadingStudents ? (
          <div className="loading-container">
            <LoadingSpinner />
          </div>
        ) : students.length === 0 ? (
          <div className="empty-table">
            <FiUsers size={48} />
            <p>Bu guruhda talabalar yo'q</p>
          </div>
        ) : scheduledDates.length === 0 ? (
          <div className="empty-table">
            <FiCalendar size={48} />
            <p>Bu oyda dars kunlari yo'q</p>
          </div>
        ) : (
          <div className="grades-table-wrapper">
            <table className="grades-table">
              <thead>
                <tr>
                  <th className="col-num sticky-col">№</th>
                  <th className="col-name sticky-col">Talaba</th>
                  {scheduledDates.map(date => {
                    const { day, dayName } = formatDateWithDay(date);
                    return (
                      <th key={date} className="col-grade">
                        <div className="date-header-auto">
                          <span className="date-day">{day}</span>
                          <span className="date-weekday">{dayName}</span>
                        </div>
                      </th>
                    );
                  })}
                  <th className="col-average sticky-col-right">O'rtacha</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => {
                  const avg = calculateAverage(student.id);
                  
                  return (
                    <tr key={student.id}>
                      <td className="col-num sticky-col">{index + 1}</td>
                      <td className="col-name sticky-col">
                        {student.displayName || 'Noma\'lum'}
                      </td>
                      {scheduledDates.map(date => {
                        const gradeData = grades[student.id]?.[date];
                        const gradeValue = gradeData?.grade || '';
                        
                        return (
                          <td key={date} className="col-grade">
                            <input
                              type="number"
                              className={`grade-input ${getGradeClass(gradeValue)}`}
                              value={gradeValue}
                              onChange={(e) => handleGradeChange(student.id, date, e.target.value)}
                              min="0"
                              max="5"
                              placeholder="-"
                              disabled={!isEditing}
                            />
                          </td>
                        );
                      })}
                      <td className={`col-average sticky-col-right ${getAverageClass(avg)}`}>
                        {avg}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Actions */}
      {students.length > 0 && scheduledDates.length > 0 && (
        <div className="grades-actions">
          {!isEditing ? (
            <button 
              className="btn-edit"
              onClick={() => setIsEditing(true)}
            >
              <FiEdit2 /> Tahrirlash
            </button>
          ) : (
            <>
              <button 
                className="btn-cancel"
                onClick={async () => {
                  setIsEditing(false);
                  // Baholarni qayta yuklash
                  if (selectedGroup && subjectInfo) {
                    await loadGrades(subjectInfo);
                  }
                }}
              >
                <FiX /> Bekor qilish
              </button>
              <button 
                className="btn-save"
                onClick={async () => {
                  await handleSave();
                  setIsEditing(false);
                }}
                disabled={saving}
              >
                <FiSave /> {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TeacherGroupGrades;
