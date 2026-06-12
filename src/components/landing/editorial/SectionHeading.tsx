import type { ReactNode } from 'react';

/** 에디토리얼 섹션 헤딩 — 레드 키커(.ed-kicker) + 세리프 헤드라인 + 보조 설명. */
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
      <span className="ed-kicker">{kicker}</span>
      <h2 className="ed-serif text-balance mt-5 text-[26px] md:text-[32px] font-bold leading-snug text-ed-ink">
        {title}
      </h2>
      {lede && (
        <p className="mt-3 text-[15px] text-[#555] leading-relaxed max-w-xl">{lede}</p>
      )}
    </div>
  );
}
