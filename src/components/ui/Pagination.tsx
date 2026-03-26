'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  compact?: boolean;
}

export function Pagination({ currentPage, totalPages, onPageChange, compact }: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  const visiblePages = pages.filter(
    (page) =>
      page === 1 ||
      page === totalPages ||
      Math.abs(page - currentPage) <= 1
  );

  const gap = compact ? 'gap-1' : 'gap-2';
  const btnSize = compact ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';
  const navPad = compact ? 'p-1' : 'p-2';
  const iconSize = compact ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <div className={`flex items-center ${gap}`}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className={`${navPad} rounded-sm border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
      >
        <ChevronLeft className={iconSize} />
      </button>
      {visiblePages.map((page, i) => {
        const prevPage = visiblePages[i - 1];
        const showEllipsis = prevPage && page - prevPage > 1;

        return (
          <div key={page} className={`flex items-center ${gap}`}>
            {showEllipsis && <span className="text-slate-400">...</span>}
            <button
              onClick={() => onPageChange(page)}
              className={`${btnSize} rounded-sm font-semibold transition-colors ${
                page === currentPage
                  ? 'bg-primary text-white'
                  : 'border border-slate-200 hover:bg-slate-50 text-text-secondary'
              }`}
            >
              {page}
            </button>
          </div>
        );
      })}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className={`${navPad} rounded-sm border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
      >
        <ChevronRight className={iconSize} />
      </button>
    </div>
  );
}
