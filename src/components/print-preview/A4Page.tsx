'use client';

import { A4_WIDTH_PX, A4_HEIGHT_PX } from '@/hooks/usePreviewScale';

interface A4PageProps {
  scale: number;
  children: React.ReactNode;
  /** A4 내부 패딩 클래스 (기본: px-12 py-10) */
  paddingClass?: string;
}

/** 스케일 적용 A4 페이지 래퍼 (미리보기 전용) */
export function A4Page({ scale, children, paddingClass = 'px-12 py-10' }: A4PageProps) {
  return (
    <div
      className="shrink-0 transition-[width,height] duration-150 ease-out"
      style={{
        width: `${A4_WIDTH_PX * scale}px`,
        height: `${A4_HEIGHT_PX * scale}px`,
      }}
    >
      <div
        className={`bg-white shadow-lg border border-slate-200 rounded-sm w-[210mm] h-[297mm] ${paddingClass} origin-top-left transition-transform duration-150 ease-out`}
        style={{ transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}

interface A4PrintPageProps {
  children: React.ReactNode;
  /** 마지막 페이지가 아닌 경우 페이지 브레이크 */
  pageBreak?: boolean;
  paddingClass?: string;
}

/** 인쇄 전용 A4 페이지 래퍼 */
export function A4PrintPage({ children, pageBreak = true, paddingClass = 'px-12 py-10' }: A4PrintPageProps) {
  return (
    <div
      className={`w-full h-[297mm] ${paddingClass}`}
      style={{ pageBreakAfter: pageBreak ? 'always' : 'auto' }}
    >
      {children}
    </div>
  );
}
