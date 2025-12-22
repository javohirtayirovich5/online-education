import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { FiMoon, FiSun, FiBell, FiLock, FiGlobe, FiShield, FiTrash2, FiArrowLeft } from 'react-icons/fi';
import { toast } from 'react-toastify';
import ConfirmModal from '../components/common/ConfirmModal';
import './Settings.css';

const Settings = () => {
  const navigate = useNavigate();
  const { userData, resetPassword, currentUser } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
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
        toast.success('Parolni tiklash havolasi emailingizga yuborildi');
      } else {
        toast.error('Xatolik yuz berdi');
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
        <FiArrowLeft /> Orqaga
      </button>
      <div className="page-header">
        <div>
          <h1>Sozlamalar</h1>
          <p>Hisobingiz sozlamalarini boshqaring</p>
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
              <h3>Ko'rinish</h3>
              <p>Tema va ko'rinish sozlamalari</p>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="setting-item">
              <div className="setting-info">
                <h4>Qorong'i rejim</h4>
                <p>Qorong'i tema yoqilgan/o'chirilgan</p>
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
              <h3>Bildirishnomalar</h3>
              <p>Xabarnomalar sozlamalari</p>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="setting-item">
              <div className="setting-info">
                <h4>Email xabarnomalar</h4>
                <p>Email orqali xabarnomalar olish</p>
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
                <h4>Topshiriq xabarnomalar</h4>
                <p>Yangi topshiriqlar haqida xabar olish</p>
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
                <h4>Baho xabarnomalar</h4>
                <p>Yangi baholar haqida xabar olish</p>
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
              <h3>Xavfsizlik</h3>
              <p>Hisobingiz xavfsizligi</p>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="setting-item">
              <div className="setting-info">
                <h4>Parolni o'zgartirish</h4>
                <p>Yangi parol o'rnatish uchun havolani emailga yuborish</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleResetPassword}>
                <FiLock /> O'zgartirish
              </button>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Email</h4>
                <p>{currentUser?.email}</p>
              </div>
              <span className="verified-badge">Tasdiqlangan</span>
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
              <h3>Til</h3>
              <p>Interfeys tili</p>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="setting-item">
              <div className="setting-info">
                <h4>Tizim tili</h4>
                <p>Hozirgi til: O'zbekcha</p>
              </div>
              <select className="form-select-sm">
                <option value="uz">O'zbekcha</option>
                <option value="ru">Русский</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="settings-card danger">
          <div className="settings-card-header">
            <div className="settings-icon danger">
              <FiTrash2 />
            </div>
            <div>
              <h3>Xavfli hudud</h3>
              <p>Bu amallar qaytarib bo'lmaydi</p>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="setting-item">
              <div className="setting-info">
                <h4>Hisobni o'chirish</h4>
                <p>Hisobingiz va barcha ma'lumotlaringiz o'chiriladi</p>
              </div>
              <button className="btn btn-danger btn-sm">
                <FiTrash2 /> O'chirish
              </button>
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
        title="Tasdiqlash"
        message="Parolni tiklash havolasi emailingizga yuboriladi. Davom etasizmi?"
        confirmText="Ha"
        cancelText="Yo'q"
        type="primary"
      />
    </div>
  );
};

export default Settings;

