'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DropdownOption {
  value: string;
  label: string;
  group?: string;
  isLocked?: boolean;
}

interface CustomDropdownProps {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (val: string) => void;
  searchable?: boolean;
  disabled?: boolean;
  lockNotice?: string;
  className?: string;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  label,
  value,
  options,
  onChange,
  searchable = false,
  disabled = false,
  lockNotice,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openUpward, setOpenUpward] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // If space below is less than 320px or if more vertical space is available above, pop upward
      setOpenUpward(spaceBelow < 320 || spaceBelow < rect.top);

      // Check horizontal edge collision
      const spaceRight = window.innerWidth - rect.left;
      setAlignRight(spaceRight < 280 && rect.right > 280);
    }
  }, [isOpen]);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (opt.group && opt.group.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Group options if group exists
  const groups: { [key: string]: DropdownOption[] } = {};
  filteredOptions.forEach((opt) => {
    const g = opt.group || 'Default';
    if (!groups[g]) groups[g] = [];
    groups[g].push(opt);
  });

  return (
    <div className={cn('relative flex flex-col gap-1', className)} ref={dropdownRef}>
      <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
        {label}
        {lockNotice && (
          <span title={lockNotice} className="inline-flex items-center text-amber-500">
            <Lock className="w-3 h-3" />
          </span>
        )}
      </label>

      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-xl border transition-all text-left',
          'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200',
          'hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20',
          disabled && 'opacity-60 cursor-not-allowed bg-zinc-100 dark:bg-zinc-800/50'
        )}
        title={selectedOption?.label || value}
      >
        <span className="truncate font-medium">{selectedOption?.label || value}</span>
        <ChevronDown className={cn('w-4 h-4 text-zinc-400 transition-transform duration-200 shrink-0', isOpen && 'rotate-180')} />
      </button>

      {isOpen && !disabled && (
        <div
          className={cn(
            'absolute z-50 w-full min-w-[240px] sm:min-w-[280px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-fade-in flex flex-col',
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
            alignRight ? 'right-0' : 'left-0'
          )}
        >
          {searchable && (
            <div className="p-2 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm z-10">
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-xs">
                <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search choices... / தேடுக..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none w-full text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400"
                  autoFocus
                />
              </div>
            </div>
          )}

          <div className="overflow-y-auto p-1.5 space-y-1 max-h-72 sm:max-h-80 overscroll-contain">
            {Object.keys(groups).map((groupName) => (
              <div key={groupName} className="mb-1">
                {groupName !== 'Default' && (
                  <div className="px-2 py-1 text-[11px] font-bold text-primary dark:text-primary-400 tracking-wide uppercase sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm z-10">
                    {groupName}
                  </div>
                )}
                {groups[groupName].map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                        setSearchQuery('');
                      }}
                      className={cn(
                        'flex items-center justify-between w-full px-2.5 py-1.5 text-xs rounded-lg transition-colors text-left gap-2',
                        isSelected
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      )}
                      title={opt.label}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))}

            {filteredOptions.length === 0 && (
              <div className="py-4 text-center text-xs text-zinc-400">
                No matching options
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
