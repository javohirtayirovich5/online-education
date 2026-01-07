import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { useTheme } from '../contexts/ThemeContext';
import SEO from '../components/common/SEO';
import { 
  FiBook, 
  FiVideo, 
  FiUsers, 
  FiBarChart2, 
  FiFileText, 
  FiShield,
  FiCheckCircle,
  FiArrowRight,
  FiLogIn,
  FiUserPlus
} from 'react-icons/fi';
import './Landing.css';

const Landing = () => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();

  return (
    <>
      <SEO 
        title="Technical English - Online Education Platform"
        description="Professional online education platform for universities. Manage video lessons, assignments, grades, attendance, and course resources."
        keywords="online education, e-learning, university platform, video lessons, assignments, grades, Technical English"
      />
      <div className="landing-page">
        {/* Header */}
        <header className="landing-header">
          <div className="landing-container">
            <div className="landing-nav">
              <div className="landing-logo">
                <span className="logo-icon">📚</span>
                <span className="logo-text">Technical English</span>
              </div>
              <div className="landing-nav-links">
                <Link to="/login" className="nav-link">Login</Link>
                <Link to="/register" className="nav-link btn-primary">Register</Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="landing-hero">
          <div className="landing-container">
            <div className="hero-content">
              <h1 className="hero-title">
                Professional Online Education Platform
              </h1>
              <p className="hero-description">
                Manage video lessons, assignments, grades, attendance, and course resources 
                all in one place. Designed for universities and educational institutions.
              </p>
              <div className="hero-buttons">
                <Link to="/register" className="btn btn-primary btn-large">
                  <FiUserPlus /> Get Started
                </Link>
                <Link to="/login" className="btn btn-secondary btn-large">
                  <FiLogIn /> Sign In
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="landing-features">
          <div className="landing-container">
            <h2 className="section-title">Platform Features</h2>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <FiVideo />
                </div>
                <h3>Video Lessons</h3>
                <p>Upload and manage video lessons with organized course structure</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">
                  <FiFileText />
                </div>
                <h3>Assignments</h3>
                <p>Create, distribute, and grade assignments efficiently</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">
                  <FiBarChart2 />
                </div>
                <h3>Grades & Analytics</h3>
                <p>Track student performance with detailed grade reports</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">
                  <FiUsers />
                </div>
                <h3>Attendance Management</h3>
                <p>Record and monitor student attendance easily</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">
                  <FiBook />
                </div>
                <h3>Course Resources</h3>
                <p>Share course materials, documents, and resources</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">
                  <FiShield />
                </div>
                <h3>Secure & Reliable</h3>
                <p>Your data is protected with industry-standard security</p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Google Sign-In Section */}
        <section className="landing-why-google">
          <div className="landing-container">
            <h2 className="section-title">Why We Use Google Sign-In</h2>
            <div className="why-google-content">
              <div className="why-google-text">
                <p>
                  We use Google OAuth to provide you with a secure and convenient way to access our platform. 
                  By signing in with Google, you can:
                </p>
                <ul className="benefits-list">
                  <li>
                    <FiCheckCircle /> Access your account securely without creating a new password
                  </li>
                  <li>
                    <FiCheckCircle /> Use Google Calendar integration for live sessions and scheduling
                  </li>
                  <li>
                    <FiCheckCircle /> Seamlessly join Google Meet live lessons directly from the platform
                  </li>
                  <li>
                    <FiCheckCircle /> Enjoy a faster registration and login process
                  </li>
                </ul>
                <p className="privacy-note">
                  We only request access to your basic profile information and Google Calendar 
                  (for live session management). Your privacy is important to us. 
                  Read our <Link to="/privacy-policy">Privacy Policy</Link> to learn more.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="landing-cta">
          <div className="landing-container">
            <div className="cta-content">
              <h2>Ready to Get Started?</h2>
              <p>Join our platform today and experience modern online education management</p>
              <div className="cta-buttons">
                <Link to="/register" className="btn btn-primary btn-large">
                  Create Account <FiArrowRight />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="landing-footer">
          <div className="landing-container">
            <div className="footer-content">
              <div className="footer-logo">
                <span className="logo-icon">📚</span>
                <span className="logo-text">Technical English</span>
              </div>
              <div className="footer-links">
                <Link to="/privacy-policy">Privacy Policy</Link>
                <Link to="/terms-of-service">Terms of Service</Link>
                <a href="mailto:javohir.tayirovich@gmail.com">Contact Us</a>
              </div>
            </div>
            <div className="footer-copyright">
              <p>&copy; 2026 Technical English. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Landing;

