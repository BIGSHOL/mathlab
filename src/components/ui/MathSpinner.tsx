'use client';

interface MathSpinnerProps {
  /** sm=16px, md=24px, lg=32px */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

/**
 * Injaewon MathLAB 전용 로딩 스피너
 * 삼각형 → 사각형 → 원으로 부드럽게 모핑되는 기하학 애니메이션
 */
export function MathSpinner({ size = 'md', className = '' }: MathSpinnerProps) {
  return (
    <div
      className={`math-spinner bg-gradient-to-br from-primary to-brand-violet ${sizes[size]} ${className}`}
      role="status"
      aria-label="로딩 중"
    />
  );
}
