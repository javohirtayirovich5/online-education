import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import SEO from '../common/SEO';
import './Auth.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error('Barcha maydonlarni to\'ldiring');
      return;
    }

    setLoading(true);
    const result = await login(formData.email, formData.password);
    setLoading(false);

    if (result.success) {
      toast.success('Xush kelibsiz!');
      navigate('/dashboard');
    } else {
      toast.error(result.error || 'Kirish xatolik yuz berdi');
    }
  };

  return (
    <>
      <SEO 
        title="Tizimga kirish - EduPro Online Ta'lim Platformasi"
        description="EduPro online ta'lim platformasiga kirish. Universitetlar uchun professional ta'lim tizimi."
        keywords="edupro kirish, login, online ta'lim, universitet platformasi"
      />
      <div className="auth-container">
        <div className="auth-box">
        {/* Logo */}
        <div className="auth-logo">
          <div className="brand-icon">
            <span>📚</span>
          </div>
          <h1>EduPro</h1>
          <p>Online Ta'lim Platformasi</p>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Tizimga kirish</h2>
          
          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="input-with-icon">
              <FiMail className="input-icon" />
              <input
                type="email"
                name="email"
                className="form-input"
                placeholder="email@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Parol</label>
            <div className="input-with-icon">
              <FiLock className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="form-input"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <div className="form-footer">
            <Link to="/forgot-password" className="forgot-link">
              Parolni unutdingizmi?
            </Link>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Kirish...' : 'Kirish'}
          </button>
        </form>

        {/* Register Link */}
        <div className="auth-switch">
          <p>Hisobingiz yo'qmi? <Link to="/register">Ro'yxatdan o'tish</Link></p>
        </div>
      </div>

      {/* Background Decoration */}
      <div className="auth-background">
        <div className="bg-shape shape-1"></div>
        <div className="bg-shape shape-2"></div>
        <div className="bg-shape shape-3"></div>
      </div>
    </div>
    </>
  );
};

export default Login;

