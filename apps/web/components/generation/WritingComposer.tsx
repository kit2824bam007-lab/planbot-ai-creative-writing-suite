'use client';

import React from 'react';
import { CompactComposer } from './CompactComposer';
import { OptionsDrawer } from './OptionsDrawer';

export interface WritingComposerProps {
  hasMessages: boolean;
  isExpanded?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
}

export const WritingComposer: React.FC<WritingComposerProps> = ({
  hasMessages
}) => {
  return (
    <>
      {/* Floating Pill Input Bar (Exact match to Reference Picture) */}
      <div className="shrink-0 w-full max-w-xl lg:max-w-2xl mx-auto px-3 sm:px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-5 pt-2 z-20">
        <CompactComposer
          placeholder={hasMessages ? 'Message DreamInk…' : 'Ask me anything…'}
        />
      </div>

      {/* Full Feature Drawer: Preserves ALL options, dropdowns, meters, and media uploaders */}
      <OptionsDrawer />
    </>
  );
};
