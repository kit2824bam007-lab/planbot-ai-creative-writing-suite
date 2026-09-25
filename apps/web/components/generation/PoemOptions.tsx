'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '../../store/chatStore';
import { CustomDropdown } from './CustomDropdown';
import {
  POEM_TYPES,
  TONES,
  LANGUAGES,
  LENGTHS,
  TAMIL_CLASSICAL_FORMS,
} from '../../lib/panelOptions';

export const PoemOptions: React.FC = () => {
  const { t } = useTranslation('generationPanel');
  const {
    poemType,
    setPoemType,
    tone,
    setTone,
    language,
    setLanguage,
    length,
    setLength,
  } = useChatStore();

  const handlePoemTypeChange = (newType: string) => {
    setPoemType(newType);
    if (TAMIL_CLASSICAL_FORMS.includes(newType)) {
      setLanguage('ta');
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 pt-2">
      <CustomDropdown
        label={t('labels.poemType')}
        value={poemType}
        options={POEM_TYPES}
        onChange={handlePoemTypeChange}
        searchable
      />

      <CustomDropdown
        label={t('labels.tone')}
        value={tone}
        options={TONES}
        onChange={setTone}
        searchable
      />

      <CustomDropdown
        label={t('labels.language')}
        value={language}
        options={LANGUAGES}
        onChange={setLanguage}
      />

      <CustomDropdown
        label={t('labels.length')}
        value={length}
        options={LENGTHS}
        onChange={(val) => setLength(val as any)}
      />
    </div>
  );
};
