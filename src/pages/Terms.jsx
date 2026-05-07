import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import SEO from '../components/common/SEO';
import LoadingSpinner from '../components/common/LoadingSpinner';
import './Terms.css';

const Terms = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [voices, setVoices] = useState([]);
  const [terms, setTerms] = useState([]);
  const [filteredTerms, setFilteredTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const getSpeechVoices = () => {
      if (!window?.speechSynthesis) {
        return;
      }

      const loadedVoices = window.speechSynthesis.getVoices();
      if (loadedVoices.length > 0) {
        setVoices(loadedVoices);
      }
    };

    getSpeechVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', getSpeechVoices);

    return () => {
      window.speechSynthesis?.removeEventListener('voiceschanged', getSpeechVoices);
    };
  }, []);

  useEffect(() => {
    const loadTerms = async () => {
      try {
        if (!currentUser) {
          throw new Error('User not authenticated');
        }

        const token = await currentUser.getIdToken();
        const response = await fetch(
          'https://us-central1-education-pro1.cloudfunctions.net/getTermsList',
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (!data.terms || !Array.isArray(data.terms)) {
          throw new Error('Invalid terms data format');
        }

        setTerms(data.terms);
        setFilteredTerms(data.terms);
      } catch (err) {
        setError(err.message);
        console.error('Load terms error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTerms();
  }, [currentUser]);

  const isFemaleVoice = (voice) => {
    if (!voice || !voice.name) {
      return false;
    }
    const label = `${voice.name} ${voice.voiceURI}`.toLowerCase();
    return /female|woman|zira|susan|sophia|eva|anna|olga|irina|oksana|alena|yaroslava|kate|kathleen|alexa|microsoft|google/.test(label);
  };

  const getVoiceForLang = (langCode) => {
    if (!voices.length) {
      return null;
    }

    const normalized = langCode.toLowerCase();
    const exactMatches = voices.filter((voice) => voice.lang.toLowerCase() === normalized);
    const preferredExact = exactMatches.find(isFemaleVoice) || exactMatches[0];
    if (preferredExact) {
      return preferredExact;
    }

    const prefix = normalized.split('-')[0];
    const fuzzyMatches = voices.filter((voice) => voice.lang.toLowerCase().startsWith(prefix));
    return fuzzyMatches.find(isFemaleVoice) || fuzzyMatches[0] || voices[0];
  };

  const speakText = (text, langCode) => {
    if (!text || typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.voice = getVoiceForLang(langCode);
    utterance.rate = 0.95;
    utterance.pitch = 1.05;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredTerms(terms);
    } else {
      const filterValue = searchTerm.toLowerCase();
      const filtered = terms.filter(term =>
        term.english.toLowerCase().includes(filterValue) ||
        term.russian.toLowerCase().includes(filterValue) ||
        term.uzbek.toLowerCase().includes(filterValue)
      );
      setFilteredTerms(filtered);
    }
  }, [searchTerm, terms]);

  if (loading) {
    return (
      <div className="terms-page">
        <div className="terms-container">
          <LoadingSpinner size="large" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="terms-page">
        <div className="terms-container">
          <div className="error-message">
            {t('terms.error_loading_terms') || 'Error loading terms'}: {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Terminlar - Technical English Online Education Platform"
        description="Texnik terminlar lug'ati. English, Russian va Uzbek tillarida."
        keywords="terminlar, glossary, technical terms, english, russian, uzbek"
      />
      <div className="terms-page">
        <div className="terms-container">
          <div className="terms-header">
            <div>
              <h1>{t('terms.title') || 'Terminlar'}</h1>
              <p className="terms-summary">
                {filteredTerms.length} {t('terms.results_label') || 'ta natija topildi'}
              </p>
            </div>
            <div className="search-container">
              <input
                type="text"
                placeholder={t('terms.search_terms') || 'Terminlarni qidirish...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          <div className="terms-table-wrapper">
            {filteredTerms.length === 0 ? (
              <div className="no-terms">
                {t('terms.no_terms_found') || 'Hech narsa topilmadi'}
              </div>
            ) : (
              <table className="terms-table">
                <thead>
                  <tr>
                    <th>{t('terms.table_header_index') || '#'}</th>
                    <th>{t('terms.table_header_english') || 'English'}</th>
                    <th>{t('terms.table_header_russian') || 'Русский'}</th>
                    <th>{t('terms.table_header_uzbek') || 'O‘zbek'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTerms.map((term, index) => (
                    <tr key={term.id || index}>
                      <td>{index + 1}</td>
                      <td>
                        <button
                          type="button"
                          className="speak-btn"
                          aria-label={t('terms.read_english') || 'Read English'}
                          onClick={() => speakText(term.english, 'en-US')}
                        >
                          🔊
                        </button>
                        <span>{term.english}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="speak-btn"
                          aria-label={t('terms.read_russian') || 'Read Russian'}
                          onClick={() => speakText(term.russian, 'ru-RU')}
                        >
                          🔊
                        </button>
                        <span>{term.russian}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="speak-btn"
                          aria-label={t('terms.read_uzbek') || 'Read Uzbek'}
                          onClick={() => speakText(term.uzbek, 'uz-UZ')}
                        >
                          🔊
                        </button>
                        <span>{term.uzbek}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Terms;