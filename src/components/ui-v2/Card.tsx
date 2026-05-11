import * as React from 'react';

type CardVariant = 'default' | 'flat' | 'elev' | 'dark';

export type CardProps = {
  variant?: CardVariant;
  className?: string;
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'className' | 'children'>;

/**
 * v2 디자인 시스템 Card.
 * mathlab-v2.css 의 .card .card.flat .card.elev .card.dark 매핑.
 */
export function Card({ variant = 'default', className, children, ...rest }: CardProps) {
  const classes = ['card'];
  if (variant !== 'default') classes.push(variant);
  if (className) classes.push(className);
  return (
    <div className={classes.join(' ')} {...rest}>
      {children}
    </div>
  );
}

/** card-head — 제목 + 우측 액션 */
export function CardHead({
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
