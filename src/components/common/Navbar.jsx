import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTranslation } from '../../hooks/useTranslation';
import { FiMenu, FiSun, FiMoon, FiBell, FiSearch, FiUser, FiLogOut, FiSettings, FiGlobe, FiChevronDown } from 'react-icons/fi';
import NotificationDropdown from './NotificationDropdown';
import { notificationService } from '../../services/notificationService';
import './Navbar.css';

const Navbar = memo(({ toggleSidebar, isSidebarOpen }) => {
  const { currentUser, userData, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { language, changeLanguage } = useLanguage();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const languageMenuRef = useRef(null);
  const profileMenuRef = useRef(null);

  // Subscribe to unread notifications count
  useEffect(() => {
    if (!userData?.uid) return;

    const unsubscribe = notificationService.subscribeToUnreadCount(
      userData.uid,
      (count) => {
        setUnreadCount(count);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userData?.uid]);

  // Close language menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target)) {
        setShowLanguageMenu(false);
      }
    };

    if (showLanguageMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLanguageMenu]);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  const handleLanguageChange = (lang) => {
    changeLanguage(lang);
    setShowLanguageMenu(false);
  };

  const getLanguageName = (lang) => {
    const names = {
      uz: t('navbar.languageUz'),
      en: t('navbar.languageEn'),
      ru: t('navbar.languageRu')
    };
    return names[lang] || lang;
  };

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/login');
  }, [logout, navigate]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${searchQuery}`);
      setSearchQuery('');
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Left Section */}
        <div className="navbar-left">
          <button className="menu-toggle" onClick={toggleSidebar}>
            <FiMenu size={24} />
          </button>
          
          <Link to="/" className="navbar-brand">
            <div className="brand-icon">
              <img src="/favicon.png" alt="Technical English" className="brand-logo" />
            </div>
            <span className="brand-text">Technical English</span>
          </Link>
        </div>

       
        {/* Right Section */}
        <div className="navbar-right">
          {/* Theme Toggle */}
          <button className="icon-btn" onClick={toggleTheme} title={isDarkMode ? t('navbar.lightMode') : t('navbar.darkMode')}>
            {isDarkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
          </button>

          {/* Language Selector */}
          <div className="language-wrapper" ref={languageMenuRef}>
            <button 
              className="icon-btn language-btn" 
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              title={t('navbar.language')}
            >
              <FiGlobe size={20} />
              <span className="language-code">{language.toUpperCase()}</span>
              <FiChevronDown size={14} className={`chevron ${showLanguageMenu ? 'open' : ''}`} />
            </button>
            
            {showLanguageMenu && (
              <div className="language-dropdown">
                <button 
                  className={`language-option ${language === 'uz' ? 'active' : ''}`}
                  onClick={() => handleLanguageChange('uz')}
                >
                  <span className="language-flag">🇺🇿</span>
                  <span className="language-name">{t('navbar.languageUz')}</span>
                  {language === 'uz' && <span className="check-icon">✓</span>}
                </button>
                <button 
                  className={`language-option ${language === 'en' ? 'active' : ''}`}
                  onClick={() => handleLanguageChange('en')}
                >
                  <span className="language-flag">🇬🇧</span>
                  <span className="language-name">{t('navbar.languageEn')}</span>
                  {language === 'en' && <span className="check-icon">✓</span>}
                </button>
                <button 
                  className={`language-option ${language === 'ru' ? 'active' : ''}`}
                  onClick={() => handleLanguageChange('ru')}
                >
                  <span className="language-flag">🇷🇺</span>
                  <span className="language-name">{t('navbar.languageRu')}</span>
                  {language === 'ru' && <span className="check-icon">✓</span>}
                </button>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="notification-wrapper">
            <button 
              className="icon-btn notification-btn" 
              onClick={() => setShowNotifications(!showNotifications)}
              title={t('navbar.notifications')}
            >
              <FiBell size={20} />
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </button>
            
            {showNotifications && userData?.uid && (
              <NotificationDropdown 
                userId={userData.uid}
                onClose={() => setShowNotifications(false)}
              />
            )}
          </div>

          {/* Profile Menu */}
          <div className="profile-wrapper" ref={profileMenuRef}>
            <button 
              className="profile-btn" 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <img 
                src={userData?.photoURL || '/default-avatar.png'} 
                alt={userData?.displayName}
                className="profile-avatar"
              />
              <div className="profile-info">
                <span className="profile-name">{userData?.displayName}</span>
                <span className="profile-role">
                  {userData?.role === 'admin' ? t('common.administrator') : 
                   userData?.role === 'teacher' ? t('common.teacher') : t('common.student')}
                </span>
              </div>
            </button>

            {showProfileMenu && (
              <div className="profile-dropdown">
                <Link to="/profile" className="dropdown-item">
                  <FiUser /> {t('navbar.profile')}
                </Link>
                <Link to="/settings" className="dropdown-item">
                  <FiSettings /> {t('navbar.settings')}
                </Link>
                <button onClick={handleLogout} className="dropdown-item logout-btn">
                  <FiLogOut /> {t('navbar.logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
});

Navbar.displayName = 'Navbar';

export default Navbar;

