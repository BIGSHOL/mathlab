import * as React from 'react';

type ButtonVariant = 'default' | 'primary' | 'gold' | 'ghost';
type ButtonSize = 'md' | 'lg' | 'xl';

export type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * v2 디자인 시스템 Button.
 * mathlab-v2.css 의 .btn .btn.primary .btn.gold .btn.ghost .btn.lg .btn.xl 매핑.
 */
export function Button({
  variant = 'default',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonProps) {
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
