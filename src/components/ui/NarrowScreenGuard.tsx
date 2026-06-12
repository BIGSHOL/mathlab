'use client';

import { useState, useEffect } from 'react';
import { Maximize2 } from 'lucide-react';

interface NarrowScreenGuardProps {
  /** 이 폭 미만이면 경고 화면 표시 (기본 1024px) */
  minWidth?: number;
  /** 경고 문구에 쓰일 화면/기능 이름 (예: "기출 분석") */
  label?: string;
  children: React.ReactNode;
}

/**
 * 창 폭이 minWidth 미만이면 children 대신 "창을 넓혀주세요" 경고 화면을 표시.
 * 데스크탑 패널 레이아웃(사이드바+상세)처럼 좁은 화면에서 시인성이 크게 떨어지는 화면을 보호.
 *
 * - 측정 전(SSR/초기 1프레임)에는 children 렌더 → hydration 불일치 방지 (useEffect로 측정 후 전환)
 * - resize에 실시간 반응
 */
export function NarrowScreenGuard({ minWidth = 1024, label = '이 화면', children }: NarrowScreenGuardProps) {
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  if (width !== null && width < minWidth) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12 bg-brand-cream-2/50 min-h-0">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
          <Maximize2 className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">화면이 너무 좁습니다</h2>
        <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
          {label}은(는) 넓은 화면에 최적화되어 있습니다.<br />
          브라우저 창을 넓히거나 전체화면으로 전환해 주세요.
        </p>
        <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-white border border-slate-200 text-xs tabular-nums">
          <span className="text-slate-400">현재</span>
          <span className="font-bold text-rose-500">{width}px</span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-400">권장</span>
          <span className="font-bold text-slate-700">{minWidth}px 이상</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
