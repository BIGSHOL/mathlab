import type { ReactNode } from 'react';

/**
 * 히어로 부유 카드 — 페이퍼 그림자 + CSS floaty(컴포지터 애니메이션, reduced-motion 무효화).
 * 위치(absolute inset)와 모바일 숨김(hidden lg:block 등)은 호출부 className으로.
 */
export function FloatingCard({
  className = '', delay = 0, children,
}: {
  className?: string; delay?: number; children: ReactNode;
}) {
  return (
    <div
      className={`absolute z-10 bg-white rounded-[4px] shadow-ed-float px-4 py-3 animate-ed-floaty ${className}`}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}
