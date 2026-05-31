'use client';

import * as React from 'react';

export type AdminFilterOption = {
  value: string;
  label: string;
};

export type AdminFilter = {
  id: string;
  label: string;
  value: string;
  options: AdminFilterOption[];
  onChange: (value: string) => void;
};

export type AdminFilterBarProps = {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  filters?: AdminFilter[];
  /** 검색/필터 우측 추가 슬롯 */
  rightSlot?: React.ReactNode;
  className?: string;
};

/**
 * Pattern F V1 — 검색 + select 필터 바.
 * 시안: data/refact2/pages/pattern-f-admin-table-hifi.html § V1 filterbar
 */
export function AdminFilterBar({
  searchPlaceholder = '🔍 검색',
  searchValue = '',
  onSearchChange,
  filters,
  rightSlot,
  className,
}: AdminFilterBarProps) {
  const classes = ['adm-filterbar'];
  if (className) classes.push(className);

  return (
    <div className={classes.join(' ')}>
      {onSearchChange && (
        <input
          type="text"
          className="search"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      )}
      {filters?.map((f) => (
        <React.Fragment key={f.id}>
          <span className="lb">{f.label}</span>
          <select value={f.value} onChange={(e) => f.onChange(e.target.value)}>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </React.Fragment>
      ))}
      {rightSlot && <div style={{ marginLeft: 'auto' }}>{rightSlot}</div>}
    </div>
  );
}

/* ──────────── Applied Chips ──────────── */

export type AppliedChip = {
  id: string;
  label: React.ReactNode;
  onRemove?: () => void;
};

export type AdminAppliedChipsProps = {
  chips: AppliedChip[];
  onClearAll?: () => void;
  className?: string;
};

/**
 * 적용 필터 chips (검색·필터 활성화 시 표시).
 */
export function AdminAppliedChips({ chips, onClearAll, className }: AdminAppliedChipsProps) {
  if (chips.length === 0) return null;
  const classes = ['adm-applied-bar'];
  if (className) classes.push(className);
  return (
    <div className={classes.join(' ')}>
      <span className="lb">적용 필터:</span>
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          className="chip on"
          onClick={c.onRemove}
        >
          {c.label}
          {c.onRemove && <span className="x">✕</span>}
        </button>
      ))}
      {onClearAll && (
        <button type="button" className="clr" onClick={onClearAll}>
          모두 지우기
        </button>
      )}
    </div>
  );
}
