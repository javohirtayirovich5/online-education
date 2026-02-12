import { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
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
  FiUserPlus,
  FiSun,
  FiMoon,
  FiGlobe,
  FiChevronDown
} from 'react-icons/fi';
import './Landing.css';

const Landing = () => {
  const { t } = useTranslation();
  const { isDarkMode, toggleTheme } = useTheme();
  const { language, changeLanguage } = useLanguage();
  const { currentUser, loading } = useAuth();
  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const languageMenuRef = useRef(null);

  // Initialize Vanta.js BIRDS background animation - dynamic loading
  useEffect(() => {
    const loadVantaScripts = async () => {
      // Check if scripts are already loaded
      if (window.VANTA && window.VANTA.BIRDS && window.THREE) {
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

      // Load Vanta Birds
      if (!window.VANTA || !window.VANTA.BIRDS) {
        const vantaBirdsScript = document.createElement('script');
        vantaBirdsScript.src = 'https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.birds.min.js';
        vantaBirdsScript.async = true;
        await new Promise((resolve, reject) => {
          vantaBirdsScript.onload = resolve;
          vantaBirdsScript.onerror = reject;
          document.head.appendChild(vantaBirdsScript);
        });
      }

      initVantaEffect();
    };

    const initVantaEffect = () => {
      if (window.VANTA && window.VANTA.BIRDS && vantaRef.current) {
        vantaEffect.current = window.VANTA.BIRDS({
          el: vantaRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: true,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.00,
          scaleMobile: 1.00,
          backgroundColor: isDarkMode ? 0x111827 : 0xffffff,
          birdSize: 1.20,
          quantity: 1.00,
          separation: 40
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
  }, [isDarkMode]);

  // Close language menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target)) {
        setShowLanguageMenu(false);
      }
    };

    if (showLanguageMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLanguageMenu]);

  const handleLanguageChange = (lang) => {
    changeLanguage(lang);
    setShowLanguageMenu(false);
  };

  // If user is already logged in, redirect to dashboard
  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <SEO 
        title={t('landing.heroTitle')}
        description={t('landing.heroDescription')}
        keywords="online ta'lim, video darslar, universitet platformasi, topshiriqlar, baholar, Technical English"
      />
      <div className="landing-page">
        <div ref={vantaRef} className="vanta-background"></div>
        {/* Header */}
        <header className="landing-header">
          <div className="landing-container">
            <div className="landing-nav">
              <div className="landing-logo">
                <img src="/favicon.png" alt="Technical English" className="logo-icon" />
                <span className="logo-text">Technical English</span>
              </div>
              <div className="landing-nav-links">
                {/* Theme Toggle */}
                <button 
                  className="landing-icon-btn" 
                  onClick={toggleTheme} 
                  title={isDarkMode ? t('navbar.lightMode') : t('navbar.darkMode')}
                  aria-label={isDarkMode ? t('navbar.lightMode') : t('navbar.darkMode')}
                >
                  {isDarkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
                </button>

                {/* Language Selector */}
                <div className="landing-language-wrapper" ref={languageMenuRef}>
                  <button 
                    className="landing-icon-btn landing-language-btn" 
                    onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                    title={t('navbar.language')}
                    aria-label={t('navbar.language')}
                  >
                    <FiGlobe size={20} />
                    <span className="landing-language-code">{language.toUpperCase()}</span>
                    <FiChevronDown size={14} className={`landing-chevron ${showLanguageMenu ? 'open' : ''}`} />
                  </button>
                  
                  {showLanguageMenu && (
                    <div className="landing-language-dropdown">
                      <button 
                        className={`landing-language-option ${language === 'uz' ? 'active' : ''}`}
                        onClick={() => handleLanguageChange('uz')}
                      >
                        <span className="landing-language-flag">🇺🇿</span>
                        <span className="landing-language-name">{t('navbar.languageUz')}</span>
                        {language === 'uz' && <span className="landing-check-icon">✓</span>}
                      </button>
                      <button 
                        className={`landing-language-option ${language === 'en' ? 'active' : ''}`}
                        onClick={() => handleLanguageChange('en')}
                      >
                        <span className="landing-language-flag">🇬🇧</span>
                        <span className="landing-language-name">{t('navbar.languageEn')}</span>
                        {language === 'en' && <span className="landing-check-icon">✓</span>}
                      </button>
                      <button 
                        className={`landing-language-option ${language === 'ru' ? 'active' : ''}`}
                        onClick={() => handleLanguageChange('ru')}
                      >
                        <span className="landing-language-flag">🇷🇺</span>
                        <span className="landing-language-name">{t('navbar.languageRu')}</span>
                        {language === 'ru' && <span className="landing-check-icon">✓</span>}
                      </button>
                    </div>
                  )}
                </div>

                <Link to="/login" className="nav-link">{t('landing.login')}</Link>
                <Link to="/register" className="nav-link btn-primary">{t('landing.register')}</Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="landing-hero">
          <div className="landing-container">
            <div className="hero-content">
              <h1 className="hero-title">
                {t('landing.heroTitle')}
              </h1>
              <p className="hero-description">
                {t('landing.heroDescription')}
              </p>
              <div className="hero-buttons">
                <Link to="/register" className="btn btn-primary btn-large">
                  <FiUserPlus /> {t('landing.getStarted')}
                </Link>
                <Link to="/login" className="btn btn-secondary btn-large">
                  <FiLogIn /> {t('landing.signIn')}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="landing-features">
          <div className="landing-container">
            <h2 className="section-title">{t('landing.platformFeatures')}</h2>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <FiVideo />
                </div>
                <h3>{t('landing.videoLessons')}</h3>
                <p>{t('landing.videoLessonsDesc')}</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">
                  <FiFileText />
                </div>
                <h3>{t('landing.assignments')}</h3>
                <p>{t('landing.assignmentsDesc')}</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">
                  <FiBarChart2 />
                </div>
                <h3>{t('landing.gradesAnalytics')}</h3>
                <p>{t('landing.gradesAnalyticsDesc')}</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">
                  <FiUsers />
                </div>
                <h3>{t('landing.attendanceManagement')}</h3>
                <p>{t('landing.attendanceManagementDesc')}</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">
                  <FiBook />
                </div>
                <h3>{t('landing.courseResources')}</h3>
                <p>{t('landing.courseResourcesDesc')}</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">
                  <FiShield />
                </div>
                <h3>{t('landing.secureReliable')}</h3>
                <p>{t('landing.secureReliableDesc')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Google Sign-In Section */}
        <section className="landing-why-google">
          <div className="landing-container">
            <h2 className="section-title">{t('landing.whyGoogleSignIn')}</h2>
            <div className="why-google-content">
              <div className="why-google-text">
                <p>
                  {t('landing.whyGoogleDesc')}
                </p>
                <ul className="benefits-list">
                  <li>
                    <FiCheckCircle /> {t('landing.benefit1')}
                  </li>
                  <li>
                    <FiCheckCircle /> {t('landing.benefit2')}
                  </li>
                  <li>
                    <FiCheckCircle /> {t('landing.benefit3')}
                  </li>
                  <li>
                    <FiCheckCircle /> {t('landing.benefit4')}
                  </li>
                </ul>
                <p className="privacy-note">
                  {t('landing.privacyNote')}{' '}
                  <Link to="/privacy-policy">{t('landing.privacyPolicyLink')}</Link>
                  {' '}{t('landing.privacyNoteEnd')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="landing-cta">
          <div className="landing-container">
            <div className="cta-content">
              <h2>{t('landing.readyToGetStarted')}</h2>
              <p>{t('landing.ctaDescription')}</p>
              <div className="cta-buttons">
                <Link to="/register" className="btn btn-primary btn-large">
                  {t('landing.createAccount')} <FiArrowRight />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="landing-footer">
          <div className="landing-container">
            <div className="footer-content">
              <div className="footer-links">
                <Link to="/privacy-policy">{t('landing.privacyPolicy')}</Link>
                <Link to="/terms-of-service">{t('landing.termsOfService')}</Link>
                <a href="mailto:javohir.tayirovich@gmail.com">{t('landing.contactUs')}</a>
              </div>
            </div>
            <div className="footer-copyright">
              <p>&copy; 2026 Technical English. {t('landing.allRightsReserved')}.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Landing;

