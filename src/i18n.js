import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import translationNO from './locales/no.json';
import translationEN from './locales/en.json';
import translationAR from './locales/ar.json';
import translationPL from './locales/pl.json';

const resources = {
  no: {
    translation: translationNO
  },
  en: {
    translation: translationEN
  },
  ar: {
    translation: translationAR
  },
  pl: {
    translation: translationPL
  }
};

i18n
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    resources,
    fallbackLng: 'no', // Default to Norwegian
    debug: false, // Set to true for debugging

    detection: {
      // Order of language detection
      order: ['localStorage', 'navigator'],
      // Cache user language
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false // React already escapes values
    }
  });

export default i18n;
