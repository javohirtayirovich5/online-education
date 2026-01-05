import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { toast } from 'react-toastify';
import { FiMail, FiArrowLeft } from 'react-icons/fi';
import './Auth.css';

const ForgotPassword = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error(t('auth.enterEmail'));
      return;
    }

    setLoading(true);
    const result = await resetPassword(email);
    setLoading(false);

    if (result.success) {
      setSent(true);
      toast.success(t('common.passwordResetSent'));
    } else {
      toast.error(result.error || t('common.error'));
    }
  };

  if (sent) {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <div className="auth-logo">
            <div className="brand-icon success">
              <span>✉️</span>
            </div>
            <h1>{t('auth.emailSent')}</h1>
            <p>{t('auth.passwordResetLinkSent')}</p>
          </div>

          <Link to="/login" className="btn btn-primary btn-block">
            <FiArrowLeft /> Kirish sahifasiga qaytish
          </Link>
        </div>

        <div className="auth-background">
          <div className="bg-shape shape-1"></div>
          <div className="bg-shape shape-2"></div>
          <div className="bg-shape shape-3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        {/* Logo */}
        <div className="auth-logo">
          <div className="brand-icon">
            <span>🔑</span>
          </div>
          <h1>{t('auth.forgotPassword')}</h1>
          <p>{t('auth.forgotPasswordDescription')}</p>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('common.email')}</label>
            <div className="input-with-icon">
              <FiMail className="input-icon" />
              <input
                type="email"
                className="form-input"
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? t('auth.sending') : t('auth.sendLink')}
          </button>
        </form>

        {/* Back Link */}
        <div className="auth-switch">
          <Link to="/login" className="back-link">
            <FiArrowLeft /> Kirish sahifasiga qaytish
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
  );
};

export default ForgotPassword;

