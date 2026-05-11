import * as React from 'react';
import { Card } from './Card';

export type StatTileProps = {
  label: string;
  value: React.ReactNode;
  valueUnit?: string;
  delta?: React.ReactNode;
  deltaColor?: 'success' | 'danger' | 'neutral';
  className?: string;
};

/**
 * v2 디자인 시스템 통계 타일.
 * mathlab-v2.css 의 .card.stat .label .value .delta 매핑.
 *
 * 사용 예:
 *   <StatTile label="총 학습 시간" value={14} valueUnit="시" delta="+2시간 ↑" />
 */
export function StatTile({
  label,
  value,
  valueUnit,
  delta,
  deltaColor = 'success',
  className,
}: StatTileProps) {
  const deltaStyle: React.CSSProperties | undefined =
    deltaColor === 'danger'
      ? { color: 'var(--danger)' }
      : deltaColor === 'neutral'
      ? { color: 'var(--ink-3)' }
      : undefined; // 'success' 는 .delta 기본 색 사용

  return (
    <Card className={`stat${className ? ' ' + className : ''}`}>
      <div className="label">{label}</div>
      <div className="value">
        {value}
        {valueUnit && (
          <span style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 600 }}>
            {valueUnit}
          </span>
        )}
      </div>
      {delta != null && <div className="delta" style={deltaStyle}>{delta}</div>}
    </Card>
  );
}
