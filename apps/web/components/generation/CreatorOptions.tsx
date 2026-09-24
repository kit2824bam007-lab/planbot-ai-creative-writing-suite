'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '../../store/chatStore';
import { CustomDropdown } from './CustomDropdown';
import { MediaUploader } from './MediaUploader';
import {
  PLATFORMS,
  STYLES,
  FORMATS,
  LANGUAGES,
} from '../../lib/panelOptions';

export const CreatorOptions: React.FC = () => {
  const { t } = useTranslation('generationPanel');
  const {
    platform,
    setPlatform,
    style,
    setStyle,
    format,
    setFormat,
    language,
    setLanguage,
  } = useChatStore();

  return (
    <div className="space-y-2 pt-1">
      {/* Media Upload (Images & Videos) */}
      <MediaUploader />

      {/* Configuration Dropdowns */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <CustomDropdown
        label={t('labels.platform')}
        value={platform}
        options={PLATFORMS}
        onChange={setPlatform}
        searchable
      />

      <CustomDropdown
        label={t('labels.style')}
        value={style}
        options={STYLES}
        onChange={setStyle}
        searchable
      />

      <CustomDropdown
        label={t('labels.format')}
        value={format}
        options={FORMATS}
        onChange={setFormat}
      />

      <CustomDropdown
        label={t('labels.language')}
        value={language}
        options={LANGUAGES}
        onChange={setLanguage}
      />
      </div>
    </div>
  );
};
