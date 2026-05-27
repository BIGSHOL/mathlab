'use client';

import { useState, useRef, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface InfoTooltipProps {
  content: React.ReactNode;
}

/**
 * 도움말 아이콘 — 클릭 시 팝오버 표시 (hover 트리거 제거).
 * 사용자 피드백 (2026-05-27): hover 툴팁이 마우스에 가려서 항목 안 보임 → 클릭 팝업으로.
 * - 화면 중앙 모달 스타일 (position fixed, 큰 본문 영역, X 닫기 버튼)
 * - 외부 클릭/ESC 키로 닫기
 */
export function InfoTooltip({ content }: InfoTooltipProps) {
  const [show, setShow] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show) return;
    const clickHandler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setShow(false);
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShow(false);
    };
    document.addEventListener('mousedown', clickHandler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', clickHandler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [show]);

  return (
    <>
      <button
        type="button"
        onClick={() => setShow(true)}
        className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 flex items-center justify-center inline-flex shrink-0"
        aria-label="도움말 보기"
      >
        <HelpCircle className="w-3 h-3" />
      </button>
      {show && (
        <>
          {/* 백드롭 */}
          <div className="fixed inset-0 bg-black/40 z-[60]" />
          {/* 팝업 본문 */}
          <div
            ref={popoverRef}
            role="dialog"
            aria-modal="true"
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] w-[min(420px,calc(100vw-32px))] max-h-[80vh] overflow-y-auto bg-white text-slate-800 text-sm rounded-sm shadow-xl border border-slate-200"
          >
            <div className="flex items-start justify-between px-4 py-2.5 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">도움말</span>
              <button
                type="button"
                onClick={() => setShow(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 py-3 text-[13px] leading-relaxed">{content}</div>
          </div>
        </>
      )}
    </>
  );
}
