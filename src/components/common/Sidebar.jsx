import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
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
  FiChevronDown,
  FiChevronRight,
  FiCalendar
} from 'react-icons/fi';
import './Sidebar.css';

const Sidebar = ({ isOpen, closeSidebar }) => {
  const { userData, isAdmin, isTeacher } = useAuth();
  const location = useLocation();
  
  // Submenu states
  const [expandedMenus, setExpandedMenus] = useState({
    groups: location.pathname.startsWith('/teacher/groups')
  });

  const toggleMenu = (menuKey) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const adminLinks = [
    { to: '/dashboard', icon: FiHome, label: 'Dashboard' },
    { to: '/structure', icon: FiGrid, label: 'Tuzilma' },
    { to: '/users', icon: FiUsers, label: 'Foydalanuvchilar' },
    { to: '/lessons', icon: FiVideo, label: 'Barcha darslar' },
    { to: '/analytics', icon: FiBarChart2, label: 'Statistika' },
    { to: '/settings', icon: FiSettings, label: 'Sozlamalar' }
  ];

  const teacherLinks = [
    { to: '/dashboard', icon: FiHome, label: 'Dashboard' },
    { 
      key: 'groups',
      icon: FiUsers, 
      label: 'Guruhlar',
      submenu: [
        { to: '/teacher/groups/attendance', icon: FiClipboard, label: 'Davomat' },
        { to: '/teacher/groups/grades', icon: FiStar, label: 'Baholar' }
      ]
    },
    { to: '/teacher/resources', icon: FiFileText, label: 'Fan resurslari' },
    { to: '/my-lessons', icon: FiVideo, label: 'Mening darslarim' },
    { to: '/assignments', icon: FiFileText, label: 'Topshiriqlar' }
  ];

  const studentLinks = [
    { to: '/dashboard', icon: FiHome, label: 'Dashboard' },
    { to: '/my-subjects', icon: FiBookOpen, label: 'Fanlarim' },
    { to: '/timetable', icon: FiCalendar, label: 'Dars jadvali' },
    { to: '/resources', icon: FiFileText, label: 'Fan resurslari' },
    { to: '/lessons', icon: FiVideo, label: 'Video darslar' },
    { to: '/assignments', icon: FiFileText, label: 'Topshiriqlar' },
    { to: '/my-grades', icon: FiStar, label: 'Baholarim' },
    { to: '/attendance', icon: FiClipboard, label: 'Davomat' }
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
                {isAdmin ? 'Administrator' : isTeacher ? 'O\'qituvchi' : 'Talaba'}
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
