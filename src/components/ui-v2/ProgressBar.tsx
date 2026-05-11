import * as React from 'react';

type ProgressVariant = 'default' | 'gold' | 'xp';
type ProgressSize = 'sm' | 'lg';

export type ProgressBarProps = {
  value: number;
  max?: number;
  variant?: ProgressVariant;
  size?: ProgressSize;
  className?: string;
  /** 0~max 범위 밖 값은 0~max 로 클램프 */
  clamp?: boolean;
};

/**
 * v2 디자인 시스템 ProgressBar.
 * mathlab-v2.css 의 .pbar .pbar.gold .pbar.xp .pbar.lg 매핑.
 */
export function ProgressBar({
  value,
  max = 100,
  variant = 'default',
  size = 'sm',
  className,
  clamp = true,
}: ProgressBarProps) {
  const safeMax = max <= 0 ? 100 : max;
  const raw = (value / safeMax) * 100;
  const percent = clamp ? Math.max(0, Math.min(100, raw)) : raw;

  const classes = ['pbar'];
  if (variant !== 'default') classes.push(variant);
  if (size === 'lg') classes.push('lg');
  if (className) classes.push(className);

  return (
    <div className={classes.join(' ')}>
      <i style={{ width: `${percent}%` }} />
    </div>
  );
}
