import * as React from 'react';

type CurrencyKind = 'streak' | 'coin' | 'gem' | 'heart';

const ICON: Record<CurrencyKind, string> = {
  streak: '🔥',
  coin: '🪙',
  gem: '💎',
  heart: '❤',
};

export type CurrencyChipProps = {
  kind: CurrencyKind;
  value: number | string;
  /** 아이콘을 커스텀으로 덮어쓸 때 */
  icon?: React.ReactNode;
  className?: string;
};

/**
 * v2 디자인 시스템 통화/스트릭 칩 (탑바 우측 메타).
 * mathlab-v2.css 의 .mt-currency.{streak|coin|gem|heart} 매핑.
 */
export function CurrencyChip({ kind, value, icon, className }: CurrencyChipProps) {
  const classes = ['mt-currency', kind];
  if (className) classes.push(className);
  const displayValue = typeof value === 'number' ? value.toLocaleString() : value;

  return (
    <span className={classes.join(' ')}>
      <span aria-hidden>{icon ?? ICON[kind]}</span>
      <span>{displayValue}</span>
    </span>
  );
}
