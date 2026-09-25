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
    <div className="space-y-3 pt-1">
      {/* Desktop 2-column layout: Media on left, platform controls on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* LEFT: Media Upload & Preview */}
        <div className="lg:col-span-5 bg-warm-50/60 dark:bg-zinc-900/40 p-3 rounded-2xl border border-stone-200/50 dark:border-zinc-800/60">
          <div className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
            Media Context
          </div>
          <MediaUploader />
        </div>

        {/* RIGHT: Configuration Dropdowns */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
    </div>
  );
};
