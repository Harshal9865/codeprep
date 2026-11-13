import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationBarProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

export const PaginationBar: React.FC<PaginationBarProps> = ({
  currentPage,
  totalItems,
  pageSize = 30,
  onPageChange,
  itemLabel = 'problems',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  const pageTokens = useMemo<(number | 'ellipsis-left' | 'ellipsis-right')[]>(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const tokens: (number | 'ellipsis-left' | 'ellipsis-right')[] = [1];
    const windowStart = Math.max(2, safePage - 1);
    const windowEnd = Math.min(totalPages - 1, safePage + 1);

    if (windowStart > 2) tokens.push('ellipsis-left');
    for (let p = windowStart; p <= windowEnd; p++) {
      tokens.push(p);
    }
    if (windowEnd < totalPages - 1) tokens.push('ellipsis-right');
    tokens.push(totalPages);
    return tokens;
  }, [safePage, totalPages]);

  const handleSelectPage = (page: number) => {
    if (page < 1 || page > totalPages || page === safePage) return;
    onPageChange(page);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border-subtle bg-surface-subtle/40 text-xs">
      <div className="font-mono text-text-muted">
        Showing <strong className="text-text-primary">{startItem}</strong>–
        <strong className="text-text-primary">{endItem}</strong> of{' '}
        <strong className="text-text-primary">{totalItems}</strong> {itemLabel}
        <span className="hidden md:inline"> ({pageSize} per page)</span>
      </div>

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleSelectPage(safePage - 1)}
            disabled={safePage <= 1}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border-subtle bg-surface-elevated text-text-secondary hover:text-text-primary hover:bg-surface-high disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          <div className="flex items-center gap-1 px-1">
            {pageTokens.map((token) => {
              if (token === 'ellipsis-left' || token === 'ellipsis-right') {
                return (
                  <span key={token} className="px-1.5 text-text-muted select-none font-mono">
                    ...
                  </span>
                );
              }
              const isActive = token === safePage;
              return (
                <button
                  key={token}
                  type="button"
                  onClick={() => handleSelectPage(token)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`min-w-[30px] h-7 px-2 rounded-lg font-mono text-xs transition-all ${
                    isActive
                      ? 'bg-primary text-black font-bold shadow-sm'
                      : 'border border-border-subtle bg-surface-elevated text-text-secondary hover:text-text-primary hover:bg-surface-high'
                  }`}
                >
                  {token}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => handleSelectPage(safePage + 1)}
            disabled={safePage >= totalPages}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border-subtle bg-surface-elevated text-text-secondary hover:text-text-primary hover:bg-surface-high disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </nav>
      )}
    </div>
  );
};

