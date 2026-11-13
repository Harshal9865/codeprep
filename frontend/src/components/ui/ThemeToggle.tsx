import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, ChevronDown } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { THEME_OPTIONS } from '../../types/theme';

interface ThemeToggleProps {
  compact?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ compact = false, className = '' }) => {
  const { theme, themeMeta, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div ref={menuRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Switch color theme"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`group inline-flex items-center gap-2 rounded-full border border-border-default bg-surface-elevated hover:bg-surface-high text-text-secondary hover:text-text-primary transition-all duration-150 select-none ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-1.5 text-xs'
        }`}
      >
        <Palette className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="font-medium text-text-primary hidden sm:inline">
          {themeMeta.label}
        </span>
        <span className="flex items-center gap-0.5">
          <span
            className="w-2.5 h-2.5 rounded-full border border-border-default"
            style={{ backgroundColor: themeMeta.swatches[0] }}
          />
          <span
            className="w-2.5 h-2.5 rounded-full border border-border-default"
            style={{ backgroundColor: themeMeta.swatches[2] }}
          />
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 rounded-2xl bg-surface border border-border-default shadow-2xl z-50 overflow-hidden py-1.5"
        >
          <div className="px-3.5 py-2 border-b border-border-subtle flex items-center justify-between">
            <span className="text-xs font-semibold text-text-primary">Interface Theme</span>
            <span className="text-[11px] font-mono text-text-muted">Saved</span>
          </div>

          <div className="p-1.5 space-y-0.5">
            {THEME_OPTIONS.map((opt) => {
              const isSelected = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isSelected}
                  onClick={() => {
                    setTheme(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between gap-2.5 text-left transition-colors ${
                    isSelected
                      ? 'bg-primary-subtle border border-primary/35 text-text-primary'
                      : 'hover:bg-surface-elevated text-text-secondary hover:text-text-primary border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-lg border border-border-default flex items-center justify-center shrink-0"
                      style={{ backgroundColor: opt.swatches[0] }}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-sm"
                        style={{ backgroundColor: opt.swatches[2] }}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-text-primary truncate">
                        {opt.label}
                      </div>
                      <div className="text-[11px] text-text-muted truncate">
                        {opt.subtitle}
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
