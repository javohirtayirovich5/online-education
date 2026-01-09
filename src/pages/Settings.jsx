import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from '../hooks/useTranslation';
import { FiMoon, FiSun, FiBell, FiLock, FiGlobe, FiShield, FiArrowLeft } from 'react-icons/fi';
import { toast } from 'react-toastify';
import ConfirmModal from '../components/common/ConfirmModal';
import './Settings.css';

const Settings = () => {
  const navigate = useNavigate();
  const { userData, resetPassword, currentUser } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { language, changeLanguage } = useLanguage();
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    assignments: true,
    grades: true,
    announcements: true
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const handleResetPassword = () => {
    setConfirmAction(() => async () => {
      const result = await resetPassword(currentUser.email);
      if (result.success) {
        toast.success(t('common.passwordResetSent'));
      } else {
        toast.error(t('common.error'));
      }
    });
    setShowConfirmModal(true);
  };

  return (
    <div className="settings-page">
      <button 
        className="back-btn"
        onClick={() => navigate('/dashboard')}
      >
        <FiArrowLeft /> {t('common.back')}
      </button>
      <div className="page-header">
        <div>
          <h1>{t('settings.title')}</h1>
          <p>{t('settings.subtitle')}</p>
        </div>
      </div>

      <div className="settings-content">
        {/* Appearance */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-icon">
              {isDarkMode ? <FiMoon /> : <FiSun />}
            </div>
            <div>
              <h3>{t('settings.appearance')}</h3>
              <p>{t('settings.appearanceDesc')}</p>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="setting-item">
              <div className="setting-info">
                <h4>{t('settings.darkMode')}</h4>
                <p>{t('settings.darkModeDesc')}</p>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={isDarkMode} 
                  onChange={toggleTheme}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-icon">
              <FiBell />
            </div>
            <div>
              <h3>{t('settings.notifications')}</h3>
              <p>{t('settings.notificationsDesc')}</p>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="setting-item">
              <div className="setting-info">
                <h4>{t('settings.emailNotifications')}</h4>
                <p>{t('settings.emailNotificationsDesc')}</p>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={notifications.email} 
                  onChange={(e) => setNotifications({...notifications, email: e.target.checked})}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>{t('settings.assignmentNotifications')}</h4>
                <p>{t('settings.assignmentNotificationsDesc')}</p>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={notifications.assignments} 
                  onChange={(e) => setNotifications({...notifications, assignments: e.target.checked})}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>{t('settings.gradeNotifications')}</h4>
                <p>{t('settings.gradeNotificationsDesc')}</p>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={notifications.grades} 
                  onChange={(e) => setNotifications({...notifications, grades: e.target.checked})}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-icon">
              <FiShield />
            </div>
            <div>
              <h3>{t('settings.security')}</h3>
              <p>{t('settings.securityDesc')}</p>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="setting-item">
              <div className="setting-info">
                <h4>{t('settings.changePassword')}</h4>
                <p>{t('settings.changePasswordDesc')}</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleResetPassword}>
                <FiLock /> {t('common.edit')}
              </button>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>{t('settings.email')}</h4>
                <p>{currentUser?.email}</p>
              </div>
              <span className="verified-badge">{t('settings.verified')}</span>
            </div>
          </div>
        </div>

        {/* Language */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-icon">
              <FiGlobe />
            </div>
            <div>
              <h3>{t('settings.language')}</h3>
              <p>{t('settings.languageDesc')}</p>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="setting-item">
              <div className="setting-info">
                <h4>{t('settings.systemLanguage')}</h4>
                {/* <p>{t('settings.currentLanguage')}</p> */}
              </div>
              <select 
                className="form-select-sm"
                value={language}
                onChange={(e) => changeLanguage(e.target.value)}
              >
                <option value="uz">O'zbekcha</option>
                <option value="ru">Русский</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </div>

      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setConfirmAction(null);
        }}
        onConfirm={() => {
          if (confirmAction) {
            confirmAction();
          }
        }}
        title={t('common.confirm')}
        message={t('common.confirmMessage')}
        confirmText={t('common.yes')}
        cancelText={t('common.no')}
        type="primary"
      />
    </div>
  );
};

export default Settings;

