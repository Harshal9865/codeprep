import React from 'react';

interface StatusDotProps {
  status?: 'operational' | 'degraded' | 'down';
  label?: string;
  className?: string;
}

export const StatusDot: React.FC<StatusDotProps> = ({
  status = 'operational',
  label,
  className = '',
}) => {
  const colorMap = {
    operational: 'bg-emerald-500',
    degraded: 'bg-amber-500',
    down: 'bg-rose-500',
  };

  const pingMap = {
    operational: 'bg-emerald-400',
    degraded: 'bg-amber-400',
    down: 'bg-rose-400',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="relative flex h-2 w-2">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pingMap[status]}`}
        ></span>
        <span className={`relative inline-flex rounded-full h-2 w-2 ${colorMap[status]}`}></span>
      </span>
      {label && <span className="text-xs font-mono text-text-secondary">{label}</span>}
    </div>
  );
};

