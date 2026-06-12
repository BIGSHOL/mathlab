import type { ReactNode } from 'react';

/**
 * 히어로 부유 카드 — para-x .float-card 모티프 (화이트 + 헤어라인 + md 그림자 + floaty).
 * 위치(absolute inset)와 모바일 숨김(hidden lg:block 등)은 호출부 className으로.
 */
export function FloatingCard({
  className = '', delay = 0, children,
}: {
  className?: string; delay?: number; children: ReactNode;
}) {
  return (
    <div
      className={`absolute z-10 bg-white rounded-[16px] border border-brand-line shadow-brand-md px-[18px] py-3.5 animate-brand-floaty ${className}`}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}
