'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { X, FunctionSquare } from 'lucide-react';

// MathField 타입 (MathLive의 math-field 커스텀 엘리먼트)
interface MathFieldElement extends HTMLElement {
  value: string;
  focus: () => void;
  executeCommand: (cmd: string | [string, ...unknown[]]) => void;
}

// 퀵 입력 버튼 정의 — 모두 insert용 LaTeX
const QUICK_BUTTONS: { label: string; latex: string; title: string }[][] = [
  // Row 1: 구조
  [
    { label: 'x²', latex: '#@^{#0}', title: '윗첨자 (^)' },
    { label: 'xₙ', latex: '#@_{#0}', title: '아래첨자 (_)' },
    { label: '½', latex: '\\frac{#@}{#0}', title: '분수' },
    { label: '√', latex: '\\sqrt{#0}', title: '제곱근' },
    { label: '∛', latex: '\\sqrt[3]{#0}', title: '세제곱근' },
    { label: '|x|', latex: '\\left|#0\\right|', title: '절댓값' },
    { label: '( )', latex: '\\left(#0\\right)', title: '괄호' },
  ],
  // Row 2: 연산·비교
  [
    { label: '×', latex: '\\times', title: '곱하기' },
    { label: '÷', latex: '\\div', title: '나누기' },
    { label: '±', latex: '\\pm', title: '플러스마이너스' },
    { label: '≠', latex: '\\neq', title: '같지 않다' },
    { label: '≤', latex: '\\leq', title: '이하' },
    { label: '≥', latex: '\\geq', title: '이상' },
    { label: '∴', latex: '\\therefore', title: '그러므로' },
    { label: '⇒', latex: '\\Rightarrow', title: '화살표' },
  ],
  // Row 3: 기호·그리스 문자
  [
    { label: 'π', latex: '\\pi', title: '파이' },
    { label: '∞', latex: '\\infty', title: '무한대' },
    { label: 'θ', latex: '\\theta', title: '세타' },
    { label: 'α', latex: '\\alpha', title: '알파' },
    { label: 'β', latex: '\\beta', title: '베타' },
    { label: '°', latex: '\\degree', title: '도 (각도)' },
    { label: '△', latex: '\\triangle', title: '삼각형' },
    { label: '∠', latex: '\\angle', title: '각' },
  ],
];

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
  const mathFieldRef = useRef<MathFieldElement | null>(null);
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

    const mf = document.createElement('math-field') as unknown as MathFieldElement;
    const el = mf as unknown as HTMLElement;
    el.style.width = '100%';
    el.style.minHeight = '80px';
    el.style.fontSize = '1.5rem';
    el.style.padding = '16px';
    el.style.border = 'none';
    el.style.outline = 'none';
    el.style.display = 'block';
    el.style.boxSizing = 'border-box';
    el.setAttribute('virtual-keyboard-mode', 'off');

    containerRef.current.appendChild(el);
    mathFieldRef.current = mf;

    // input 이벤트 리스닝
    el.addEventListener('input', () => {
      setRawLatex(mf.value || '');
    });

    return () => {
      if (containerRef.current?.contains(el)) {
        containerRef.current.removeChild(el);
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
          mathFieldRef.current.value = initialLatex;
          mathFieldRef.current.focus();
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

  // 퀵 버튼 클릭 → MathField에 삽입
  const handleQuickInsert = useCallback((btn: typeof QUICK_BUTTONS[0][0]) => {
    const mf = mathFieldRef.current;
    if (!mf) return;

    mf.executeCommand(['insert', btn.latex]);
    mf.focus();
    // 값 동기화
    setTimeout(() => setRawLatex(mf.value || ''), 50);
  }, []);

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
        className="relative bg-white rounded-sm shadow-2xl w-full max-w-lg mx-4"
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
            className="p-1 hover:bg-slate-100 rounded-sm transition-colors"
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
            <div className="border-2 border-primary/30 rounded-sm bg-white focus-within:border-primary/60 transition-colors">
              <div ref={containerRef} className="min-h-[80px]" />
              {!loaded && (
                <div className="h-[60px] flex items-center justify-center text-sm text-slate-400">
                  수식 편집기 로딩 중...
                </div>
              )}
            </div>
          </div>

          {/* 퀵 입력 툴바 */}
          <div className="space-y-1">
            {QUICK_BUTTONS.map((row, ri) => (
              <div key={ri} className="flex gap-1 flex-wrap">
                {row.map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    title={btn.title}
                    onClick={() => handleQuickInsert(btn)}
                    className="min-w-[40px] h-9 px-2 text-sm font-medium bg-slate-100 hover:bg-primary/10 hover:text-primary border border-slate-200 rounded-sm transition-colors"
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Raw LaTeX 입력 (양방향 동기화) */}
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1.5">
              LaTeX 코드
            </label>
            <input
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm font-mono text-slate-700 focus:ring-2 focus:ring-primary/40 focus:border-primary"
              value={rawLatex}
              onChange={(e) => {
                setRawLatex(e.target.value);
                if (mathFieldRef.current) {
                  mathFieldRef.current.value = e.target.value;
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
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-sm transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleInsert}
            disabled={!rawLatex.trim()}
            className="px-5 py-2 text-sm bg-primary text-white rounded-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
          >
            삽입
          </button>
        </div>
      </div>
    </div>
  );
}
