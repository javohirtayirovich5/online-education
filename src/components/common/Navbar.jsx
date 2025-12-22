import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { FiMenu, FiX, FiSun, FiMoon, FiBell, FiSearch, FiUser, FiLogOut, FiSettings } from 'react-icons/fi';
import './Navbar.css';

const Navbar = ({ toggleSidebar, isSidebarOpen }) => {
  const { currentUser, userData, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

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
            {isSidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
          
          <Link to="/" className="navbar-brand">
            <div className="brand-icon">
              <span>📚</span>
            </div>
            <span className="brand-text">EduPro</span>
          </Link>
        </div>

        {/* Center Section - Search */}
        <form className="navbar-search" onSubmit={handleSearch}>
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Kurslar, darslar, fayllar qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </form>

        {/* Right Section */}
        <div className="navbar-right">
          {/* Theme Toggle */}
          <button className="icon-btn" onClick={toggleTheme} title={isDarkMode ? 'Yorug\' rejim' : 'Qorong\'i rejim'}>
            {isDarkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
          </button>

          {/* Notifications */}
          <div className="notification-wrapper">
            <button 
              className="icon-btn notification-btn" 
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <FiBell size={20} />
              <span className="notification-badge">3</span>
            </button>
            
            {showNotifications && (
              <div className="notification-dropdown">
                <div className="dropdown-header">
                  <h3>Bildirishnomalar</h3>
                </div>
                <div className="notification-list">
                  <div className="notification-item">
                    <div className="notification-content">
                      <p className="notification-title">Yangi topshiriq</p>
                      <p className="notification-text">Matematika kursi uchun yangi topshiriq qo'shildi</p>
                      <span className="notification-time">5 daqiqa oldin</span>
                    </div>
                  </div>
                  <div className="notification-item">
                    <div className="notification-content">
                      <p className="notification-title">Baho qo'yildi</p>
                      <p className="notification-text">Fizika topshirig'ingiz baholandi - 95 ball</p>
                      <span className="notification-time">2 soat oldin</span>
                    </div>
                  </div>
                  <div className="notification-item">
                    <div className="notification-content">
                      <p className="notification-title">Yangi e'lon</p>
                      <p className="notification-text">Ertaga imtihon rejalashtirilgan</p>
                      <span className="notification-time">1 kun oldin</span>
                    </div>
                  </div>
                </div>
                <Link to="/notifications" className="view-all-link">
                  Barchasini ko'rish
                </Link>
              </div>
            )}
          </div>

          {/* Profile Menu */}
          <div className="profile-wrapper">
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
                  {userData?.role === 'admin' ? 'Administrator' : 
                   userData?.role === 'teacher' ? 'O\'qituvchi' : 'Talaba'}
                </span>
              </div>
            </button>

            {showProfileMenu && (
              <div className="profile-dropdown">
                <Link to="/profile" className="dropdown-item">
                  <FiUser /> Profil
                </Link>
                <Link to="/settings" className="dropdown-item">
                  <FiSettings /> Sozlamalar
                </Link>
                <button onClick={handleLogout} className="dropdown-item logout-btn">
                  <FiLogOut /> Chiqish
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

