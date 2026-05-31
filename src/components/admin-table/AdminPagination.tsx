'use client';

import * as React from 'react';

export type AdminPaginationProps = {
  currentPage: number;
  totalPages: number;
  totalCount?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
};

/**
 * Pattern F V1 — 테이블 하단 페이지네이션.
 * 시안: data/refact2/pages/pattern-f-admin-table-hifi.html § V1 footer
 *
 * "1–10 / 1,248건" + ‹ 1 2 3 ›
 */
export function AdminPagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize = 10,
  onPageChange,
  className,
}: AdminPaginationProps) {
  const classes = ['adm-pagination'];
  if (className) classes.push(className);

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalCount ?? currentPage * pageSize);
  const totalLabel = totalCount != null ? `${start}–${end} / ${totalCount.toLocaleString()}건` : null;

  // 표시할 페이지 범위 (현재 ± 2)
  const pages: number[] = [];
  const startP = Math.max(1, currentPage - 2);
  const endP = Math.min(totalPages, currentPage + 2);
  for (let p = startP; p <= endP; p++) pages.push(p);

  return (
    <div className={classes.join(' ')}>
      {totalLabel && <span className="total">{totalLabel}</span>}
      <div className="pages">
        <button
          type="button"
          className="pg-btn"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          ‹
        </button>
        {startP > 1 && (
          <>
            <button type="button" className="pg-btn" onClick={() => onPageChange(1)}>
              1
            </button>
            {startP > 2 && <span style={{ padding: '4px 4px', color: 'var(--ink-3)' }}>…</span>}
          </>
        )}
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            className={`pg-btn${p === currentPage ? ' on' : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}
        {endP < totalPages && (
          <>
            {endP < totalPages - 1 && (
              <span style={{ padding: '4px 4px', color: 'var(--ink-3)' }}>…</span>
            )}
            <button
              type="button"
              className="pg-btn"
              onClick={() => onPageChange(totalPages)}
            >
              {totalPages}
            </button>
          </>
        )}
        <button
          type="button"
          className="pg-btn"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          ›
        </button>
      </div>
    </div>
  );
}
