import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { FiMail, FiArrowLeft } from 'react-icons/fi';
import './Auth.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Email manzilini kiriting');
      return;
    }

    setLoading(true);
    const result = await resetPassword(email);
    setLoading(false);

    if (result.success) {
      setSent(true);
      toast.success('Parolni tiklash havolasi emailingizga yuborildi');
    } else {
      toast.error(result.error || 'Xatolik yuz berdi');
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
            <h1>Email yuborildi!</h1>
            <p>Parolni tiklash havolasi emailingizga yuborildi. Emailingizni tekshiring.</p>
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
          <h1>Parolni tiklash</h1>
          <p>Email manzilingizni kiriting va biz sizga parolni tiklash havolasini yuboramiz</p>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="input-with-icon">
              <FiMail className="input-icon" />
              <input
                type="email"
                className="form-input"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Yuborilmoqda...' : 'Havola yuborish'}
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

