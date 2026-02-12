import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { useTranslation } from '../../hooks/useTranslation';
import { 
  FiBookOpen, 
  FiUser, 
  FiBarChart2,
  FiStar,
  FiArrowLeft
} from 'react-icons/fi';
import { groupService } from '../../services/groupService';
import { subjectService } from '../../services/subjectService';
import { gradeService } from '../../services/gradeService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import './StudentSubjects.css';

const StudentSubjects = () => {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const { t } = useTranslation();
  const [subjects, setSubjects] = useState([]);
  const [subjectStats, setSubjectStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [overallAverage, setOverallAverage] = useState(0);
  const [groupName, setGroupName] = useState('');
  const [departmentName, setDepartmentName] = useState('');

  useEffect(() => {
    const loadSubjects = async () => {
      if (!userData?.groupId) {
        setLoading(false);
        return;
      }

      try {
        // Guruh ma'lumotlarini olish
        const groupResult = await groupService.getGroupById(userData.groupId);
        
        if (groupResult.success) {
          // Guruh nomi va yo'nalishni state'ga saqlash
          +setGroupName(groupResult.data.name || '');
          setDepartmentName(groupResult.data.departmentName || '');
          
          if (groupResult.data.subjectTeachers) {
            const subjectTeachers = groupResult.data.subjectTeachers;
          
            // subjectTeachers arrayidagi fanlarni subjectService dan to'liq ma'lumot bilan olish
            const subjectPromises = subjectTeachers.map(async (st) => {
              const subjectResult = await subjectService.getSubjectById(st.subjectId);
              if (subjectResult.success) {
                return {
                  ...subjectResult.data,
                  teacherId: st.teacherId,
                  teacherName: st.teacherName
                };
              }
              // Agar subject topilmasa, subjectTeachers dan olingan ma'lumotlarni ishlatish
              return {
                id: st.subjectId,
                name: st.subjectName,
                teacherId: st.teacherId,
                teacherName: st.teacherName
              };
            });
            
            const subjectsData = await Promise.all(subjectPromises);
            const filteredSubjects = subjectsData.filter(s => s); // null qiymatlarni filtrlash
            
            // Duplicate fanlarni olib tashlash (bir xil subjectId ga ega bo'lganlar)
            const uniqueSubjects = [];
            const seenIds = new Set();
            for (const subject of filteredSubjects) {
              if (!seenIds.has(subject.id)) {
                seenIds.add(subject.id);
                uniqueSubjects.push(subject);
              }
            }
            
            setSubjects(uniqueSubjects);
            
            // Har bir fan uchun baholar statistikasini olish
            const stats = {};
            for (const subject of subjectsData) {
              if (subject) {
                const gradesResult = await gradeService.getGradesByStudentAndSubject(
                  currentUser.uid, 
                  subject.id
                );
                
                if (gradesResult.success) {
                  stats[subject.id] = {
                    average: gradesResult.data.average,
                    gradesCount: gradesResult.data.grades.length
                  };
                }
              }
            }
            setSubjectStats(stats);
          }

          // Umumiy o'rtacha bahoni olish
          const avgResult = await gradeService.getStudentOverallAverage(currentUser.uid);
          if (avgResult.success) {
            setOverallAverage(avgResult.data);
          }
        }
      } catch (error) {
        console.error('Load subjects error:', error);
        toast.error('Ma\'lumotlarni yuklashda xatolik');
      }
      
      setLoading(false);
    };

    loadSubjects();
  }, [currentUser, userData]);

  const getGradeColor = (grade) => {
    if (grade >= 4.5) return 'excellent';
    if (grade >= 3.5) return 'good';
    if (grade >= 2.5) return 'satisfactory';
    return 'poor';
  };

  const getGradeLabel = (grade) => {
    if (grade >= 4.5) return 'A\'lo';
    if (grade >= 3.5) return 'Yaxshi';
    if (grade >= 2.5) return 'Qoniqarli';
    if (grade > 0) return 'Qoniqarsiz';
    return 'Baholanmagan';
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!userData?.groupId) {
    return (
      <div className="student-subjects-page">
        <div className="empty-state-full">
          <FiBookOpen size={64} />
          <h2>Siz hali guruhga qo'shilmagansiz</h2>
          <p>Administrator sizni guruhga qo'shishi kerak</p>
        </div>
      </div>
    );
  }

  return (
    <div className="student-subjects-page">
      <button 
        className="back-btn"
        onClick={() => navigate('/dashboard')}
      >
        <FiArrowLeft /> {t('common.back')}
      </button>
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-left">
            <h1>{t('student.subjects.title')}</h1>
            <p>
              {groupName || 'Guruh'} · {departmentName || 'Yo\'nalish'}
            </p>
          </div>
          <div className="header-stats">
            <div className="overall-grade">
              <span className="grade-label">{t('grades.overallAverage')}</span>
              <span className={`grade-value ${getGradeColor(overallAverage)}`}>
                {overallAverage > 0 ? overallAverage.toFixed(2) : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Subjects Grid */}
      {subjects.length > 0 ? (
        <div className="subjects-grid">
          {subjects.map(subject => {
            const stats = subjectStats[subject.id] || { average: 0, gradesCount: 0 };
            
            return (
              <div key={subject.id} className="subject-card">
                <div className="subject-header">
                  <div className={`subject-icon ${getGradeColor(stats.average)}`}>
                    <FiBookOpen />
                  </div>
                  <div className="subject-meta">
                    {subject.code && (
                      <span className="subject-code">{subject.code}</span>
                    )}
                  </div>
                </div>

                <h3 className="subject-name">{subject.name}</h3>

                <div className="subject-teacher">
                  <FiUser />
                  <span>{subject.teacherName || 'O\'qituvchi tayinlanmagan'}</span>
                </div>

                <div className="subject-stats">
                  <div className="stat-item">
                    <FiStar className="stat-icon" />
                    <div className="stat-content">
                      <span className="stat-value">
                        {stats.average > 0 ? stats.average.toFixed(1) : '-'}
                      </span>
                      <span className="stat-label">{t('grades.average')}</span>
                    </div>
                  </div>
                  <div className="stat-item">
                    <FiBarChart2 className="stat-icon" />
                    <div className="stat-content">
                      <span className="stat-value">{stats.gradesCount}</span>
                      <span className="stat-label">{t('grades.title')}</span>
                    </div>
                  </div>
                </div>

                <div className="grade-indicator">
                  <div className="grade-bar">
                    <div 
                      className={`grade-fill ${getGradeColor(stats.average)}`}
                      style={{ width: `${(stats.average / 5) * 100}%` }}
                    />
                  </div>
                  <span className={`grade-text ${getGradeColor(stats.average)}`}>
                    {getGradeLabel(stats.average)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <FiBookOpen size={64} />
          <h2>Fanlar topilmadi</h2>
          <p>Sizning guruhingiz uchun hali fanlar biriktirilmagan</p>
        </div>
      )}
    </div>
  );
};

export default StudentSubjects;

