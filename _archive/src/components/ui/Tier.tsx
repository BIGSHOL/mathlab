import * as React from 'react';

type TierType = 'bronze' | 'silver' | 'gold' | 'plat' | 'diamond' | 'master' | 'legend';

export type TierProps = {
  tier: TierType;
  className?: string;
  children: React.ReactNode;
};

/**
 * v2 디자인 시스템 Tier 배지 (랭크/리그 표시).
 * mathlab-v2.css 의 .tier.{bronze|silver|gold|plat|diamond|master|legend} 매핑.
 * 그라데이션 배경 + 흰 글자.
 */
export function Tier({ tier, className, children }: TierProps) {
  const classes = ['tier', tier];
  if (className) classes.push(className);
  return <span className={classes.join(' ')}>{children}</span>;
}
