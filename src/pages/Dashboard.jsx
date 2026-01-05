import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
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
  FiBookOpen,
  FiPlus,
  FiCalendar,
  FiAlertCircle,
  FiArrowRight
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatRelativeTime, getTimeRemaining, isPastDate, formatDate } from '../utils/helpers';
import { assignmentService } from '../services/assignmentService';
import { testService } from '../services/testService';
import { attendanceService } from '../services/attendanceService';
import './Dashboard.css';

const Dashboard = () => {
  const { userData, isAdmin, isTeacher, isStudent } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    lessons: 0,
    students: 0,
    assignments: 0,
    views: 0,
    subjects: 0
  });
  const [recentLessons, setRecentLessons] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [attendancePercentage, setAttendancePercentage] = useState(0);
  const [recentTests, setRecentTests] = useState([]);

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

    // Recent lessons - faqat video darslarni olish (videoURL yoki youtubeUrl bo'lgan)
    const recentLessons = [];
    coursesSnap.docs.forEach(doc => {
      const courseData = doc.data();
      if (courseData.modules && Array.isArray(courseData.modules)) {
        courseData.modules.forEach(module => {
          if (module.lessons && Array.isArray(module.lessons)) {
            module.lessons.forEach(lesson => {
              // Faqat video darslarni qo'shish (videoURL yoki youtubeUrl bo'lgan)
              if (lesson.videoURL || lesson.youtubeUrl || lesson.videoType) {
                recentLessons.push({
                  ...lesson,
                  courseId: doc.id,
                  courseTitle: courseData.title
                });
              }
            });
          }
        });
      }
    });
    
    // Sort by createdAt and take first 3
    recentLessons.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    setRecentLessons(recentLessons.slice(0, 3));

    // Upcoming deadlines - topshiriqlar
    try {
      const assignmentsResult = await assignmentService.getAllAssignments();
      if (assignmentsResult.success) {
        const now = new Date();
        const deadlines = assignmentsResult.data
          .filter(assignment => {
            if (!assignment.dueDate) return false;
            const dueDate = assignment.dueDate.toDate ? assignment.dueDate.toDate() : new Date(assignment.dueDate);
            return dueDate >= now;
          })
          .map(assignment => ({
            id: assignment.id,
            title: assignment.title,
            type: 'assignment',
            dueDate: assignment.dueDate.toDate ? assignment.dueDate.toDate() : new Date(assignment.dueDate),
            url: `/assignments`
          }))
          .sort((a, b) => a.dueDate - b.dueDate)
          .slice(0, 5);
        setUpcomingDeadlines(deadlines);
      }
    } catch (error) {
      console.error('Load deadlines error:', error);
    }
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

    // Recent lessons - faqat video darslarni olish (videoURL yoki youtubeUrl bo'lgan)
    const recentLessons = [];
    coursesSnap.docs.forEach(doc => {
      const courseData = doc.data();
      if (courseData.modules && Array.isArray(courseData.modules)) {
        courseData.modules.forEach(module => {
          if (module.lessons && Array.isArray(module.lessons)) {
            module.lessons.forEach(lesson => {
              // Faqat video darslarni qo'shish (videoURL yoki youtubeUrl bo'lgan)
              if (lesson.videoURL || lesson.youtubeUrl || lesson.videoType) {
                recentLessons.push({
                  ...lesson,
                  courseId: doc.id,
                  courseTitle: courseData.title
                });
              }
            });
          }
        });
      }
    });
    
    // Sort by createdAt and take first 3
    recentLessons.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    setRecentLessons(recentLessons.slice(0, 3));

    // Upcoming deadlines - topshiriqlar va testlar
    const deadlines = [];
    
    // Topshiriqlar
    try {
      const assignmentsResult = await assignmentService.getAllAssignments();
      if (assignmentsResult.success) {
        const now = new Date();
        assignmentsResult.data.forEach(assignment => {
          if (assignment.dueDate) {
            const dueDate = assignment.dueDate.toDate ? assignment.dueDate.toDate() : new Date(assignment.dueDate);
            if (dueDate >= now) {
              deadlines.push({
                id: assignment.id,
                title: assignment.title,
                type: 'assignment',
                dueDate: dueDate,
                url: `/assignments`
              });
            }
          }
        });
      }
    } catch (error) {
      console.error('Load assignments error:', error);
    }

    // Testlar
    if (userData?.groupId) {
      try {
        const testsResult = await testService.getTestsForStudent(userData.groupId);
        if (testsResult.success) {
          const now = new Date();
          testsResult.data.forEach(test => {
            if (test.dueDate) {
              const dueDate = test.dueDate.toDate ? test.dueDate.toDate() : new Date(test.dueDate);
              if (dueDate >= now) {
                deadlines.push({
                  id: test.id,
                  title: test.title,
                  type: 'test',
                  dueDate: dueDate,
                  url: `/tests/${test.id}`
                });
              }
            }
          });
        }
      } catch (error) {
        console.error('Load tests error:', error);
      }
    }

    // Sort by due date and take first 5
    deadlines.sort((a, b) => a.dueDate - b.dueDate);
    setUpcomingDeadlines(deadlines.slice(0, 5));

    // Davomat foizi
    if (userData?.groupId) {
      try {
        const attendanceResult = await attendanceService.getAttendanceByStudent(userData.uid, userData.groupId);
        if (attendanceResult.success && attendanceResult.data && attendanceResult.data.length > 0) {
          const records = attendanceResult.data;
          let presentCount = 0;
          records.forEach(record => {
            if (record.records && record.records[userData.uid] && record.records[userData.uid].status === 'present') {
              presentCount++;
            }
          });
          const percentage = Math.round((presentCount / records.length) * 100);
          setAttendancePercentage(percentage);
        }
      } catch (error) {
        console.error('Load attendance error:', error);
      }
    }

    // Recent tests
    if (userData?.groupId) {
      try {
        const testsResult = await testService.getTestsForStudent(userData.groupId);
        if (testsResult.success) {
          const allTests = testsResult.data || [];
          const completedTests = [];
          
          // Check submissions for each test
          const submissionPromises = allTests.map(test =>
            testService.getStudentTestSubmission(userData.uid, test.id)
              .catch(() => ({ success: false }))
          );
          
          const submissions = await Promise.all(submissionPromises);
          
          allTests.forEach((test, index) => {
            const submissionResult = submissions[index];
            if (submissionResult && submissionResult.success && submissionResult.data) {
              const submission = submissionResult.data;
              // Score structure: score (number), maxScore (number), percentage (string or number)
              const earned = typeof submission.score === 'number' ? submission.score : 0;
              const max = typeof submission.maxScore === 'number' ? submission.maxScore : 0;
              const percentage = submission.percentage 
                ? (typeof submission.percentage === 'string' 
                    ? parseFloat(submission.percentage) 
                    : submission.percentage)
                : (max > 0 ? Math.round((earned / max) * 100) : 0);
              
              completedTests.push({
                id: test.id,
                title: test.title,
                score: {
                  earned: earned,
                  max: max,
                  percentage: percentage
                }
              });
            }
          });
          
          // Sort by submission date (most recent first) and take first 3
          completedTests.sort((a, b) => {
            const dateA = submissions[allTests.findIndex(t => t.id === a.id)]?.data?.submittedAt || '';
            const dateB = submissions[allTests.findIndex(t => t.id === b.id)]?.data?.submittedAt || '';
            return new Date(dateB) - new Date(dateA);
          });
          
          setRecentTests(completedTests.slice(0, 3));
        }
      } catch (error) {
        console.error('Load recent tests error:', error);
      }
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>
            {t('dashboard.welcome')}, {userData?.displayName}! 👋
          </h1>
          <p className="dashboard-subtitle">
            {isAdmin ? t('dashboard.adminPanel') : 
             isTeacher ? t('dashboard.teacherPanel') : 
             t('dashboard.studentPanel')}
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
                <p className="stat-label">{t('dashboard.totalUsers')}</p>
                <h2 className="stat-value">{stats.users}</h2>
              </div>
            </div>

            <div className="stat-card stat-success">
              <div className="stat-icon">
                <FiVideo />
              </div>
              <div className="stat-content">
                <p className="stat-label">{t('dashboard.totalLessons')}</p>
                <h2 className="stat-value">{stats.lessons}</h2>
              </div>
            </div>

            <div className="stat-card stat-info">
              <div className="stat-icon">
                <FiUsers />
              </div>
              <div className="stat-content">
                <p className="stat-label">{t('dashboard.students')}</p>
                <h2 className="stat-value">{stats.students}</h2>
              </div>
            </div>

            <div className="stat-card stat-warning">
              <div className="stat-icon">
                <FiUsers />
              </div>
              <div className="stat-content">
                <p className="stat-label">{t('dashboard.teachers')}</p>
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
                <p className="stat-label">{t('dashboard.myLessons')}</p>
                <h2 className="stat-value">{stats.lessons}</h2>
              </div>
            </div>

            <div className="stat-card stat-success">
              <div className="stat-icon">
                <FiEye />
              </div>
              <div className="stat-content">
                <p className="stat-label">{t('dashboard.totalViews')}</p>
                <h2 className="stat-value">{stats.views}</h2>
              </div>
            </div>

            <div className="stat-card stat-info">
              <div className="stat-icon">
                <FiMessageSquare />
              </div>
              <div className="stat-content">
                <p className="stat-label">{t('dashboard.comments')}</p>
                <h2 className="stat-value">{stats.comments}</h2>
              </div>
            </div>

            <div className="stat-card stat-warning">
              <div className="stat-icon">
                <FiFileText />
              </div>
              <div className="stat-content">
                <p className="stat-label">{t('dashboard.assignments')}</p>
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
                <p className="stat-label">{t('dashboard.subjects')}</p>
                <h2 className="stat-value">{stats.subjects || 0}</h2>
              </div>
            </div>

            <div className="stat-card stat-success">
              <div className="stat-icon">
                <FiAward />
              </div>
              <div className="stat-content">
                <p className="stat-label">{t('dashboard.averageGrade')}</p>
                <h2 className="stat-value">{stats.avgGrade > 0 ? stats.avgGrade.toFixed(2) : '-'}</h2>
              </div>
            </div>

            <div className="stat-card stat-info">
              <div className="stat-icon">
                <FiVideo />
              </div>
              <div className="stat-content">
                <p className="stat-label">{t('dashboard.availableLessons')}</p>
                <h2 className="stat-value">{stats.lessons}</h2>
              </div>
            </div>

            <div className="stat-card stat-warning">
              <div className="stat-icon">
                <FiFileText />
              </div>
              <div className="stat-content">
                <p className="stat-label">{t('dashboard.assignments')}</p>
                <h2 className="stat-value">{stats.assignments}</h2>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Dashboard Grid - Additional Sections */}
      <div className="dashboard-grid">
        {/* Recent Lessons */}
        {recentLessons.length > 0 && (
          <div className="dashboard-card">
            <div className="card-header">
              <h3>{t('dashboard.recentLessons')}</h3>
              <Link to="/lessons" className="view-all-link">
                {t('common.viewAll')} →
              </Link>
            </div>
            <div className="recent-activities">
              {recentLessons.map((lesson, index) => (
                <Link 
                  key={lesson.id || index} 
                  to={lesson.courseId ? `/course/${lesson.courseId}` : '#'}
                  className="activity-item"
                >
                  <div className="activity-icon">
                    <FiPlay />
                  </div>
                  <div className="activity-info">
                    <h4>{lesson.title || lesson.courseTitle || 'Dars'}</h4>
                    <p className="activity-meta">
                      {lesson.courseTitle && <span className="activity-course">{lesson.courseTitle}</span>}
                      {lesson.createdAt && (
                        <span className="activity-time">
                          <FiClock size={12} /> {formatRelativeTime(lesson.createdAt)}
                        </span>
                      )}
                    </p>
                  </div>
                  <FiArrowRight className="activity-arrow" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Deadlines */}
        {upcomingDeadlines.length > 0 && (
          <div className="dashboard-card">
            <div className="card-header">
              <h3>{t('dashboard.upcomingDeadlines')}</h3>
              <Link to={isStudent ? "/assignments" : "/teacher/tests"} className="view-all-link">
                {t('common.viewAll')} →
              </Link>
            </div>
            <div className="deadlines-list">
              {upcomingDeadlines.map((deadline) => {
                const timeRemaining = getTimeRemaining(deadline.dueDate);
                const isUrgent = timeRemaining && timeRemaining.expired === false && timeRemaining.days <= 3;
                return (
                  <Link 
                    key={deadline.id} 
                    to={deadline.url}
                    className={`deadline-item ${isUrgent ? 'urgent' : ''}`}
                  >
                    <div className="deadline-icon">
                      {deadline.type === 'assignment' ? <FiFileText /> : <FiCheckSquare />}
                    </div>
                    <div className="deadline-info">
                      <h4>{deadline.title}</h4>
                      <p className="deadline-meta">
                        <span className="deadline-type">
                          {deadline.type === 'assignment' ? t('assignments.title') : t('tests.title')}
                        </span>
                        <span className="deadline-date">
                          <FiCalendar size={12} /> {formatDate(deadline.dueDate)}
                        </span>
                      </p>
                    </div>
                    {timeRemaining && (
                      <span className={`deadline-badge ${isUrgent ? 'urgent' : ''}`}>
                        {timeRemaining.expired ? t('assignments.overdue') : timeRemaining.text}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>{t('dashboard.quickActions')}</h3>
          </div>
          <div className="quick-actions">
            {isTeacher && (
              <>
                <Link to="/my-lessons" className="action-btn">
                  <FiVideo /> {t('dashboard.addLesson')}
                </Link>
                <Link to="/teacher/tests" className="action-btn">
                  <FiCheckSquare /> {t('dashboard.createTest')}
                </Link>
                <Link to="/assignments" className="action-btn">
                  <FiFileText /> {t('dashboard.createAssignment')}
                </Link>
                <Link to="/teacher/resources" className="action-btn">
                  <FiFileText /> {t('dashboard.addResource')}
                </Link>
              </>
            )}
            {isStudent && (
              <>
                <Link to="/tests" className="action-btn">
                  <FiCheckSquare /> {t('dashboard.viewTests')}
                </Link>
                <Link to="/assignments" className="action-btn">
                  <FiFileText /> {t('dashboard.viewAssignments')}
                </Link>
                <Link to="/explore-courses" className="action-btn">
                  <FiVideo /> {t('dashboard.viewLessons')}
                </Link>
                <Link to="/resources" className="action-btn">
                  <FiBookOpen /> {t('dashboard.viewResources')}
                </Link>
              </>
            )}
            {isAdmin && (
              <>
                <Link to="/structure" className="action-btn">
                  <FiUsers /> {t('dashboard.manageStructure')}
                </Link>
                <Link to="/users" className="action-btn">
                  <FiUsers /> {t('dashboard.manageUsers')}
                </Link>
                <Link to="/admin/analytics" className="action-btn">
                  <FiTrendingUp /> {t('dashboard.viewAnalytics')}
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Progress Overview (Student only) */}
        {isStudent && (attendancePercentage > 0 || stats.avgGrade > 0) && (
          <div className="dashboard-card">
            <div className="card-header">
              <h3>{t('dashboard.progress')}</h3>
            </div>
            <div className="progress-overview">
              {attendancePercentage > 0 && (
                <div className="progress-item">
                  <div className="progress-header">
                    <span className="progress-label">
                      <FiCalendar size={16} /> {t('dashboard.attendance')}
                    </span>
                    <span className="progress-value">{attendancePercentage}%</span>
                  </div>
                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar-fill" 
                      style={{ 
                        width: `${attendancePercentage}%`,
                        backgroundColor: attendancePercentage >= 80 ? 'var(--success)' : 
                                        attendancePercentage >= 60 ? 'var(--warning)' : 'var(--danger)'
                      }}
                    />
                  </div>
                </div>
              )}
              {stats.avgGrade > 0 && (
                <div className="progress-item">
                  <div className="progress-header">
                    <span className="progress-label">
                      <FiAward size={16} /> {t('dashboard.averageGrade')}
                    </span>
                    <span className="progress-value">{stats.avgGrade.toFixed(2)}</span>
                  </div>
                  <div className="grade-indicator">
                    <div 
                      className="grade-bar"
                      style={{ 
                        width: `${(stats.avgGrade / 5) * 100}%`,
                        backgroundColor: stats.avgGrade >= 4 ? 'var(--success)' : 
                                        stats.avgGrade >= 3 ? 'var(--warning)' : 'var(--danger)'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent Test Results (Student only) */}
        {isStudent && recentTests.length > 0 && (
          <div className="dashboard-card">
            <div className="card-header">
              <h3>{t('dashboard.recentTests')}</h3>
              <Link to="/tests?tab=results" className="view-all-link">
                {t('common.viewAll')} →
              </Link>
            </div>
            <div className="recent-tests">
              {recentTests.map((test) => (
                <Link 
                  key={test.id} 
                  to="/tests?tab=results"
                  className="test-result-item"
                >
                  <div className="test-result-icon">
                    <FiCheckSquare />
                  </div>
                  <div className="test-result-info">
                    <h4>{test.title}</h4>
                    {test.score && (
                      <p className="test-result-score">
                        {t('dashboard.score')}: {test.score.earned} / {test.score.max} 
                        ({test.score.percentage}%)
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default Dashboard;
