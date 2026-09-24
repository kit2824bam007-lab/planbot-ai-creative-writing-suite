'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '../../store/chatStore';
import { CustomDropdown } from './CustomDropdown';
import {
  GENRES,
  TONES,
  LANGUAGES,
  STORY_LENGTHS,
} from '../../lib/panelOptions';

export const StoryOptions: React.FC = () => {
  const { t } = useTranslation('generationPanel');
  const {
    genre,
    setGenre,
    tone,
    setTone,
    language,
    setLanguage,
    length,
    setLength,
  } = useChatStore();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
      <CustomDropdown
        label={t('labels.genre')}
        value={genre}
        options={GENRES}
        onChange={setGenre}
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
        options={STORY_LENGTHS}
        onChange={(val) => setLength(val as any)}
      />
    </div>
  );
};
