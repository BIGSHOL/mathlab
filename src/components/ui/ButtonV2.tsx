import * as React from 'react';

type ButtonV2Variant = 'default' | 'primary' | 'gold' | 'ghost';
type ButtonV2Size = 'md' | 'lg' | 'xl';

export type ButtonV2Props = {
  variant?: ButtonV2Variant;
  size?: ButtonV2Size;
  className?: string;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * v2 디자인 시스템 Button.
 * mathlab-v2.css 의 .btn .btn.primary .btn.gold .btn.ghost .btn.lg .btn.xl 매핑.
 *
 * v1 `<Button>` 과 별개 컴포넌트 — v1은 Tailwind class 기반, v2는 mathlab-v2.css 클래스 기반.
 * v2 디자인 시안 페이지에서 사용. v1 사용처는 그대로 v1 `<Button>` 유지.
 */
export function ButtonV2({
  variant = 'default',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonV2Props) {
  const classes = ['btn'];
  if (variant !== 'default') classes.push(variant);
  if (size !== 'md') classes.push(size);
  if (className) classes.push(className);

  return (
    <button className={classes.join(' ')} {...rest}>
      {children}
    </button>
  );
}
