import * as React from 'react';

type ChipTone =
  | 'indigo'
  | 'navy'
  | 'success'
  | 'warn'
  | 'danger'
  | 'gray'
  | 'gold'
  | 'gem'
  | 'epic';

export type ChipProps = {
  tone: ChipTone;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

/**
 * v2 디자인 시스템 Chip (작은 라운드 라벨).
 * mathlab-v2.css 의 .chip.{indigo|navy|success|warn|danger|gray|gold|gem|epic} 매핑.
 */
export function Chip({ tone, className, style, children }: ChipProps) {
  const classes = ['chip', tone];
  if (className) classes.push(className);
  return <span className={classes.join(' ')} style={style}>{children}</span>;
}
