import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { toast } from 'react-toastify';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import SEO from '../common/SEO';
import './Auth.css';

const Login = () => {
  const { t } = useTranslation();
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
      toast.error(t('auth.fillAllFields'));
      return;
    }

    setLoading(true);
    const result = await login(formData.email, formData.password);
    setLoading(false);

    if (result.success) {
      toast.success(t('auth.welcome'));
      navigate('/dashboard');
    } else {
      toast.error(result.error || t('auth.loginError'));
    }
  };

  return (
    <>
      <SEO 
        title={`${t('auth.login')} - Technical English Online Ta'lim Platformasi`}
        description={t('auth.loginDescription')}
        keywords={t('auth.loginKeywords')}
      />
      <div className="auth-container">
        <div className="auth-box">
        {/* Logo */}
        <div className="auth-logo">
          <div className="brand-icon">
            <span>📚</span>
          </div>
          <h1>Technical English</h1>
          <p>{t('auth.platformName')}</p>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>{t('auth.login')}</h2>
          
          <div className="form-group">
            <label className="form-label">{t('common.email')}</label>
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
            <label className="form-label">{t('auth.password')}</label>
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
              {t('auth.forgotPassword')}
            </Link>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? t('auth.loggingIn') : t('auth.login')}
          </button>
        </form>

        {/* Register Link */}
        <div className="auth-switch">
          <p>{t('auth.noAccount')} <Link to="/register">{t('auth.register')}</Link></p>
        </div>

        {/* Footer Links */}
        <div className="auth-footer">
          <Link to="/privacy-policy" className="auth-footer-link">
            Privacy Policy
          </Link>
          <span className="auth-footer-separator">•</span>
          <Link to="/terms-of-service" className="auth-footer-link">
            Terms of Service
          </Link>
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

