'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enGenerationPanel from './locales/en/generationPanel.json';
import taGenerationPanel from './locales/ta/generationPanel.json';

const resources = {
  en: {
    generationPanel: enGenerationPanel,
  },
  ta: {
    generationPanel: taGenerationPanel,
  },
};

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: 'en',
      fallbackLng: 'en',
      ns: ['generationPanel'],
      defaultNS: 'generationPanel',
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });
}

export default i18n;
