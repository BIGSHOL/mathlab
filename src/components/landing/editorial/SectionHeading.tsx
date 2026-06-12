import type { ReactNode } from 'react';

/** 브랜드 섹션 헤딩 — 아이브로(.brand-eyebrow) + Pretendard 헤드라인 + 보조 설명 (para-x .sec-title 모티프). */
export function SectionHeading({
  kicker, title, lede, align = 'center',
}: {
  kicker: string;
  title: ReactNode;
  lede?: ReactNode;
  align?: 'center' | 'left';
}) {
  const alignCls = align === 'center' ? 'items-center text-center' : 'items-start text-left';
  return (
    <div className={`flex flex-col ${alignCls}`}>
      <span className="brand-eyebrow">{kicker}</span>
      <h2 className="text-balance mt-4 text-[28px] md:text-[40px] font-extrabold tracking-[-0.03em] leading-[1.25] text-brand-ink [word-break:keep-all]">
        {title}
      </h2>
      {lede && (
        <p className="mt-3.5 text-[16px] md:text-[17px] text-brand-ink-soft leading-relaxed max-w-xl">{lede}</p>
      )}
    </div>
  );
}
