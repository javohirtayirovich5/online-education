import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { groupService } from '../../services/groupService';
import { resourceService } from '../../services/resourceService';
import { 
  FiFile,
  FiDownload,
  FiBookOpen,
  FiChevronDown,
  FiChevronRight,
  FiArrowLeft
} from 'react-icons/fi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import './StudentResources.css';

const StudentResources = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [resources, setResources] = useState({}); // { [subjectId]: [resources] }
  const [expandedSubjects, setExpandedSubjects] = useState({});

  useEffect(() => {
    if (userData?.groupId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [userData]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Guruh ma'lumotlarini olish
      const groupResult = await groupService.getGroupById(userData.groupId);
      if (groupResult.success && groupResult.data.subjectTeachers) {
        const subjectTeachers = groupResult.data.subjectTeachers;
        
        // Unique fanlarni olish
        const uniqueSubjects = [];
        const seenSubjects = new Set();
        
        subjectTeachers.forEach(st => {
          if (!seenSubjects.has(st.subjectId)) {
            seenSubjects.add(st.subjectId);
            uniqueSubjects.push({
              id: st.subjectId,
              name: st.subjectName
            });
          }
        });
        
        setSubjects(uniqueSubjects);

        // Har bir fan uchun resurslarni yuklash
        const resourcesData = {};
        for (const subject of uniqueSubjects) {
          const result = await resourceService.getResourcesByGroupAndSubject(
            userData.groupId,
            subject.id
          );
          if (result.success) {
            resourcesData[subject.id] = result.data;
          } else {
            resourcesData[subject.id] = [];
          }
        }
        setResources(resourcesData);
      }
    } catch (error) {
      console.error('Load data error:', error);
    }
    setLoading(false);
  };

  const toggleSubject = (subjectId) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [subjectId]: !prev[subjectId]
    }));
  };

  const handleDownload = (resource) => {
    if (resource.fileUrl) {
      window.open(resource.fileUrl, '_blank');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="student-resources-page">
      <button 
        className="back-btn"
        onClick={() => navigate('/dashboard')}
      >
        <FiArrowLeft /> {t('common.back')}
      </button>
      <div className="page-header">
        <div>
          <h1>{t('student.resources.title')}</h1>
          <p>{t('student.resources.description')}</p>
        </div>
      </div>

      {/* Subjects List */}
      {subjects.length === 0 ? (
        <div className="empty-state">
          <FiBookOpen size={48} />
          <p>{t('student.subjects.noSubjects')}</p>
        </div>
      ) : (
        <div className="subjects-resources-list">
          {subjects.map(subject => {
            const subjectResources = resources[subject.id] || [];
            const isExpanded = expandedSubjects[subject.id];
            const resourcesCount = subjectResources.length;

            return (
              <div key={subject.id} className="subject-resource-block">
                <div 
                  className="subject-block-header"
                  onClick={() => toggleSubject(subject.id)}
                >
                  <div className="subject-header-left">
                    {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
                    <h3 className="subject-name">{subject.name}</h3>
                  </div>
                  <div className="subject-header-right">
                    <span className="resources-count">{t('student.resources.resourcesCount')}: {resourcesCount}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="subject-resources-table">
                    {resourcesCount === 0 ? (
                      <div className="empty-resources">
                        <FiFile size={32} />
                        <p>{t('student.resources.noResources')}</p>
                      </div>
                    ) : (
                      <table className="resources-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>{t('student.resources.title')}</th>
                            <th>{t('student.resources.lessonType')}</th>
                            <th>{t('student.resources.staff')}</th>
                            <th>{t('student.resources.files')}</th>
                            <th>{t('student.resources.created')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subjectResources.map((resource, index) => (
                            <tr key={resource.id}>
                              <td>{index + 1}</td>
                              <td>
                                <a
                                  href={resource.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="resource-title-link"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleDownload(resource);
                                  }}
                                >
                                  {resource.title}
                                </a>
                              </td>
                              <td>
                                <span className="lesson-type-badge">
                                  {resource.lessonType === 'ma\'ruza' ? 'Ma\'ruza' : 
                                   resource.lessonType === 'amaliyot' ? 'Amaliy' : 
                                   resource.lessonType === 'laboratoriya' ? 'Laboratoriya' : resource.lessonType}
                                </span>
                              </td>
                              <td>{resource.teacherName}</td>
                              <td>
                                {resource.fileUrl ? (
                                  <span className="file-count-badge">1</span>
                                ) : (
                                  <span className="no-file">-</span>
                                )}
                              </td>
                              <td>{formatDate(resource.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentResources;

