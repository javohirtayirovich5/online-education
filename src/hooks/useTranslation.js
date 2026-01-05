import { useLanguage } from '../contexts/LanguageContext';
import uzTranslations from '../locales/uz.json';
import enTranslations from '../locales/en.json';
import ruTranslations from '../locales/ru.json';

const translations = {
  uz: uzTranslations,
  en: enTranslations,
  ru: ruTranslations
};

export const useTranslation = () => {
  const { language } = useLanguage();

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      value = value?.[k];
      if (!value) {
        // Fallback to Uzbek if translation not found
        value = translations.uz;
        for (const k2 of keys) {
          value = value?.[k2];
        }
        break;
      }
    }
    
    return value || key;
  };

  return { t, language };
};

