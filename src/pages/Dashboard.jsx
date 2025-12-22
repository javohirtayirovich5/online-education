import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { 
  FiVideo, 
  FiFileText, 
  FiCheckSquare, 
  FiUsers, 
  FiTrendingUp,
  FiClock,
  FiAward,
  FiActivity,
  FiEye,
  FiMessageSquare,
  FiPlay,
  FiBookOpen
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatRelativeTime } from '../utils/helpers';
import './Dashboard.css';

const Dashboard = () => {
  const { userData, isAdmin, isTeacher, isStudent } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    lessons: 0,
    students: 0,
    assignments: 0,
    views: 0,
    subjects: 0
  });
  const [recentLessons, setRecentLessons] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, [userData]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        await loadAdminData();
      } else if (isTeacher) {
        await loadTeacherData();
      } else if (isStudent) {
        await loadStudentData();
      }
    } catch (error) {
      console.error('Dashboard data error:', error);
    }
    setLoading(false);
  };

  const loadAdminData = async () => {
    const usersSnap = await getDocs(collection(db, 'users'));
    const students = usersSnap.docs.filter(doc => doc.data().role === 'student');
    const teachers = usersSnap.docs.filter(doc => doc.data().role === 'teacher');
    
    const lessonsSnap = await getDocs(collection(db, 'lessons'));
    
    setStats({
      lessons: lessonsSnap.size,
      students: students.length,
      teachers: teachers.length,
      users: usersSnap.size
    });

    // Recent lessons
    const recentQuery = query(collection(db, 'lessons'), orderBy('createdAt', 'desc'), limit(5));
    const recentSnap = await getDocs(recentQuery);
    setRecentLessons(recentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const loadTeacherData = async () => {
    // Kurslardan ko'rishlar sonini yig'ish va darslar sonini hisoblash
    const coursesQuery = query(
      collection(db, 'courses'),
      where('instructorId', '==', userData.uid)
    );
    const coursesSnap = await getDocs(coursesQuery);
    
    let totalViews = 0;
    let totalLessons = 0;
    let totalComments = 0;
    
    coursesSnap.docs.forEach(doc => {
      const data = doc.data();
      totalViews += data.views || 0;
      
      // Kursdagi barcha darslarni sanash
      if (data.modules && Array.isArray(data.modules)) {
        data.modules.forEach(module => {
          if (module.lessons && Array.isArray(module.lessons)) {
            totalLessons += module.lessons.length;
            // Har bir darsdan izohlar sonini yig'ish
            module.lessons.forEach(lesson => {
              totalComments += lesson.commentsCount || 0;
            });
          }
        });
      }
    });

    setStats({
      lessons: totalLessons,
      views: totalViews,
      comments: totalComments,
      assignments: 0
    });

    // Recent lessons - kurslardan darslarni olish
    const recentLessons = [];
    coursesSnap.docs.forEach(doc => {
      const courseData = doc.data();
      if (courseData.modules && Array.isArray(courseData.modules)) {
        courseData.modules.forEach(module => {
          if (module.lessons && Array.isArray(module.lessons)) {
            module.lessons.forEach(lesson => {
              recentLessons.push({
                ...lesson,
                courseId: doc.id,
                courseTitle: courseData.title
              });
            });
          }
        });
      }
    });
    
    // Sort by createdAt and take first 5
    recentLessons.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    setRecentLessons(recentLessons.slice(0, 5));
  };

  const loadStudentData = async () => {
    // Barcha kurslardan video darsliklar sonini hisoblash
    const coursesSnap = await getDocs(collection(db, 'courses'));
    let totalLessons = 0;
    
    coursesSnap.docs.forEach(doc => {
      const courseData = doc.data();
      if (courseData.modules && Array.isArray(courseData.modules)) {
        courseData.modules.forEach(module => {
          if (module.lessons && Array.isArray(module.lessons)) {
            totalLessons += module.lessons.length;
          }
        });
      }
    });
    
    // Baholarni yuklash (yangi format - 1-5 ball)
    const gradesQuery = query(
      collection(db, 'grades'),
      where('studentId', '==', userData.uid)
    );
    const gradesSnap = await getDocs(gradesQuery);
    
    // O'rtacha baho hisoblash (yangi format)
    let totalGrade = 0;
    let validGrades = 0;
    gradesSnap.docs.forEach(doc => {
      const grade = doc.data();
      if (grade.grade && grade.grade > 0) {
        totalGrade += grade.grade;
        validGrades++;
      }
    });
    const avgGrade = validGrades > 0 ? totalGrade / validGrades : 0;

    // Fanlar soni
    let subjectsCount = 0;
    if (userData?.groupId) {
      try {
        const { groupService } = await import('../services/groupService');
        const groupResult = await groupService.getGroupById(userData.groupId);
        if (groupResult.success && groupResult.data.subjectTeachers) {
          subjectsCount = groupResult.data.subjectTeachers.length;
        }
      } catch (error) {
        console.error('Load subjects count error:', error);
      }
    }

    // Topshiriqlar soni
    const assignmentsQuery = query(collection(db, 'assignments'));
    const assignmentsSnap = await getDocs(assignmentsQuery);
    const assignmentsCount = assignmentsSnap.size;

    setStats({
      lessons: totalLessons,
      avgGrade: Math.round(avgGrade * 100) / 100,
      assignments: assignmentsCount,
      subjects: subjectsCount
    });

    // Recent lessons - kurslardan darslarni olish
    const recentLessons = [];
    coursesSnap.docs.forEach(doc => {
      const courseData = doc.data();
      if (courseData.modules && Array.isArray(courseData.modules)) {
        courseData.modules.forEach(module => {
          if (module.lessons && Array.isArray(module.lessons)) {
            module.lessons.forEach(lesson => {
              recentLessons.push({
                ...lesson,
                courseId: doc.id,
                courseTitle: courseData.title
              });
            });
          }
        });
      }
    });
    
    // Sort by createdAt and take first 5
    recentLessons.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    setRecentLessons(recentLessons.slice(0, 5));
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>
            Xush kelibsiz, {userData?.displayName}! 👋
          </h1>
          <p className="dashboard-subtitle">
            {isAdmin ? 'Administrator paneli' : 
             isTeacher ? 'O\'qituvchi paneli' : 
             'Talaba paneli'}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        {isAdmin && (
          <>
            <div className="stat-card stat-primary">
              <div className="stat-icon">
                <FiUsers />
              </div>
              <div className="stat-content">
                <p className="stat-label">Jami foydalanuvchilar</p>
                <h2 className="stat-value">{stats.users}</h2>
              </div>
            </div>

            <div className="stat-card stat-success">
              <div className="stat-icon">
                <FiVideo />
              </div>
              <div className="stat-content">
                <p className="stat-label">Jami darslar</p>
                <h2 className="stat-value">{stats.lessons}</h2>
              </div>
            </div>

            <div className="stat-card stat-info">
              <div className="stat-icon">
                <FiUsers />
              </div>
              <div className="stat-content">
                <p className="stat-label">Talabalar</p>
                <h2 className="stat-value">{stats.students}</h2>
              </div>
            </div>

            <div className="stat-card stat-warning">
              <div className="stat-icon">
                <FiUsers />
              </div>
              <div className="stat-content">
                <p className="stat-label">O'qituvchilar</p>
                <h2 className="stat-value">{stats.teachers}</h2>
              </div>
            </div>
          </>
        )}

        {isTeacher && (
          <>
            <div className="stat-card stat-primary">
              <div className="stat-icon">
                <FiVideo />
              </div>
              <div className="stat-content">
                <p className="stat-label">Mening darslarim</p>
                <h2 className="stat-value">{stats.lessons}</h2>
              </div>
            </div>

            <div className="stat-card stat-success">
              <div className="stat-icon">
                <FiEye />
              </div>
              <div className="stat-content">
                <p className="stat-label">Jami ko'rishlar</p>
                <h2 className="stat-value">{stats.views}</h2>
              </div>
            </div>

            <div className="stat-card stat-info">
              <div className="stat-icon">
                <FiMessageSquare />
              </div>
              <div className="stat-content">
                <p className="stat-label">Izohlar</p>
                <h2 className="stat-value">{stats.comments}</h2>
              </div>
            </div>

            <div className="stat-card stat-warning">
              <div className="stat-icon">
                <FiFileText />
              </div>
              <div className="stat-content">
                <p className="stat-label">Topshiriqlar</p>
                <h2 className="stat-value">{stats.assignments}</h2>
              </div>
            </div>
          </>
        )}

        {isStudent && (
          <>
            <div className="stat-card stat-primary">
              <div className="stat-icon">
                <FiBookOpen />
              </div>
              <div className="stat-content">
                <p className="stat-label">Fanlar</p>
                <h2 className="stat-value">{stats.subjects || 0}</h2>
              </div>
            </div>

            <div className="stat-card stat-success">
              <div className="stat-icon">
                <FiAward />
              </div>
              <div className="stat-content">
                <p className="stat-label">O'rtacha baho</p>
                <h2 className="stat-value">{stats.avgGrade > 0 ? stats.avgGrade.toFixed(2) : '-'}</h2>
              </div>
            </div>

            <div className="stat-card stat-info">
              <div className="stat-icon">
                <FiVideo />
              </div>
              <div className="stat-content">
                <p className="stat-label">Mavjud darslar</p>
                <h2 className="stat-value">{stats.lessons}</h2>
              </div>
            </div>

            <div className="stat-card stat-warning">
              <div className="stat-icon">
                <FiFileText />
              </div>
              <div className="stat-content">
                <p className="stat-label">Topshiriqlar</p>
                <h2 className="stat-value">{stats.assignments}</h2>
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  );
};

export default Dashboard;
