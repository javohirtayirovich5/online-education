import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { storageService } from '../services/storageService';
import { FiUser, FiMail, FiPhone, FiBook, FiEdit, FiCamera, FiSave, FiArrowLeft } from 'react-icons/fi';
import { toast } from 'react-toastify';
import './Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const { userData, updateProfile, currentUser } = useAuth();
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: userData?.displayName || '',
    phoneNumber: userData?.phoneNumber || '',
    department: userData?.department || '',
    bio: userData?.bio || '',
    address: userData?.address || ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await updateProfile(formData);
    
    if (result.success) {
      toast.success(t('profile.profileUpdated'));
      setIsEditing(false);
    } else {
      toast.error(t('profile.updateError'));
    }
    setLoading(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('profile.imageSizeError'));
      return;
    }

    setLoading(true);
    const result = await storageService.uploadProfilePicture(currentUser.uid, file);
    
    if (result.success) {
      await updateProfile({ photoURL: result.url });
      toast.success(t('profile.imageUpdated'));
    } else {
      toast.error(t('profile.imageUploadError'));
    }
    setLoading(false);
  };

  return (
    <div className="profile-page">
      <button 
        className="back-btn"
        onClick={() => navigate('/dashboard')}
      >
        <FiArrowLeft /> {t('common.back')}
      </button>
      <div className="profile-header-section">
        <div className="profile-cover"></div>
        <div className="profile-header-content">
          <div className="profile-avatar-section">
            <div className="avatar-wrapper">
              <img 
                src={userData?.photoURL || '/default-avatar.png'} 
                alt={userData?.displayName}
                className="profile-avatar-large"
              />
              <label className="avatar-upload-btn">
                <FiCamera />
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload}
                  disabled={loading}
                />
              </label>
            </div>
            <div className="profile-header-info">
              <h1>{userData?.displayName}</h1>
              <span className="profile-role-badge">
                {userData?.role === 'admin' ? t('common.administrator') : 
                 userData?.role === 'teacher' ? t('common.teacher') : t('common.student')}
              </span>
              <p className="profile-email">{userData?.email}</p>
            </div>
          </div>
          
          {!isEditing && (
            <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
              <FiEdit /> {t('profile.editProfile')}
            </button>
          )}
        </div>
      </div>

      <div className="profile-content">
        {isEditing ? (
          <form className="profile-form" onSubmit={handleSubmit}>
            <div className="form-card">
              <h2>{t('profile.personalInfo')}</h2>
              
              <div className="form-group">
                <label className="form-label">
                  <FiUser /> {t('profile.fullName')}
                </label>
                <input
                  type="text"
                  name="displayName"
                  className="form-input"
                  value={formData.displayName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <FiPhone /> {t('profile.phoneNumber')}
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  className="form-input"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="+998901234567"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <FiBook /> Fakultet/Yo'nalish
                </label>
                <input
                  type="text"
                  name="department"
                  className="form-input"
                  value={formData.department}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('profile.address')}</label>
                <input
                  type="text"
                  name="address"
                  className="form-input"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('profile.bio')}</label>
                <textarea
                  name="bio"
                  className="form-textarea"
                  value={formData.bio}
                  onChange={handleChange}
                  rows="4"
                  placeholder="O'zingiz haqingizda qisqacha..."
                />
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setIsEditing(false)}
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <FiSave /> {loading ? t('common.loading') : t('common.save')}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="profile-info-cards">
            <div className="info-card">
              <h3>{t('profile.personalInfo')}</h3>
              <div className="info-list">
                <div className="info-item">
                  <span className="info-label">{t('profile.fullName')}</span>
                  <span className="info-value">{userData?.displayName}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Email</span>
                  <span className="info-value">{userData?.email}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('profile.phoneNumber')}</span>
                  <span className="info-value">{userData?.phoneNumber || '-'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Fakultet</span>
                  <span className="info-value">{userData?.department || '-'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">ID raqam</span>
                  <span className="info-value">
                    {userData?.studentId || userData?.teacherId || '-'}
                  </span>
                </div>
              </div>
            </div>

            <div className="info-card">
              <h3>{t('profile.bio')}</h3>
              <p className="bio-text">{userData?.bio || t('profile.bio')}</p>
            </div>

            <div className="info-card">
              <h3>Statistika</h3>
              <div className="stats-mini">
                <div className="stat-mini-item">
                  <span className="stat-mini-value">
                    {userData?.enrolledCourses?.length || userData?.createdCourses?.length || 0}
                  </span>
                  <span className="stat-mini-label">Kurslar</span>
                </div>
                <div className="stat-mini-item">
                  <span className="stat-mini-value">
                    {new Date(userData?.createdAt).toLocaleDateString()}
                  </span>
                  <span className="stat-mini-label">Ro'yxatdan o'tgan</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;

