import * as React from 'react';

export type AdminStatItem = {
  label: string;
  value: React.ReactNode;
  delta?: React.ReactNode;
  deltaTone?: 'up' | 'warn' | 'danger' | 'neutral';
  /** 강조 — 노란 배경 */
  highlight?: boolean;
};

export type AdminStatsRowProps = {
  stats: AdminStatItem[];
  /** 그리드 열 수 (기본 = stats.length, 4 또는 5 권장) */
  cols?: 4 | 5;
  className?: string;
};

/**
 * Pattern F — 어드민 페이지 상단 통계 카드 행.
 * 시안: data/refact2/pages/admin-tenants.html § A1 m-card 4 grid
 *
 * 예: 총 지점 142 · 활성 128 · 체험중 9 · 만료 임박 5
 */
export function AdminStatsRow({ stats, cols, className }: AdminStatsRowProps) {
  const colCount = cols ?? (stats.length === 5 ? 5 : 4);
  const classes = ['adm-stats-row', `cols-${colCount}`];
  if (className) classes.push(className);

  return (
    <div className={classes.join(' ')}>
      {stats.map((s, i) => (
        <div key={i} className={`adm-stat${s.highlight ? ' warn' : ''}`}>
          <div className="lb">{s.label}</div>
          <div className="v">{s.value}</div>
          {s.delta != null && (
            <div className={`delta${s.deltaTone ? ' ' + s.deltaTone : ''}`}>{s.delta}</div>
          )}
        </div>
      ))}
    </div>
  );
}
