'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'brand' | 'brandOutline';
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
  // 브랜드(para-x 인디고 그라데이션 톤) — 공개 표면(랜딩/데모/로그인) 전용
  brand:
    'text-white bg-[linear-gradient(100deg,#4F46E5,#7C3AED)] shadow-[0_8px_24px_rgba(79,70,229,0.35)] hover:shadow-[0_12px_32px_rgba(79,70,229,0.45)] hover:-translate-y-0.5 rounded-[14px]!',
  brandOutline:
    'border-[1.5px] border-[#13142B]/15 text-[#13142B] hover:border-[#13142B] hover:-translate-y-0.5 rounded-[14px]!',
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
