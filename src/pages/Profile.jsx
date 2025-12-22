import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { storageService } from '../services/storageService';
import { FiUser, FiMail, FiPhone, FiBook, FiEdit, FiCamera, FiSave, FiArrowLeft } from 'react-icons/fi';
import { toast } from 'react-toastify';
import './Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const { userData, updateProfile, currentUser } = useAuth();
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
      toast.success('Profil yangilandi');
      setIsEditing(false);
    } else {
      toast.error('Profilni yangilashda xatolik');
    }
    setLoading(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Rasm hajmi 5MB dan oshmasligi kerak');
      return;
    }

    setLoading(true);
    const result = await storageService.uploadProfilePicture(currentUser.uid, file);
    
    if (result.success) {
      await updateProfile({ photoURL: result.url });
      toast.success('Profil rasmi yangilandi');
    } else {
      toast.error('Rasmni yuklashda xatolik');
    }
    setLoading(false);
  };

  return (
    <div className="profile-page">
      <button 
        className="back-btn"
        onClick={() => navigate('/dashboard')}
      >
        <FiArrowLeft /> Orqaga
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
                {userData?.role === 'admin' ? 'Administrator' : 
                 userData?.role === 'teacher' ? 'O\'qituvchi' : 'Talaba'}
              </span>
              <p className="profile-email">{userData?.email}</p>
            </div>
          </div>
          
          {!isEditing && (
            <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
              <FiEdit /> Profilni tahrirlash
            </button>
          )}
        </div>
      </div>

      <div className="profile-content">
        {isEditing ? (
          <form className="profile-form" onSubmit={handleSubmit}>
            <div className="form-card">
              <h2>Shaxsiy ma'lumotlar</h2>
              
              <div className="form-group">
                <label className="form-label">
                  <FiUser /> To'liq ism
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
                  <FiPhone /> Telefon
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
                <label className="form-label">Manzil</label>
                <input
                  type="text"
                  name="address"
                  className="form-input"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Biografiya</label>
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
                  Bekor qilish
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <FiSave /> {loading ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="profile-info-cards">
            <div className="info-card">
              <h3>Shaxsiy ma'lumotlar</h3>
              <div className="info-list">
                <div className="info-item">
                  <span className="info-label">To'liq ism</span>
                  <span className="info-value">{userData?.displayName}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Email</span>
                  <span className="info-value">{userData?.email}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Telefon</span>
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
              <h3>Biografiya</h3>
              <p className="bio-text">{userData?.bio || 'Biografiya kiritilmagan'}</p>
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

