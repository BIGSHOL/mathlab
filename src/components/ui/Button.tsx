'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'editorial' | 'editorialOutline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-hover shadow-sm hover:shadow-md hover:-translate-y-0.5',
  secondary:
    'border-2 border-secondary text-secondary hover:bg-secondary hover:text-white',
  ghost: 'text-text-secondary hover:text-text-primary hover:bg-slate-100',
  danger:
    'bg-red-500 text-white hover:bg-red-600 shadow-sm hover:shadow-md hover:-translate-y-0.5',
  // 에디토리얼(V3 잉크/레드 톤) — 공개 표면(랜딩/데모/로그인) 전용
  editorial:
    'bg-[#121212] text-white hover:bg-[#BF1722] shadow-sm hover:shadow-md',
  editorialOutline:
    'border border-[#121212]/25 text-[#121212] hover:border-[#121212] hover:bg-[#121212]/[0.04]',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-4 text-[15px]',
  lg: 'h-[52px] px-6 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, className = '', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center font-bold rounded-sm
          transition-all duration-200 cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
