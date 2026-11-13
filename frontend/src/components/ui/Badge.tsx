import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'easy' | 'medium' | 'hard' | 'neutral' | 'primary' | 'success';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2.5 py-0.5',
    md: 'text-xs px-3 py-1',
  };

  const variantStyles = {
    easy: 'text-[#00b8a3] bg-[#00b8a3]/15 font-medium',
    medium: 'text-[#ffa116] bg-[#ffa116]/15 font-medium',
    hard: 'text-[#ef4444] bg-[#ef4444]/15 font-medium',
    neutral: 'text-text-muted bg-[#ffffff10] font-normal',
    primary: 'text-[#ffa116] bg-[#ffa116]/15 font-medium',
    success: 'text-[#00b8a3] bg-[#00b8a3]/15 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full tracking-wide ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
