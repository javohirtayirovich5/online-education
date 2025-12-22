import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FiCalendar, FiArrowLeft } from 'react-icons/fi';
import { attendanceService } from '../services/attendanceService';
import { groupService } from '../services/groupService';
import { subjectService } from '../services/subjectService';
import { getDoc, doc, collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import LoadingSpinner from '../components/common/LoadingSpinner';
import './Attendance.css';

const Attendance = () => {
  const navigate = useNavigate();
  const { userData, currentUser, isTeacher } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [subjectsMap, setSubjectsMap] = useState({}); // { [subjectId]: { name, ... } }
  const [teachersMap, setTeachersMap] = useState({}); // { [teacherId]: { displayName, ... } }
  const [selectedSubject, setSelectedSubject] = useState('all');

  useEffect(() => {
    if (isTeacher) {
      // O'qituvchi uchun eski sahifaga yo'naltirish
      navigate('/teacher/groups/attendance');
      return;
    }

    if (!userData?.groupId) {
      setLoading(false);
      return;
    }

    loadAttendanceData();
  }, [userData, isTeacher]);

  const loadAttendanceData = async () => {
    setLoading(true);
    try {
      // Guruh ma'lumotlarini olish
      const groupResult = await groupService.getGroupById(userData.groupId);
      if (!groupResult.success) {
        setLoading(false);
        return;
      }

      const group = groupResult.data;
      const subjectTeachers = group.subjectTeachers || [];

      // Fanlar ma'lumotlarini olish
      const subjects = {};
      for (const st of subjectTeachers) {
        if (!subjects[st.subjectId]) {
          const subjectResult = await subjectService.getSubjectById(st.subjectId);
          if (subjectResult.success) {
            subjects[st.subjectId] = subjectResult.data;
          } else {
            subjects[st.subjectId] = {
              id: st.subjectId,
              name: st.subjectName || 'Noma\'lum fan'
            };
          }
        }
      }
      setSubjectsMap(subjects);

      // O'qituvchilar ma'lumotlarini olish
      const teachers = {};
      const uniqueTeacherIds = [...new Set(subjectTeachers.map(st => st.teacherId))];
      for (const teacherId of uniqueTeacherIds) {
        try {
          const teacherDoc = await getDoc(doc(db, 'users', teacherId));
          if (teacherDoc.exists()) {
            teachers[teacherId] = teacherDoc.data();
          }
        } catch (error) {
          console.error('Get teacher error:', error);
        }
      }
      setTeachersMap(teachers);

      // O'quvchining davomat ma'lumotlarini olish
      const attendanceResult = await attendanceService.getAttendanceByStudent(
        currentUser.uid,
        userData.groupId
      );

      if (attendanceResult.success) {
        // Har bir davomat yozuvini to'liq ma'lumot bilan to'ldirish
        const records = attendanceResult.data.map(attendance => {
          // subjectId bo'yicha fan ma'lumotini topish
          let subjectInfo = null;
          let lessonType = null;
          let teacherInfo = null;

          if (attendance.subjectId) {
            subjectInfo = subjects[attendance.subjectId];
            // subjectTeachers dan lessonType va teacherId ni topish
            const st = subjectTeachers.find(
              st => st.subjectId === attendance.subjectId
            );
            if (st) {
              lessonType = st.lessonType;
              teacherInfo = teachers[st.teacherId];
            }
          } else {
            // Agar subjectId bo'lmasa, barcha fanlarni ko'rsatish
            // Lekin biz faqat birinchi topilgan fanni ko'rsatamiz
            const st = subjectTeachers[0];
            if (st) {
              subjectInfo = subjects[st.subjectId];
              lessonType = st.lessonType;
              teacherInfo = teachers[st.teacherId];
            }
          }

          return {
            ...attendance,
            subjectInfo,
            lessonType,
            teacherInfo,
            missedHours: attendance.records?.[currentUser.uid] || 0
          };
        });

        // Sanaga qarab teskari tartibda saralash (eng yangisi birinchi)
        records.sort((a, b) => new Date(b.date) - new Date(a.date));

        setAttendanceRecords(records);
      }
    } catch (error) {
      console.error('Load attendance data error:', error);
    }
    setLoading(false);
  };

  // Mashg'ulot turini o'zbek tilida ko'rsatish
  const getLessonTypeName = (lessonType) => {
    const types = {
      'lecture': 'Ma\'ruza',
      'practical': 'Amaliy',
      'laboratory': 'Laboratoriya'
    };
    return types[lessonType] || lessonType || '-';
  };

  // Filtrlangan davomat yozuvlari
  const filteredRecords = useMemo(() => {
    if (selectedSubject === 'all') {
      return attendanceRecords;
    }
    return attendanceRecords.filter(record => 
      record.subjectInfo?.id === selectedSubject
    );
  }, [attendanceRecords, selectedSubject]);

  // Fanlar ro'yxati (filter uchun)
  const subjectsList = useMemo(() => {
    return Object.values(subjectsMap);
  }, [subjectsMap]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!userData?.groupId) {
    return (
      <div className="attendance-page">
        <div className="page-header">
          <div>
            <h1>Davomat</h1>
            <p>Sizning davomatingiz</p>
          </div>
        </div>
        <div className="empty-state-large">
          <FiCalendar size={64} />
          <h2>Siz hali guruhga qo'shilmagansiz</h2>
          <p>Administrator sizni guruhga qo'shishi kerak</p>
        </div>
      </div>
    );
  }

  return (
    <div className="attendance-page">
      <div className="page-header">
        <div>
          <button 
            className="back-btn"
            onClick={() => navigate('/dashboard')}
          >
            <FiArrowLeft /> Orqaga
          </button>
          <h1>Davomat</h1>
          <p>Sizning davomatingiz</p>
        </div>
      </div>

      {/* Filter */}
      <div className="attendance-filters">
        <div className="filter-group">
          <label>Fanlarni tanlang:</label>
          <select
            className="filter-select"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            <option value="all">Barcha fanlar</option>
            {subjectsList.map(subject => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="attendance-table-container">
        <table className="attendance-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Dars sanasi</th>
              <th>Fanlar</th>
              <th>Mashg'ulot</th>
              <th>Soatlar</th>
              <th>Xodim</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-table-cell">
                  <div className="empty-state-table">
                    <FiCalendar size={48} />
                    <p>Davomat ma'lumotlari topilmadi</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRecords.map((record, index) => {
                const date = new Date(record.date);
                // DD/MM/YYYY format
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                const formattedDate = `${day}/${month}/${year}`;
                const timeStr = date.toLocaleTimeString('uz-UZ', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                });

                return (
                  <tr key={record.id}>
                    <td>{index + 1}</td>
                    <td>{formattedDate} {timeStr}</td>
                    <td>{record.subjectInfo?.name || 'Noma\'lum fan'}</td>
                    <td>{getLessonTypeName(record.lessonType)}</td>
                    <td>2</td>
                    <td>
                      {record.teacherInfo?.displayName || 
                       record.teacherInfo?.name || 
                       'Noma\'lum o\'qituvchi'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Attendance;
