import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  actionIcon?: React.ReactNode;
  onActionClick?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, actionIcon, onActionClick, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-[11px] font-mono tracking-wider text-text-muted font-medium uppercase">
            {label}
          </label>
        )}
        <div className="relative rounded-xl">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`block w-full rounded-xl text-xs transition-colors duration-150 bg-surface-elevated text-text-primary placeholder:text-text-muted focus:outline-none focus:bg-surface-high border border-border-subtle focus:border-primary/60 ${
              icon ? 'pl-10' : 'pl-3.5'
            } ${actionIcon ? 'pr-10' : 'pr-3.5'} py-2 ${
              error
                ? 'border-danger text-danger'
                : ''
            } ${className}`}
            {...props}
          />
          {actionIcon && (
            <button
              type="button"
              onClick={onActionClick}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-text-primary focus:outline-none"
              tabIndex={-1}
            >
              {actionIcon}
            </button>
          )}
        </div>
        {error ? (
          <p className="text-xs text-[#ef4444] font-mono tracking-tight">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-text-muted">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
