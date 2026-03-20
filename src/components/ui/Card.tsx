import { HTMLAttributes, forwardRef } from 'react';

type CardVariant = 'default' | 'glass';
type CardPadding = 'none' | 'sm' | 'base' | 'md' | 'lg';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  /** 표준 패딩: none=0, sm=p-3, base=p-4, md=p-5, lg=p-6 */
  padding?: CardPadding;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-surface border border-slate-200 shadow-soft',
  glass: 'glass-card shadow-sm',
};

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  base: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'none', className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-[var(--radius-card)] ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
