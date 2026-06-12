'use client';

import { useCountUp } from './useCountUp';
import { ABRIL, GRAY, INK, SANS } from './tokens';

/**
 * 다크 KPI 스트립 — V3 .v3-kpi-row 모티프 (#121212 밴드 + #333 세로 괘선 + Abril 카운트업 숫자).
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
  /** 숫자 색 (기본 #fff — V3 관례상 1개 amber, 1개 green 권장) */
  color?: string;
}

function StatCell({ item, className }: { item: StatItem; className: string }) {
  const { ref, value } = useCountUp(item.value);
  const num = Math.round(value).toLocaleString('ko-KR');
  return (
    <div className={`px-4 py-8 md:py-10 text-center border-[#333] ${className}`}>
      <p
        className="uppercase"
        style={{ fontFamily: SANS, fontSize: 11, letterSpacing: '0.14em', color: GRAY, fontWeight: 700, margin: 0 }}
      >
        {item.label}
      </p>
      <p
        ref={ref}
        style={{
          fontFamily: ABRIL,
          fontSize: 'clamp(38px, 4.5vw, 56px)',
          fontWeight: 900,
          color: item.color ?? '#fff',
          lineHeight: 1,
          margin: '12px 0 0',
        }}
      >
        {item.display ?? num}
        {item.suffix && (
          <span style={{ fontFamily: SANS, fontSize: 16, fontWeight: 700, color: GRAY, marginLeft: 5 }}>
            {item.suffix}
          </span>
        )}
      </p>
    </div>
  );
}

export function StatStrip({ items }: { items: StatItem[] }) {
  return (
    <section className="w-full" style={{ background: INK }}>
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4">
        {items.map((item, i) => {
          // 모바일 2×2: 좌측 열만 우측 괘선 + 첫 행 하단 괘선 / 데스크탑 4열: 마지막만 괘선 없음
          const borders = [
            i % 2 === 0 ? 'border-r' : 'md:border-r',
            i < 2 ? 'border-b md:border-b-0' : '',
            i === items.length - 1 ? 'md:border-r-0' : '',
          ].join(' ');
          return <StatCell key={item.label} item={item} className={borders} />;
        })}
      </div>
    </section>
  );
}
