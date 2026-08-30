import * as React from 'react';

type CardV2Variant = 'default' | 'flat' | 'elev' | 'dark';

export type CardV2Props = {
  variant?: CardV2Variant;
  className?: string;
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'className' | 'children'>;

/**
 * v2 디자인 시스템 Card.
 * mathlab-v2.css 의 .card .card.flat .card.elev .card.dark 매핑.
 *
 * v1 `<Card>` 과 별개 컴포넌트 — v1은 padding/glass variant, v2는 flat/elev/dark variant.
 */
export function CardV2({ variant = 'default', className, children, ...rest }: CardV2Props) {
  const classes = ['card'];
  if (variant !== 'default') classes.push(variant);
  if (className) classes.push(className);
  return (
    <div className={classes.join(' ')} {...rest}>
      {children}
    </div>
  );
}

/** card-head — 제목 + 우측 액션 (v2 전용) */
export function CardV2Head({
  title,
  right,
  className,
}: {
  title: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`card-head${className ? ' ' + className : ''}`}>
      <h3>{title}</h3>
      {right ?? null}
    </div>
  );
}
