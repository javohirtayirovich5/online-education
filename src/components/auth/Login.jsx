import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { toast } from 'react-toastify';
import { FiMail, FiLock, FiEye, FiEyeOff, FiHome } from 'react-icons/fi';
import LoadingSpinner from '../common/LoadingSpinner';
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
  const { login, currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);

  // Initialize Vanta.js GLOBE background - dynamic loading
  useEffect(() => {
    const loadVantaScripts = async () => {
      // Check if scripts are already loaded
      if (window.VANTA && window.VANTA.GLOBE && window.THREE) {
        initVantaEffect();
        return;
      }

      // Load Three.js first
      if (!window.THREE) {
        const threeScript = document.createElement('script');
        threeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r121/three.min.js';
        threeScript.async = true;
        await new Promise((resolve, reject) => {
          threeScript.onload = resolve;
          threeScript.onerror = reject;
          document.head.appendChild(threeScript);
        });
      }

      // Load Vanta Globe
      if (!window.VANTA || !window.VANTA.GLOBE) {
        const vantaGlobeScript = document.createElement('script');
        vantaGlobeScript.src = 'https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.globe.min.js';
        vantaGlobeScript.async = true;
        await new Promise((resolve, reject) => {
          vantaGlobeScript.onload = resolve;
          vantaGlobeScript.onerror = reject;
          document.head.appendChild(vantaGlobeScript);
        });
      }

      initVantaEffect();
    };

    const initVantaEffect = () => {
      if (window.VANTA && window.VANTA.GLOBE && vantaRef.current) {
        vantaEffect.current = window.VANTA.GLOBE({
          el: vantaRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.00,
          scaleMobile: 1.00
        });
      }
    };

    loadVantaScripts().catch(error => {
      console.error('Failed to load Vanta.js scripts:', error);
    });

    return () => {
      if (vantaEffect.current) {
        vantaEffect.current.destroy();
      }
    };
  }, []);

  // If user is already logged in, redirect to dashboard
  if (authLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

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
        <div ref={vantaRef} className="vanta-background"></div>
        <div className="auth-box">
        {/* Logo */}
        <div className="auth-logo">
          <div className="brand-icon">
            <img src="/favicon.png" alt="Technical English" className="brand-logo" />
          </div>
          <h1>Technical English</h1>
          <p>{t('auth.platformName')}</p>
        </div>

        {/* Back to Landing Page */}
        <div className="auth-back-link">
          <Link to="/" className="back-link">
            <FiHome /> {t('common.backToHome') || 'Bosh sahifaga qaytish'}
          </Link>
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
            {t('auth.privacyPolicy')}
          </Link>
          <span className="auth-footer-separator">•</span>
          <Link to="/terms-of-service" className="auth-footer-link">
            {t('auth.termsOfService')}
          </Link>
        </div>
      </div>

    </div>
    </>
  );
};

export default Login;

