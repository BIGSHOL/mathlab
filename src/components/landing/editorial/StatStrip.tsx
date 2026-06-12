'use client';

import { useCountUp } from './useCountUp';
import { BRAND_INK } from './brand';

/**
 * 다크 스탯 카드 — para-x .stats-card 모티프 (#13142B 라운드 카드 + 래디얼 오버레이 + 카운트업 숫자).
 * ⚠️ 수치는 검증 가능한 제품 사실만 (CLAUDE.md 12-5 — 시장 주장·더미 수치 금지).
 */

export interface StatItem {
  label: string;
  /** 카운트업 목표값. display 지정 시 무시. */
  value: number;
  /** 단위 (예: '교', '단계') */
  suffix?: string;
  /** 카운트업 대신 고정 표시 (예: '2~3분') */
  display?: string;
  /** true면 밝은 그라데이션 텍스트로 강조 (para-x .stat em 모티프) */
  highlight?: boolean;
}

function StatCell({ item }: { item: StatItem }) {
  const { ref, value } = useCountUp(item.value);
  const num = Math.round(value).toLocaleString('ko-KR');
  return (
    <div className="relative text-center">
      <p
        ref={ref}
        className={`m-0 font-extrabold tracking-[-0.03em] leading-none text-[clamp(30px,3.6vw,42px)] ${item.highlight ? 'brand-grad-text-light' : 'text-white'}`}
      >
        {item.display ?? num}
        {item.suffix && (
          <span className="text-[16px] font-bold text-white/45 ml-1">{item.suffix}</span>
        )}
      </p>
      <p className="m-0 mt-2 text-[13.5px] font-medium text-white/60">{item.label}</p>
    </div>
  );
}

export function StatStrip({ items }: { items: StatItem[] }) {
  return (
    <div
      className="relative overflow-hidden rounded-[24px] shadow-brand-lg px-6 py-11 grid grid-cols-2 md:grid-cols-4 gap-9 md:gap-8"
      style={{ background: BRAND_INK }}
    >
      {/* 래디얼 그라데이션 오버레이 (para-x .stats-card::before) */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 12% 0%, rgba(99,102,241,0.4), transparent 45%), radial-gradient(circle at 88% 100%, rgba(14,165,233,0.3), transparent 45%)',
        }}
      />
      {items.map((item) => (
        <StatCell key={item.label} item={item} />
      ))}
    </div>
  );
}
