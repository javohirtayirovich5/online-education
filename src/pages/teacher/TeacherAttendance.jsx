import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { toast } from 'react-toastify';
import {
  FiUsers,
  FiCalendar,
  FiCheck,
  FiInfo,
  FiBook,
  FiClock,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2
} from 'react-icons/fi';
import { groupService } from '../../services/groupService';
import { attendanceService } from '../../services/attendanceService';
import { settingsService } from '../../services/settingsService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import './TeacherAttendance.css';

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

const TeacherAttendance = () => {
  const { currentUser, userData } = useAuth();
  const { t } = useTranslation();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Davomat states
  const [selectedDate, setSelectedDate] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Oy tanlash
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Talabalarning umumiy davomat statistikasi
  const [studentStats, setStudentStats] = useState({});

  // Tanlangan guruhning fan ma'lumoti
  const [subjectInfo, setSubjectInfo] = useState(null);
  // Tanlangan shart (lessonType) ma'lumoti - agar bir guruhda bir nechta fan/shart bo'lsa
  const [selectedSubjectTeacher, setSelectedSubjectTeacher] = useState(null);
  // Tanlangan guruhda mavjud barcha fan/shart kombinatsiyalari
  const [availableSubjectTeachers, setAvailableSubjectTeachers] = useState([]);
  // Global semestr sozlamalari
  const [semesterSettings, setSemesterSettings] = useState(null);

  // Student detail modal (missed dates)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStudent, setModalStudent] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalMissedDates, setModalMissedDates] = useState([]);
  const [modalTotalMissedHours, setModalTotalMissedHours] = useState(0);

  // Har bir dars 2 soat
  const HOURS_PER_LESSON = 2;

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

    // Oyning oxirgi kunini olish
    const lastDay = new Date(year, month + 1, 0);

    // Oyning har bir kunini tekshirish
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();

      // Dars kuniga mos kelishini tekshirish
      if (subjectInfo.scheduleDays.includes(dayOfWeek)) {
        // Faqat bugundan oldingi yoki bugungi kunlarni ko'rsatish
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date <= today) {
          // Use local date format instead of ISO to avoid timezone issues
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          dates.push(dateStr);
        }
      }
    }

    return dates;
  }, [subjectInfo, selectedMonth, selectedYear]);

  // Birinchi dars kunini tanlash (oy o'zgarganda)
  useEffect(() => {
    if (scheduledDates.length > 0 && !selectedDate) {
      // Eng oxirgi dars kunini tanlash
      setSelectedDate(scheduledDates[scheduledDates.length - 1]);
    } else if (scheduledDates.length > 0 && !scheduledDates.includes(selectedDate)) {
      setSelectedDate(scheduledDates[scheduledDates.length - 1]);
    }
  }, [scheduledDates]);

  // O'qituvchiga biriktirilgan guruhlar va global semestr sozlamalarini yuklash
  useEffect(() => {
    const loadInitialData = async () => {
      if (!currentUser) return;

      setLoading(true);
      try {
        const [groupsResult, semesterResult] = await Promise.all([
          groupService.getGroupsByTeacher(currentUser.uid),
          settingsService.getSemesterSettings()
        ]);

        if (groupsResult.success) {
          const teacherGroups = groupsResult.data || [];
          setGroups(teacherGroups);

          if (teacherGroups.length > 0) {
            // localStorage'dan saqlangan guruhni yuklash
            const savedGroupId = localStorage.getItem('teacher_selected_group_id');
            const savedGroup = savedGroupId
              ? teacherGroups.find(g => g.id === savedGroupId)
              : null;

            const groupToSelect = savedGroup || teacherGroups[0];
            setSelectedGroup(groupToSelect);

            const subjectTeacher = (groupToSelect.subjectTeachers || []).find(
              st => st.teacherId === currentUser.uid
            );
            setSubjectInfo(subjectTeacher);
          }
        } else {
          toast.error('Guruhlarni yuklashda xatolik');
        }

        if (semesterResult.success && semesterResult.data) {
          setSemesterSettings(semesterResult.data);
        }
      } catch (error) {
        console.error('TeacherAttendance initial load error:', error);
        toast.error('Ma\'lumotlarni yuklashda xatolik');
      }
      setLoading(false);
    };

    loadInitialData();
  }, [currentUser]);

  // Guruh o'zgarganda
  useEffect(() => {
    const loadStudents = async () => {
      if (!selectedGroup) return;

      setLoadingStudents(true);

      // O'qituvchining bu guruhda barcha fan/shart kombinatsiyalarini topish
      const teacherSubjects = (selectedGroup.subjectTeachers || []).filter(
        st => st.teacherId === currentUser.uid
      );
      setAvailableSubjectTeachers(teacherSubjects);

      // Birinchi fan/shartni tanlash
      if (teacherSubjects.length > 0) {
        setSelectedSubjectTeacher(teacherSubjects[0]);
        setSubjectInfo(teacherSubjects[0]);
      } else {
        setSelectedSubjectTeacher(null);
        setSubjectInfo(null);
      }

      const result = await groupService.getGroupStudents(selectedGroup.id);

      if (result.success) {
        setStudents(result.data);
        if (teacherSubjects.length > 0) {
          loadStudentStatsWithData(teacherSubjects[0], result.data);
        }
      }

      setLoadingStudents(false);
    };

    loadStudents();
  }, [selectedGroup, currentUser]);

  // Sana o'zgarganda davomat yuklash
  useEffect(() => {
    if (selectedGroup && selectedDate && selectedSubjectTeacher) {
      loadAttendance();
    }
  }, [selectedDate, selectedGroup, selectedSubjectTeacher]);



  // Talabalarning umumiy davomat statistikasini yuklash
  const loadStudentStatsWithData = async (subjectData, studentsList, currentAttendance = null) => {
    if (!selectedGroup) return;

    const result = await attendanceService.getAttendanceByGroup(selectedGroup.id);

    if (result.success) {
      let allAttendance = result.data;

      if (currentAttendance && selectedDate) {
        const existingIndex = allAttendance.findIndex(
          a => a.date === selectedDate &&
            a.subjectId === subjectData?.subjectId &&
            a.lessonType === subjectData?.lessonType
        );

        if (existingIndex >= 0) {
          allAttendance[existingIndex] = {
            ...allAttendance[existingIndex],
            records: currentAttendance
          };
        } else {
          allAttendance.push({
            date: selectedDate,
            subjectId: subjectData?.subjectId,
            lessonType: subjectData?.lessonType,
            records: currentAttendance
          });
        }
      }

      // Tangilangan fanga va shartga qarab filter qilish
      let subjectAttendance = allAttendance;
      if (subjectData?.subjectId) {
        subjectAttendance = allAttendance.filter(a => a.subjectId === subjectData.subjectId);
        // Agar lessonType bilan filter qilish kerak bo'lsa
        if (subjectData?.lessonType) {
          subjectAttendance = subjectAttendance.filter(a => a.lessonType === subjectData.lessonType);
        }
      }

      // Semestr sanalarini aniqlash (global sozlamalardan)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let semesterStart = semesterSettings?.semesterStartDate
        ? new Date(semesterSettings.semesterStartDate)
        : null;
      let semesterEnd = semesterSettings?.semesterEndDate
        ? new Date(semesterSettings.semesterEndDate)
        : null;

      if (!semesterStart || isNaN(semesterStart.getTime())) {
        semesterStart = new Date(today.getFullYear(), 0, 1); // joriy yil boshidan
      }

      if (!semesterEnd || isNaN(semesterEnd.getTime())) {
        semesterEnd = today;
      }

      if (semesterStart > semesterEnd) {
        semesterStart = semesterEnd;
      }

      // Semestr oraliigidagi davomat yozuvlarini filterlash
      const semesterAttendance = subjectAttendance.filter(a => {
        const d = new Date(a.date);
        d.setHours(0, 0, 0, 0);
        return d >= semesterStart && d <= semesterEnd;
      });

      // Rejalashtirilgan barcha dars kunlarini hisoblash (scheduleDays asosida)
      let totalLessons = 0;

      if (subjectData?.scheduleDays && subjectData.scheduleDays.length > 0) {
        const scheduledDatesSet = new Set();
        const cursor = new Date(semesterStart);

        while (cursor <= semesterEnd) {
          const dayOfWeek = cursor.getDay(); // 0-6
          if (subjectData.scheduleDays.includes(dayOfWeek)) {
            // Use local date format instead of ISO to avoid timezone issues
            const year = cursor.getFullYear();
            const month = cursor.getMonth();
            const day = cursor.getDate();
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            scheduledDatesSet.add(dateStr);
          }
          cursor.setDate(cursor.getDate() + 1);
        }

        totalLessons = scheduledDatesSet.size;
      } else {
        // Agar scheduleDays bo'lmasa, mavjud davomat yozuvlariga asoslanamiz
        totalLessons = semesterAttendance.length;
      }

      const totalHours = totalLessons * HOURS_PER_LESSON;

      const stats = {};
      (studentsList || []).forEach(student => {
        stats[student.id] = { missedHours: 0, totalHours };
      });

      semesterAttendance.forEach(a => {
        Object.entries(a.records || {}).forEach(([studentId, hours]) => {
          if (stats[studentId]) {
            stats[studentId].missedHours += hours;
          }
        });
      });

      setStudentStats({ stats, totalLessons, totalHours });
    }
  };

  const refreshStats = (currentAttendance = null) => {
    loadStudentStatsWithData(selectedSubjectTeacher, students, currentAttendance);
  };

  const loadAttendance = async () => {
    if (!selectedGroup || !selectedDate || !selectedSubjectTeacher) return;

    const result = await attendanceService.getAttendanceByGroupAndDate(
      selectedGroup.id,
      new Date(selectedDate),
      selectedSubjectTeacher?.subjectId,
      selectedSubjectTeacher?.lessonType
    );

    if (result.success && result.data) {
      setAttendance(result.data.records || {});
    } else {
      setAttendance({});
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

  const handleAttendanceChange = (studentId, value) => {
    const hours = Math.min(Math.max(parseInt(value) || 0, 0), HOURS_PER_LESSON);
    setAttendance(prev => ({
      ...prev,
      [studentId]: hours
    }));
  };

  const handleSave = async () => {
    if (!selectedGroup || !selectedDate || !selectedSubjectTeacher) return;

    setSaving(true);
    const result = await attendanceService.saveAttendance(
      selectedGroup.id,
      new Date(selectedDate),
      attendance,
      currentUser.uid,
      selectedSubjectTeacher?.subjectId,
      selectedSubjectTeacher?.lessonType
    );

    if (result.success) {
      toast.success(t('teacher.attendance.saved'));
      refreshStats(attendance);
    } else {
      toast.error(t('common.error'));
    }
    setSaving(false);
  };

  const getMissedRatio = (studentId) => {
    const stats = studentStats.stats?.[studentId];
    const totalHours = studentStats.totalHours || 0;
    const missedHours = stats?.missedHours || 0;
    return { missedHours, totalHours };
  };

  const getMissedPercent = (studentId) => {
    const { missedHours, totalHours } = getMissedRatio(studentId);
    if (totalHours === 0) return 0;
    return (missedHours / totalHours) * 100;
  };

  // Sana formati DD/MM/YYYY
  const formatDateDisplay = (dateStr) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Student details modal: load missed dates for selected subject/lessonType
  const openStudentModal = async (student) => {
    if (!selectedGroup) {
      toast.error('Guruh tanlanmagan');
      return;
    }

    setModalOpen(true);
    setModalStudent(student);
    setModalLoading(true);
    setModalMissedDates([]);

    try {
      const res = await attendanceService.getAttendanceByStudent(student.id, selectedGroup.id);
      if (!res.success) {
        toast.error(t('common.error'));
        setModalLoading(false);
        return;
      }

      let records = res.data || [];

      // Filter by currently selected subject and lessonType if present
      if (selectedSubjectTeacher?.subjectId) {
        records = records.filter(r => r.subjectId === selectedSubjectTeacher.subjectId);
        if (selectedSubjectTeacher?.lessonType) {
          records = records.filter(r => r.lessonType === selectedSubjectTeacher.lessonType);
        }
      }

      // Keep only dates where student missed > 0 and compute total missed hours
      const missedRecords = records
        .filter(r => r.records && (r.records[student.id] || 0) > 0)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      const missed = missedRecords.map(r => r.date);
      const totalMissed = missedRecords.reduce((s, r) => s + (r.records[student.id] || 0), 0);

      setModalMissedDates(missed);
      setModalTotalMissedHours(totalMissed);
    } catch (err) {
      console.error('Open student modal error:', err);
      toast.error('Xatolik yuz berdi');
    }

    setModalLoading(false);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalStudent(null);
    setModalMissedDates([]);
    setModalLoading(false);
    setModalTotalMissedHours(0);
  };

  const handleMissedDateClick = (date) => {
    setSelectedDate(date);
    closeModal();
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
      <div className="teacher-attendance-page">
        <div className="empty-state-full">
          <FiUsers size={64} />
          <h2>Sizga biriktirilgan guruhlar yo'q</h2>
          <p>Administrator sizni guruhlarga biriktirishi kerak</p>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-attendance-page hemis-style">
      {/* Breadcrumb */}
      <div className="page-breadcrumb">
        <span>Asosiy</span>
        <span className="separator">/</span>
        <span>Guruhlar</span>
        <span className="separator">/</span>
        <span className="current">{t('teacher.attendance.title')}</span>
      </div>

      {/* Info Banner */}
      <div className="info-banner">
        <FiInfo />
        <span>Mavzuning soatiga qarab qatnashmagan talabaga 1 yoki 2 soat kiritilishi mumkin</span>
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
        <span>{t('teacher.attendance.lessonDaysLabel')}: <strong>{scheduleDaysNames}</strong></span>
        <span className="schedule-count">{scheduledDates.length} {t('teacher.attendance.lessons')}</span>
      </div>

      {/* Date Selector - Dars kunlari ro'yxati */}
      {scheduledDates.length > 0 && (
        <div className="date-selector-bar">
          {scheduledDates.map(date => (
            <button
              key={date}
              className={`date-btn ${selectedDate === date ? 'active' : ''}`}
              onClick={() => setSelectedDate(date)}
            >
              {formatDateDisplay(date)}
            </button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="hemis-content">
        {/* Left Section - Table */}
        <div className="hemis-table-section">
          {/* Filters Row */}
          <div className="hemis-filters">
            <div className="filter-group">
              <label>GURUH</label>
              <select
                className="hemis-select"
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
            {/* Agar o'qituvchida bir nechta fan/shart bo'lsa, tanlash uchun selector */}
            {availableSubjectTeachers.length > 1 && (
              <div className="filter-group">
                <select
                  className="hemis-select"
                  value={selectedSubjectTeacher ? `${selectedSubjectTeacher.subjectId}-${selectedSubjectTeacher.lessonType}` : ''}
                  onChange={(e) => {
                    const selected = availableSubjectTeachers.find(
                      st => `${st.subjectId}-${st.lessonType}` === e.target.value
                    );
                    if (selected) {
                      setSelectedSubjectTeacher(selected);
                      setSubjectInfo(selected);
                      loadStudentStatsWithData(selected, students);
                      setAttendance({}); // Davomat malumotlarini tozalash
                    }
                  }}
                >
                  {availableSubjectTeachers.map(st => (
                    <option key={`${st.subjectId}-${st.lessonType}`} value={`${st.subjectId}-${st.lessonType}`}>
                      {st.subjectName} ({st.lessonType === 'lecture' ? 'Ma\'ruza' : st.lessonType === 'practical' ? 'Amaliy' : st.lessonType === 'laboratory' ? 'Laboratoriya' : st.lessonType})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="filter-group date-group">
              <label>{t('teacher.attendance.date')}</label>
              <div className="hemis-date-display">
                {selectedDate ? formatDateDisplay(selectedDate) : '-'}
              </div>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="hemis-table-container">
            {loadingStudents ? (
              <div className="loading-container">
                <LoadingSpinner />
              </div>
            ) : students.length === 0 ? (
              <div className="empty-table">
                <FiUsers size={48} />
                <p>{t('teacher.attendance.noStudents')}</p>
              </div>
            ) : scheduledDates.length === 0 ? (
              <div className="empty-table">
                <FiCalendar size={48} />
                <p>Bu oyda dars kunlari yo'q</p>
              </div>
            ) : (
              <table className="hemis-table">
                <thead>
                  <tr>
                    <th className="col-num">№</th>
                    <th className="col-name">{t('teacher.attendance.studentName')}</th>
                    <th className="col-ratio">{t('teacher.attendance.attendance')}</th>
                    <th className="col-absent">{t('teacher.attendance.absent')}</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => {
                    const rawMissed = attendance[student.id];
                    const missedHours = rawMissed === undefined || rawMissed === null ? '' : rawMissed;
                    const { missedHours: totalMissed, totalHours } = getMissedRatio(student.id);
                    const missedPercent = getMissedPercent(student.id);
                    const isHighAbsence = missedPercent > 25;

                    return (
                      <tr key={student.id}>
                        <td className="col-num">{index + 1}</td>
                        <td className="col-name">
                          <button
                            className="student-name-btn"
                            onClick={() => openStudentModal(student)}
                          >
                            {student.displayName?.toUpperCase() || 'NOMA\'LUM'}
                          </button>
                        </td>
                        <td className="col-ratio">
                          <span className={`ratio-value ${isHighAbsence ? 'danger' : ''}`}>
                            {missedPercent.toFixed(1)}%
                          </span>
                        </td>
                        <td className="col-absent">
                          <input
                            type="number"
                            className="absent-input"
                            value={missedHours}
                            onChange={(e) => handleAttendanceChange(student.id, e.target.value)}
                            min="0"
                            max={HOURS_PER_LESSON}
                            disabled={!isEditing}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Actions */}
          <div className="hemis-actions">
            {!isEditing ? (
              <button
                className="btn-edit"
                onClick={() => setIsEditing(true)}
                disabled={students.length === 0 || !selectedDate}
              >
                <FiEdit2 /> {t('teacher.attendance.edit')}
              </button>
            ) : (
              <>
                <button
                  className="btn-cancel"
                  onClick={() => {
                    setIsEditing(false);
                    loadAttendance(); // Qayta yuklash
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  className="btn-save"
                  onClick={async () => {
                    await handleSave();
                    setIsEditing(false);
                  }}
                  disabled={saving || students.length === 0 || !selectedDate}
                >
                  <FiCheck /> {saving ? t('teacher.attendance.saving') : t('teacher.attendance.save')}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right Section - Info Panel */}
        <div className="hemis-info-panel">
          <h3>{t('teacher.attendance.information')}</h3>

          <div className="info-row">
            <span className="info-label">
              <FiBook /> {t('teacher.attendance.subject')}
            </span>
            <span className="info-value">
              {subjectInfo?.subjectName || userData?.subjectName || 'Belgilanmagan'}
            </span>
          </div>

          <div className="info-row">
            <span className="info-label">
              <FiCalendar /> Tanlangan sana
            </span>
            <span className="info-value highlight">
              {selectedDate ? formatDateDisplay(selectedDate) : 'Tanlanmagan'}
            </span>
          </div>

          <div className="info-row">
            <span className="info-label">
              <FiUsers /> Guruh
            </span>
            <span className="info-value">
              {selectedGroup?.name || 'Tanlanmagan'}
            </span>
          </div>

          <div className="info-row">
            <span className="info-label">
              <FiCalendar /> {t('teacher.attendance.lessonDaysLabel')}
            </span>
            <span className="info-value schedule-days">
              {scheduleDaysNames}
            </span>
          </div>

        </div>
      </div>
      {/* Student missed-dates modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={modalStudent ? modalStudent.displayName : 'Talaba'}
        size="small"
      >
        {modalLoading ? (
          <div className="modal-loading"><LoadingSpinner /></div>
        ) : (
          <div className="missed-dates-container">
            <div className="modal-total-missed">
              Jami qoldirilgan soatlar: <strong>{modalTotalMissedHours}</strong>
            </div>
            {modalMissedDates.length === 0 ? (
              <p>Bu fanda qoldirilgan sanalar yo'q</p>
            ) : (
              <ul className="missed-dates-list">
                {modalMissedDates.map(date => (
                  <li key={date}>
                    <button className="date-link" onClick={() => handleMissedDateClick(date)}>
                      {formatDateDisplay(date)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TeacherAttendance;
