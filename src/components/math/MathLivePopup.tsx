'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { X, FunctionSquare } from 'lucide-react';

interface MathLivePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (latex: string) => void;
  initialLatex?: string;
}

export function MathLivePopup({
  isOpen,
  onClose,
  onInsert,
  initialLatex = '',
}: MathLivePopupProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mathFieldRef = useRef<HTMLElement | null>(null);
  const [rawLatex, setRawLatex] = useState(initialLatex);
  const [loaded, setLoaded] = useState(false);

  // MathLive 동적 로드 (클라이언트 전용)
  useEffect(() => {
    import('mathlive').then(() => setLoaded(true));
  }, []);

  // math-field 엘리먼트를 DOM으로 직접 생성 (JSX 타입 이슈 회피)
  useEffect(() => {
    if (!loaded || !isOpen || !containerRef.current) return;
    if (mathFieldRef.current) return; // 이미 생성됨

    const mf = document.createElement('math-field');
    mf.style.width = '100%';
    mf.style.minHeight = '80px';
    mf.style.fontSize = '1.5rem';
    mf.style.padding = '16px';
    mf.style.border = 'none';
    mf.style.outline = 'none';
    mf.style.display = 'block';
    mf.style.boxSizing = 'border-box';
    // 가상 키보드를 팝업 내부가 아닌 별도 레이어로 표시
    mf.setAttribute('virtual-keyboard-mode', 'off');

    containerRef.current.appendChild(mf);
    mathFieldRef.current = mf;

    // input 이벤트 리스닝
    mf.addEventListener('input', () => {
      setRawLatex((mf as unknown as { value: string }).value || '');
    });

    return () => {
      if (containerRef.current?.contains(mf)) {
        containerRef.current.removeChild(mf);
      }
      mathFieldRef.current = null;
    };
  }, [loaded, isOpen]);

  // 팝업 열릴 때 초기값 설정
  useEffect(() => {
    if (isOpen) {
      setRawLatex(initialLatex);
      setTimeout(() => {
        if (mathFieldRef.current) {
          (mathFieldRef.current as unknown as { value: string }).value =
            initialLatex;
          // 포커스
          (mathFieldRef.current as unknown as { focus: () => void }).focus?.();
        }
      }, 100);
    }
  }, [isOpen, initialLatex]);

  const handleInsert = useCallback(() => {
    const latex = rawLatex.trim();
    if (latex) {
      onInsert(latex);
    }
    onClose();
  }, [rawLatex, onInsert, onClose]);

  // ESC로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Popup */}
      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <h3 className="font-bold text-base flex items-center gap-2">
            <FunctionSquare className="w-5 h-5 text-primary" />
            수식 편집기
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {/* MathLive 비주얼 에디터 */}
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1.5">
              수식 입력 (클릭하여 편집)
            </label>
            <div className="border-2 border-primary/30 rounded-lg bg-white focus-within:border-primary/60 transition-colors">
              <div ref={containerRef} className="min-h-[80px]" />
              {!loaded && (
                <div className="h-[60px] flex items-center justify-center text-sm text-slate-400">
                  수식 편집기 로딩 중...
                </div>
              )}
            </div>
          </div>

          {/* Raw LaTeX 입력 (양방향 동기화) */}
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1.5">
              LaTeX 코드
            </label>
            <input
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-slate-700 focus:ring-2 focus:ring-primary/40 focus:border-primary"
              value={rawLatex}
              onChange={(e) => {
                setRawLatex(e.target.value);
                if (mathFieldRef.current) {
                  (
                    mathFieldRef.current as unknown as { value: string }
                  ).value = e.target.value;
                }
              }}
              placeholder="\frac{a}{b}"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleInsert}
            disabled={!rawLatex.trim()}
            className="px-5 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
          >
            삽입
          </button>
        </div>
      </div>
    </div>
  );
}
