import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { groupService } from '../../services/groupService';
import { 
  FiMapPin,
  FiUser,
  FiBookOpen
} from 'react-icons/fi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import './TimeTable.css';

// Hafta kunlari
const WEEK_DAYS = [
  { id: 1, name: 'Dushanba', short: 'Du' },
  { id: 2, name: 'Seshanba', short: 'Se' },
  { id: 3, name: 'Chorshanba', short: 'Ch' },
  { id: 4, name: 'Payshanba', short: 'Pa' },
  { id: 5, name: 'Juma', short: 'Ju' },
  { id: 6, name: 'Shanba', short: 'Sh' }
];

const TimeTable = () => {
  const { userData } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState([]);
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    if (userData?.groupId) {
      loadSchedule();
    } else {
      setLoading(false);
    }
  }, [userData]);

  const loadSchedule = async () => {
    setLoading(true);
    try {
      const groupResult = await groupService.getGroupById(userData.groupId);
      if (groupResult.success) {
        setGroupName(groupResult.data.name || '');
        const subjectTeachers = groupResult.data.subjectTeachers || [];
        
        // Har bir dars uchun ma'lumotlarni tayyorlash
        const scheduleData = [];
        
        subjectTeachers.forEach(st => {
          if (st.scheduleDays && st.scheduleDays.length > 0) {
            st.scheduleDays.forEach(dayId => {
              scheduleData.push({
                dayId,
                subjectId: st.subjectId,
                subjectName: st.subjectName,
                teacherId: st.teacherId,
                teacherName: st.teacherName,
                lessonType: st.lessonType || 'ma\'ruza',
                location: st.location || ''
              });
            });
          }
        });
        
        setSchedule(scheduleData);
      }
    } catch (error) {
      console.error('Load schedule error:', error);
    }
    setLoading(false);
  };

  // Har bir kunga darslarni guruhlash
  const scheduleByDay = useMemo(() => {
    const grouped = {};
    WEEK_DAYS.forEach(day => {
      grouped[day.id] = [];
    });

    schedule.forEach(lesson => {
      if (grouped[lesson.dayId]) {
        grouped[lesson.dayId].push(lesson);
      }
    });

    return grouped;
  }, [schedule]);

  // Dars turi rangini olish
  const getLessonTypeColor = (type) => {
    switch (type) {
      case 'ma\'ruza':
        return '#3b82f6'; // Blue
      case 'amaliyot':
        return '#10b981'; // Green
      case 'laboratoriya':
        return '#f59e0b'; // Orange
      default:
        return '#6b7280'; // Gray
    }
  };

  // Dars turi nomini olish
  const getLessonTypeName = (type) => {
    switch (type) {
      case 'ma\'ruza':
        return 'Ma\'ruza';
      case 'amaliyot':
        return 'Amaliy';
      case 'laboratoriya':
        return 'Laboratoriya';
      default:
        return type;
    }
  };

  // Bugungi hafta sanalarini olish
  const getCurrentWeekDates = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
    const monday = new Date(today.setDate(diff));
    
    const dates = {};
    WEEK_DAYS.forEach(day => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + day.id - 1);
      dates[day.id] = date;
    });
    
    return dates;
  };

  const weekDates = getCurrentWeekDates();

  // Oy nomlari
  const monthNames = [
    'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
    'iyul', 'avgust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'
  ];

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="timetable-page">
      <div className="page-header">
        <div>
          <h1>{t('student.timetable.title')}</h1>
          <p>{t('student.timetable.title')}</p>
        </div>
      </div>

      {/* Group Banner */}
      {groupName && (
        <div className="timetable-group-banner">
          <FiBookOpen />
          <span>{groupName}</span>
        </div>
      )}

      {/* Schedule Grid */}
      <div className="timetable-grid">
        {WEEK_DAYS.map(day => {
          const date = weekDates[day.id];
          const dayLessons = scheduleByDay[day.id] || [];
          
          return (
            <div key={day.id} className="timetable-day-column">
              <div className="day-header">
                <h3 className="day-name">{day.name}</h3>
                {date && (
                  <div className="day-date">
                    {date.getDate().toString().padStart(2, '0')} {monthNames[date.getMonth()]}, {date.getFullYear()}
                  </div>
                )}
              </div>
              
              <div className="day-lessons">
                {dayLessons.length === 0 ? (
                  <div className="no-lessons">{t('student.timetable.noSchedule')}</div>
                ) : (
                  dayLessons.map((lesson, index) => (
                    <div 
                      key={`${lesson.dayId}-${lesson.subjectId}-${lesson.lessonType}-${index}`}
                      className="lesson-item"
                      style={{ borderLeftColor: getLessonTypeColor(lesson.lessonType) }}
                    >
                      <div className="lesson-number">{index + 1}.</div>
                      <div className="lesson-content">
                        <div className="lesson-subject">{lesson.subjectName}</div>
                        <div className="lesson-info">
                          {lesson.location && (
                            <>
                              <FiMapPin />
                              <span>{lesson.location}</span>
                            </>
                          )}
                          <span className="lesson-type" style={{ color: getLessonTypeColor(lesson.lessonType) }}>
                            {getLessonTypeName(lesson.lessonType)}
                          </span>
                          {lesson.teacherName && (
                            <>
                              <span>O'qituvchi</span>
                              <span>{lesson.teacherName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimeTable;
