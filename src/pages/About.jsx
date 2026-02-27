import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../contexts/AuthContext';
import { FiMail, FiExternalLink, FiBook, FiAward, FiMapPin, FiGithub, FiChevronRight } from 'react-icons/fi';
import './About.css';

const About = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    setIsVisible(true);
    
    // Initialize AOS
    AOS.init({
      duration: 1000,
      once: false,
      offset: 100,
      disable: 'mobile'
    });
    
    const handleScroll = () => {
      setScrollY(window.scrollY);
      AOS.refresh();
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="about-container">
      {/* Breadcrumb - Show only for unauthenticated users */}
      {!currentUser && (
        <nav className="breadcrumb">
          <div className="breadcrumb-content">
            <Link to="/" className="breadcrumb-link">{t('common.backToHome')}</Link>
            <FiChevronRight size={18} className="breadcrumb-separator" />
            <span className="breadcrumb-current">{t('about.breadcrumb')}</span>
          </div>
        </nav>
      )}

      {/* Hero Section */}
      <section className="about-hero">
        <div className="hero-background">
          <div className="gradient-blur blur-1"></div>
          <div className="gradient-blur blur-2"></div>
          <div className="gradient-blur blur-3"></div>
        </div>
        
        <div className="hero-content">
          <h1 className={`hero-title ${isVisible ? 'fade-in-up' : ''}`} data-aos="fade-up" data-aos-duration="1200">
            {t('about.heroTitle')}
          </h1>
        </div>
      </section>

      {/* Founder Profile Section */}
      <section className="founder-section">
        <div className="founder-container">
          {/* Profile Card */}
          <div className={`profile-card ${isVisible ? 'slide-in-left' : ''}`} data-aos="fade-right" data-aos-duration="1200" data-aos-delay="100">
            <div className="profile-image-wrapper">
              <div className="image-border"></div>
              <img 
                src="./images/founder.png" 
                alt="Khamidova Nilufar" 
                className="profile-image"
              />
              <div className="image-overlay"></div>
            </div>
                    {/* Bio */}
            <div className="bio-section">
              <p>
                {t('about.bioText')}
              </p>
            </div>
          </div>

          {/* Profile Info */}
          <div className={`profile-info ${isVisible ? 'slide-in-right' : ''}`} data-aos="fade-left" data-aos-duration="1200" data-aos-delay="100">
            <div className="info-header">
              <h2 className="founder-name">{t('about.founderName')}</h2>
              <p className="founder-title">{t('about.founderTitle')}</p>
            </div>

            {/* Credentials */}
            <div className="credentials">
              <div className="credential-item"   data-aos="fade-in"
                data-aos-duration="800">
                <div className="credential-icon">
                  <FiAward />
                </div>
                <div className="credential-text">
                  <h4>{t('about.credentials.degree')}</h4>
                  <p>{t('about.credentials.degreeValue')}</p>
                </div>
              </div>

              <div className="credential-item"   data-aos="fade-in"
                data-aos-duration="800">
                <div className="credential-icon">
                  <FiMapPin />
                </div>
                <div className="credential-text">
                  <h4>{t('about.credentials.institution')}</h4>
                  <p>{t('about.credentials.institutionValue')}</p>
                </div>
              </div>

              <div className="credential-item"   data-aos="fade-in"
                data-aos-duration="800">
                <div className="credential-icon">
                  <FiBook />
                </div>
                <div className="credential-text">
                  <h4>{t('about.credentials.field')}</h4>
                  <p>{t('about.credentials.fieldValue')}</p>
                </div>
              </div>
            </div>

            {/* Contact & Links */}
            <div className="contact-section">
              <h3>{t('about.contact')}</h3>
              
              <div className="contact-links">
                <a 
                  href="mailto:nilufarxamidova26@gmail.com" 
                  className="contact-link email-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FiMail />
                  <span>{t('about.email')}</span>
                </a>

                <a 
                  href="https://scholar.google.com/citations?hl=ru&user=8xkPnW8AAAAJ&view_op=list_works&sortby=title" 
                  className="contact-link scholar-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FiExternalLink />
                  <span>{t('about.scholarProfile')}</span>
                </a>
              </div>
            </div>

    
          </div>
        </div>
      </section>

      {/* Research & Publications */}
      <section className="research-section">
        <div className="section-header" data-aos="fade-up" data-aos-duration="1000">
          <h2>{t('about.publications.title')}</h2>
          <p>{t('about.publications.count')}</p>
        </div>

        <div className="publications-list">
          {[
            {
              title: '"CRUEL REALISM" AND THE STYLE OF WRITER',
              url: 'https://scholar.google.com/citations?view_op=view_citation&hl=ru&user=8xkPnW8AAAAJ&citation_for_view=8xkPnW8AAAAJ:0EnyYjriUFMC'
            },
            {
              title: 'On the role of motivation and ways to improve it',
              url: 'https://scholar.google.com/citations?view_op=view_citation&hl=ru&user=8xkPnW8AAAAJ&citation_for_view=8xkPnW8AAAAJ:KlAtU1dfN6UC'
            },
            {
              title: 'Effective methods of teaching English to engineering students',
              url: 'https://scholar.google.com/citations?view_op=view_citation&hl=ru&user=8xkPnW8AAAAJ&citation_for_view=8xkPnW8AAAAJ:2osOgNQ5qMEC'
            },
            {
              title: 'EPIC HERO AND HIS IMAGE',
              url: 'https://scholar.google.com/citations?view_op=view_citation&hl=ru&user=8xkPnW8AAAAJ&citation_for_view=8xkPnW8AAAAJ:WF5omc3nYNoC'
            },
            {
              title: 'ANALYSIS OF THE CHARACTER OF IMAGES IN PROSE WORKS',
              url: 'https://scholar.google.com/citations?view_op=view_citation&hl=ru&user=8xkPnW8AAAAJ&citation_for_view=8xkPnW8AAAAJ:eQOLeE2rZwMC'
            },
            {
              title: 'ARTISTIC FICTION IS AN IMPORTANT CRITERIA',
              url: 'https://scholar.google.com/citations?view_op=view_citation&hl=ru&user=8xkPnW8AAAAJ&citation_for_view=8xkPnW8AAAAJ:Y0pCki6q_DkC'
            },
            {
              title: 'ARTISTIC INTENT AND ARTISTIC FORM',
              url: 'https://scholar.google.com/citations?view_op=view_citation&hl=ru&user=8xkPnW8AAAAJ&citation_for_view=8xkPnW8AAAAJ:Tyk-4Ss8FVUC'
            },
            {
              title: 'DESCRIPTION OF THE CHARACTER OF THE HERO',
              url: 'https://scholar.google.com/citations?view_op=view_citation&hl=ru&user=8xkPnW8AAAAJ&citation_for_view=8xkPnW8AAAAJ:YsMSGLbcyi4C'
            },
            {
              title: 'DYNAMICS OF DEVELOPMENT OF SCIENTIFIC TERMS',
              url: 'https://scholar.google.com/citations?view_op=view_citation&hl=ru&user=8xkPnW8AAAAJ&citation_for_view=8xkPnW8AAAAJ:u5HHmVD_uO8C'
            },
            {
              title: 'Effective Methods in Teaching Grammar',
              url: 'https://scholar.google.com/citations?view_op=view_citation&hl=ru&user=8xkPnW8AAAAJ&citation_for_view=8xkPnW8AAAAJ:UeHWp8X0CEIC'
            },
            {
              title: 'EFFECTIVE PEDAGOGICAL METHODS IN TEACHING ESP',
              url: 'https://scholar.google.com/citations?view_op=view_citation&hl=ru&user=8xkPnW8AAAAJ&citation_for_view=8xkPnW8AAAAJ:u-x6o8ySG0sC'
            },
            {
              title: 'Features of phraseological units in linguoculture',
              url: 'https://scholar.google.com/citations?view_op=view_citation&hl=ru&user=8xkPnW8AAAAJ&citation_for_view=8xkPnW8AAAAJ:_kc_bZDykSQC'
            },
            {
              title: 'History of the study of phraseological units',
              url: 'https://scholar.google.com/citations?view_op=view_citation&hl=ru&user=8xkPnW8AAAAJ&citation_for_view=8xkPnW8AAAAJ:YOwf2qJgpHMC'
            },
            {
              title: 'The problem of the national hero (Monograph)',
              url: 'https://scholar.google.com/citations?view_op=view_citation&hl=ru&user=8xkPnW8AAAAJ&citation_for_view=8xkPnW8AAAAJ:hqOjcs7Dif8C'
            },
            {
              title: 'Eliminating interference difficulties in teaching',
              url: 'https://scholar.google.com/citations?view_op=view_citation&hl=ru&user=8xkPnW8AAAAJ&citation_for_view=8xkPnW8AAAAJ:qjMakFHDy7sC'
            },
            {
              title: 'PORTRAIT AND THE WRITER\'S INTENT',
              url: 'https://scholar.google.com/citations?view_op=view_citation&hl=ru&user=8xkPnW8AAAAJ&citation_for_view=8xkPnW8AAAAJ:_FxGoFyzp5QC'
            },
            {
              title: 'SHUKUR KHOLMIRZAEV – PERSON AND SOCIETY\'S ILLNESSES',
              url: 'https://scholar.google.com/citations?view_op=view_citation&hl=ru&user=8xkPnW8AAAAJ&citation_for_view=8xkPnW8AAAAJ:LkGwnXOMwfcC'
            },
            {
              title: 'SHUKUR KHOLMIRZAEV\'S SKILLS OF NATIONAL CHARACTER',
              url: 'https://scholar.google.com/citations?view_op=view_citation&hl=ru&user=8xkPnW8AAAAJ&citation_for_view=8xkPnW8AAAAJ:UebtZRa9Y70C'
            },
            {
              title: 'SPIRIT OF THE TIMES AND MATTERS OF JUSTICE',
              url: 'https://scholar.google.com/citations?view_op=view_citation&hl=ru&user=8xkPnW8AAAAJ&citation_for_view=8xkPnW8AAAAJ:roLk4NBRz8UC'
            },
            {
              title: 'THE CHARACTER OF TUKLIBOY KUCHKAROV IN "OLABUJI"',
              url: 'https://scholar.google.com/citations?view_op=view_citation&hl=ru&user=8xkPnW8AAAAJ&citation_for_view=8xkPnW8AAAAJ:zYLM7Y9cAGgC'
            },
            {
              title: 'THE IMPLEMENTATION OF BLENDED LEARNING APPROACH',
              url: 'https://scholar.google.com/citations?view_op=view_citation&hl=ru&user=8xkPnW8AAAAJ&citation_for_view=8xkPnW8AAAAJ:4TOpqqG69KYC'
            },
            {
              title: 'THE SPECIFICITY OF THE FIGURATIVE IMAGE',
              url: 'https://scholar.google.com/citations?view_op=view_citation&hl=ru&user=8xkPnW8AAAAJ&citation_for_view=8xkPnW8AAAAJ:5nxA0vEk-isC'
            },
            {
              title: 'Belarus International scientific-online conference',
              url: 'https://scholar.google.com/citations?view_op=view_citation&hl=ru&user=8xkPnW8AAAAJ&citation_for_view=8xkPnW8AAAAJ:d1gkVwhDpl0C'
            },
            {
              title: 'Effectively engaging text as a basic unit of communication',
              url: 'https://scholar.google.com/citations?view_op=view_citation&hl=ru&user=8xkPnW8AAAAJ&citation_for_view=8xkPnW8AAAAJ:Zph67rFs4hoC'
            },
            {
              title: 'Experiencing upcoming approaches while teaching foreign language',
              url: 'https://scholar.google.com/citations?view_op=view_citation&hl=ru&user=8xkPnW8AAAAJ&citation_for_view=8xkPnW8AAAAJ:9yKSN-GCB0IC'
            },
            {
              title: 'Features of phraseological units in linguoculture (Scientific papers)',
              url: 'https://scholar.google.com/citations?view_op=view_citation&hl=ru&user=8xkPnW8AAAAJ&citation_for_view=8xkPnW8AAAAJ:ULOm3_A8WrAC'
            },
            {
              title: 'INTERPRETATION OF IMAGE AND CHARACTERS IN "THE LAST STATION"',
              url: 'https://scholar.google.com/citations?view_op=view_citation&hl=ru&user=8xkPnW8AAAAJ&citation_for_view=8xkPnW8AAAAJ:Se3iqnhoufwC'
            },
            {
              title: 'Speech exercises as a necessary component of the formation...',
              url: 'https://scholar.google.com/citations?view_op=view_citation&hl=ru&user=8xkPnW8AAAAJ&citation_for_view=8xkPnW8AAAAJ:3fE2CSJIrl8C'
            },
            {
              title: 'The artistic and stylistic uniqueness of Shukur Kholmirzayev\'s stories',
              url: 'https://scholar.google.com/citations?view_op=view_citation&hl=ru&user=8xkPnW8AAAAJ&citation_for_view=8xkPnW8AAAAJ:8k81kl-MbHgC'
            },
            {
              title: 'The origin of the category of intensity in linguistics',
              url: 'https://scholar.google.com/citations?view_op=view_citation&hl=ru&user=8xkPnW8AAAAJ&citation_for_view=8xkPnW8AAAAJ:kNdYIx-mwKoC'
            }
          ].map((pub, idx) => (
            <a
              key={idx}
              href={pub.url}
              target="_blank"
              rel="noopener noreferrer"
              className="publication-item"
              data-aos="fade-up"
              data-aos-duration="400"
              data-aos-delay={`${idx % 3 * 100}`}
            >
              <div className="pub-number">{idx + 1}</div>
              <div className="pub-content">
                <p className="pub-title">{pub.title}</p>
                <div className="pub-link">
                  <FiExternalLink size={14} />
                  <span>{t('about.publications.viewOnScholar')}</span>
                </div>
              </div>
            </a>
          ))}
        </div>

        <div className="scholar-cta" data-aos="fade-up" data-aos-duration="700" data-aos-delay="100">
          <p>{t('about.publications.cta')}</p>
          <a 
            href="https://scholar.google.com/citations?hl=ru&user=8xkPnW8AAAAJ&view_op=list_works&sortby=title"
            target="_blank"
            rel="noopener noreferrer"
            className="scholar-cta-button"
          >
            {t('about.publications.ctaButton')}
          </a>
        </div>
      </section>

      {/* Developer Support Section */}
      <section className="developer-section">
        <div className="developer-container">
          <h3 className="developer-title" data-aos="fade-up" data-aos-duration="500">{t('about.developer.title')}</h3>
          <div className="developer-card" data-aos="fade-up" data-aos-duration="500" data-aos-delay="100">
            <div className="developer-header">
              <FiGithub size={24} className="developer-icon" />
              <div className="developer-info">
                <h4 className="developer-name">{t('about.developer.name')}</h4>
                <p className="developer-subtitle">{t('about.developer.subtitle')}</p>
              </div>
            </div>
            
            <div className="developer-contacts">
              <a 
                href={`mailto:${t('about.developer.email')}`}
                className="contact-link email-link"
                data-aos="fade-left"
                data-aos-duration="800"
                data-aos-delay="200"
              >
                <FiMail size={18} />
                <span>{t('about.developer.email')}</span>
              </a>
              
              <a 
                href={`https://t.me/${t('about.developer.telegram')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-link telegram-link"
                data-aos="fade-left"
                data-aos-duration="800"
                data-aos-delay="300"
              >
<svg width="18px" height="18px" viewBox="0 0 0.54 0.54" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink"><title>telegram_line</title><g id="#" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd"><g id="Brand" transform="translate(-672)"><g id="telegram_line" transform="translate(672)"><path d="M0.54 0v0.54H0V0zM0.283 0.523l0 0 -0.002 0.001 0 0 0 0 -0.002 -0.001q0 0 -0.001 0l0 0 0 0.01 0 0 0 0 0.002 0.002 0 0 0 0 0.002 -0.002 0 0 0 0 0 -0.01q0 0 0 0m0.006 -0.003 0 0 -0.004 0.002 0 0 0 0 0 0.01 0 0 0 0 0.005 0.002q0 0 0.001 0l0 0 -0.001 -0.014q0 0 0 0m-0.016 0a0 0 0 0 0 -0.001 0l0 0 -0.001 0.014q0 0 0 0.001l0 0 0.005 -0.002 0 0 0 0 0 -0.01 0 0 0 0z" id="MingCute" fillRule="nonzero"/><path d="M0.491 0.136a0.034 0.034 0 0 0 -0.046 -0.037l-0.385 0.162c-0.027 0.011 -0.028 0.05 0 0.062a1.282 1.282 0 0 0 0.085 0.032c0.026 0.009 0.055 0.017 0.078 0.019 0.006 0.008 0.014 0.015 0.022 0.021 0.012 0.01 0.027 0.021 0.042 0.031 0.031 0.02 0.065 0.039 0.088 0.052 0.027 0.015 0.06 -0.002 0.065 -0.032zM0.103 0.292l0.34 -0.143 -0.048 0.289c-0.022 -0.012 -0.055 -0.031 -0.084 -0.049a0.45 0.45 0 0 1 -0.038 -0.028 0.18 0.18 0 0 1 -0.01 -0.008l0.089 -0.089a0.022 0.022 0 0 0 -0.032 -0.032L0.224 0.329c-0.017 -0.002 -0.04 -0.008 -0.065 -0.017a1.103 1.103 0 0 1 -0.056 -0.02" id="#" fill="var(--primary)"/></g></g></g></svg>
                <span>{t('about.developer.telegram')}</span>
              </a>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default About;
