import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { liveService } from '../../services/liveService';
import { groupService } from '../../services/groupService';
import {
  FiHome,
  FiVideo,
  FiFileText,
  FiBarChart2,
  FiUsers,
  FiSettings,
  FiClipboard,
  FiBookOpen,
  FiGrid,
  FiStar,
  FiClock,
  FiChevronDown,
  FiChevronRight,
  FiCalendar,
  FiHelpCircle
} from 'react-icons/fi';
import './Sidebar.css';

const Sidebar = ({ isOpen, closeSidebar }) => {
  const { userData, isAdmin, isTeacher, currentUser } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const [hasActiveLiveSession, setHasActiveLiveSession] = useState(false);
  
  // Submenu states
  const [expandedMenus, setExpandedMenus] = useState({
    groups: location.pathname.startsWith('/teacher/groups')
  });

  // Check for active live sessions
  useEffect(() => {
    const checkActiveSessions = async () => {
      if (!userData) {
        setHasActiveLiveSession(false);
        return;
      }

      try {
        let groupId = null;
        if (isTeacher && currentUser) {
          // O'qituvchi uchun: birinchi guruhni tekshirish
          const res = await groupService.getGroupsByTeacher(currentUser.uid);
          if (res.success && res.data && res.data.length > 0) {
            groupId = res.data[0].id;
          }
        } else if (userData.groupId) {
          // Talaba uchun: o'z guruhini tekshirish
          groupId = userData.groupId;
        }

        if (groupId) {
          const teacherId = isTeacher ? currentUser?.uid : null;
          const res = await liveService.getActiveSessionsForGroup(groupId, teacherId);
          if (res.success && res.data && res.data.length > 0) {
            setHasActiveLiveSession(true);
          } else {
            setHasActiveLiveSession(false);
          }
        } else {
          setHasActiveLiveSession(false);
        }
      } catch (error) {
        console.error('Check active sessions error:', error);
        setHasActiveLiveSession(false);
      }
    };

    checkActiveSessions();
    // Har 30 soniyada yangilash
    const interval = setInterval(checkActiveSessions, 30000);
    return () => clearInterval(interval);
  }, [userData, isTeacher, currentUser]);

  const toggleMenu = (menuKey) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const adminLinks = [
    { to: '/dashboard', icon: FiHome, label: t('sidebar.dashboard') },
    { to: '/structure', icon: FiGrid, label: t('sidebar.structure') },
    { to: '/users', icon: FiUsers, label: t('sidebar.users') },
    { to: '/lessons', icon: FiVideo, label: t('sidebar.allLessons') },
    { to: '/analytics', icon: FiBarChart2, label: t('sidebar.statistics') },
    { to: '/settings', icon: FiSettings, label: t('common.settings') }
  ];

  const teacherLinks = [
    { to: '/dashboard', icon: FiHome, label: t('sidebar.dashboard') },
    { 
      key: 'groups',
      icon: FiUsers, 
      label: t('sidebar.groups'),
      submenu: [
        { to: '/teacher/groups/attendance', icon: FiClipboard, label: t('sidebar.attendance') },
        { to: '/teacher/groups/grades', icon: FiStar, label: t('sidebar.grades') }
      ]
    },
    { to: '/teacher/resources', icon: FiFileText, label: t('sidebar.courseResources') },
    { to: '/my-lessons', icon: FiVideo, label: t('sidebar.myLessons') },
    { to: '/live-sessions', icon: FiClock, label: t('sidebar.liveLessons') },
    { to: '/assignments', icon: FiFileText, label: t('sidebar.assignments') },
    { to: '/teacher/tests', icon: FiHelpCircle, label: t('sidebar.tests') }
  ];

  const studentLinks = [
    { to: '/dashboard', icon: FiHome, label: t('sidebar.dashboard') },
    { to: '/my-subjects', icon: FiBookOpen, label: t('sidebar.mySubjects') },
    { to: '/timetable', icon: FiCalendar, label: t('sidebar.schedule') },
    { to: '/resources', icon: FiFileText, label: t('sidebar.courseResources') },
    { to: '/lessons', icon: FiVideo, label: t('sidebar.videoLessons') },
    { to: '/live-sessions', icon: FiClock, label: t('sidebar.liveLessons') },
    { to: '/assignments', icon: FiFileText, label: t('sidebar.assignments') },
    { to: '/tests', icon: FiHelpCircle, label: t('sidebar.tests') },
    { to: '/my-grades', icon: FiStar, label: t('sidebar.myGrades') },
    { to: '/attendance', icon: FiClipboard, label: t('sidebar.attendance') }
  ];

  const links = isAdmin ? adminLinks : isTeacher ? teacherLinks : studentLinks;

  const renderLink = (link) => {
    // Submenu mavjud bo'lsa
    if (link.submenu) {
      const isExpanded = expandedMenus[link.key];
      const isActiveParent = link.submenu.some(sub => location.pathname === sub.to);
      
      return (
        <div key={link.key} className="sidebar-menu-item">
          <button
            className={`sidebar-link sidebar-dropdown ${isActiveParent ? 'active-parent' : ''}`}
            onClick={() => toggleMenu(link.key)}
          >
            <link.icon size={20} />
            <span>{link.label}</span>
            {isExpanded ? <FiChevronDown className="dropdown-icon" /> : <FiChevronRight className="dropdown-icon" />}
          </button>
          
          {isExpanded && (
            <div className="sidebar-submenu">
              {link.submenu.map(subLink => (
                <NavLink
                  key={subLink.to}
                  to={subLink.to}
                  className={({ isActive }) => 
                    `sidebar-sublink ${isActive ? 'active' : ''}`
                  }
                  onClick={closeSidebar}
                >
                  <subLink.icon size={16} />
                  <span>{subLink.label}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Oddiy link
    const isLiveSessionsLink = link.to === '/live-sessions';
    return (
      <NavLink
        key={link.to}
        to={link.to}
        className={({ isActive }) => 
          `sidebar-link ${isActive ? 'active' : ''}`
        }
        onClick={closeSidebar}
      >
        <link.icon size={20} />
        <span>{link.label}</span>
        {isLiveSessionsLink && hasActiveLiveSession && (
          <span className="live-badge-dot" style={{ marginLeft: 'auto' }} />
        )}
      </NavLink>
    );
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}
      
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-content">
          {/* User Info */}
          <div className="sidebar-user">
            <img 
              src={userData?.photoURL || '/default-avatar.png'} 
              alt={userData?.displayName}
              className="sidebar-user-avatar"
            />
            <div className="sidebar-user-info">
              <h3 className="sidebar-user-name">{userData?.displayName}</h3>
              <p className="sidebar-user-role">
                {isAdmin ? t('common.administrator') : isTeacher ? t('common.teacher') : t('common.student')}
              </p>
              {userData?.groupName && (
                <span className="sidebar-user-group">{userData.groupName}</span>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="sidebar-nav">
            {links.map(renderLink)}
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
