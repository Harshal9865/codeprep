import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  const [menuPos, setMenuPos] = useState<{ top: number; right: number }>({ top: 52, right: 16 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updateMenuPosition = useCallback(() => {
    const btn = triggerRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menuWidth = 256;
    const desiredRight = Math.max(8, window.innerWidth - rect.right);
    const maxRight = Math.max(8, window.innerWidth - menuWidth - 8);
    setMenuPos({
      top: Math.min(window.innerHeight - 16, rect.bottom + 8),
      right: Math.min(desiredRight, maxRight),
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(target))
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    const handleReposition = () => updateMenuPosition();

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen, updateMenuPosition]);

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!isOpen) updateMenuPosition();
          setIsOpen((prev) => !prev);
        }}
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

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            role="menu"
            style={{ top: `${menuPos.top}px`, right: `${menuPos.right}px` }}
            className="fixed w-64 rounded-2xl bg-surface border border-border-default shadow-2xl z-[9999] overflow-hidden py-1.5"
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
          </div>,
          document.body
        )}
    </div>
  );
};
