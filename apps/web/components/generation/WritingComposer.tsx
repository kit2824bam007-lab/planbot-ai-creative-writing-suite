'use client';

import React, { useRef, useEffect } from 'react';
import { GenerationPanel } from './GenerationPanel';
import { CompactComposer } from './CompactComposer';

export interface WritingComposerProps {
  hasMessages: boolean;
  isExpanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
}

export const WritingComposer: React.FC<WritingComposerProps> = ({
  hasMessages,
  isExpanded,
  onExpand,
  onCollapse
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside to collapse when conversation contains messages and composer is expanded
  useEffect(() => {
    if (!hasMessages || !isExpanded) return;

    const handlePointerDown = (e: PointerEvent | MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Do NOT collapse if clicked inside the composer container
      if (containerRef.current && containerRef.current.contains(target)) {
        return;
      }

      // Do NOT collapse if clicked inside any floating menus, dropdown portals, or dialogs
      if (
        target.closest?.(
          '[role="menu"], [role="listbox"], [role="dialog"], [data-radix-portal], [data-radix-popper-content-wrapper], .sonner-toast'
        )
      ) {
        return;
      }

      onCollapse();
    };

    // Use pointerdown for seamless desktop and mobile/touch support
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [hasMessages, isExpanded, onCollapse]);

  // STATE 1: New / Empty Chat -> Full composer in static layout
  if (!hasMessages) {
    return (
      <div className="shrink-0 max-w-4xl lg:max-w-5xl w-full mx-auto px-4 sm:px-6 transition-all duration-200 ease-in-out">
        <GenerationPanel />
      </div>
    );
  }

  // STATES 2 & 3: Chat has messages -> Sticky/fixed bottom composer with smooth transition
  return (
    <div
      ref={containerRef}
      className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none bg-gradient-to-t from-[#FAF8F5] via-[#FAF8F5]/90 to-transparent dark:from-[#131217] dark:via-[#131217]/90 pt-8 pb-4 sm:pb-6 px-4 sm:px-6 transition-all duration-200 ease-in-out"
    >
      <div className="max-w-4xl lg:max-w-5xl w-full mx-auto pointer-events-auto">
        <div className="transition-all duration-200 ease-out">
          {isExpanded ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
              <GenerationPanel
                onGenerate={onCollapse}
                autoFocus={true}
              />
            </div>
          ) : (
            <div className="animate-in fade-in duration-200">
              <CompactComposer
                onFocus={onExpand}
                onClick={onExpand}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
