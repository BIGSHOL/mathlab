import * as React from 'react';

type ProgressBarV2Variant = 'default' | 'gold' | 'xp' | 'success';
type ProgressBarV2Size = 'sm' | 'md' | 'lg';

export type ProgressBarV2Props = {
  value: number;
  max?: number;
  variant?: ProgressBarV2Variant;
  size?: ProgressBarV2Size;
  className?: string;
  /** 0~max 범위 밖 값은 0~max 로 클램프 */
  clamp?: boolean;
  /** true 면 "value / max" 라벨을 위쪽에 표시 */
  showLabel?: boolean;
  /** showLabel=true 일 때 기본 "value/max" 대신 사용할 라벨 */
  label?: React.ReactNode;
};

/**
 * v2 디자인 시스템 ProgressBar.
 * mathlab-v2.css 의 .pbar(.gold|.xp|.success|.md|.lg) 매핑.
 *
 * v1 `<ProgressBar>` 와 별개 컴포넌트 — v1은 color/showPercentage prop, v2는 variant/showLabel.
 */
export function ProgressBarV2({
  value,
  max = 100,
  variant = 'default',
  size = 'sm',
  className,
  clamp = true,
  showLabel = false,
  label,
}: ProgressBarV2Props) {
  const safeMax = max <= 0 ? 100 : max;
  const raw = (value / safeMax) * 100;
  const percent = clamp ? Math.max(0, Math.min(100, raw)) : raw;

  const classes = ['pbar'];
  if (variant !== 'default') classes.push(variant);
  if (size === 'md') classes.push('md');
  if (size === 'lg') classes.push('lg');
  if (className) classes.push(className);

  const bar = (
    <div className={classes.join(' ')}>
      <i style={{ width: `${percent}%` }} />
    </div>
  );

  if (!showLabel) return bar;

  return (
    <div className="pbar-wrap">
      <div className="pbar-label">{label ?? `${value} / ${safeMax}`}</div>
      {bar}
    </div>
  );
}
