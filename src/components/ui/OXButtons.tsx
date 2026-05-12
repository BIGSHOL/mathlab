'use client';

import * as React from 'react';

export type OXValue = 'O' | 'X';
export type OXButtonSize = 'lg' | 'xl';

export type OXButtonsProps = {
  selected?: OXValue;
  onSelect: (v: OXValue) => void;
  /** 정답 노출 모드 */
  reveal?: OXValue;
  disabled?: boolean;
  size?: OXButtonSize;
  /** 화살표/O,X 키 단축키 활성 (기본 true) */
  keyboardShortcut?: boolean;
  /** 커스텀 라벨 */
  labels?: { o?: string; x?: string };
};

/**
 * v2 디자인 시스템 OXButtons.
 * practice-suite.css 의 .v2-oxbtns / .v2-oxbtn(.o|.x|.sel|.correct) 매핑.
 *
 * 키보드: ← 또는 'o'/'O' = O, → 또는 'x'/'X' = X
 */
export function OXButtons({
  selected,
  onSelect,
  reveal,
  disabled = false,
  size = 'xl',
  keyboardShortcut = true,
  labels,
}: OXButtonsProps) {
  React.useEffect(() => {
    if (!keyboardShortcut || disabled) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'o' || e.key === 'O') onSelect('O');
      else if (e.key === 'ArrowRight' || e.key === 'x' || e.key === 'X') onSelect('X');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSelect, keyboardShortcut, disabled]);

  const rowClasses = ['v2-oxbtns', size];

  return (
    <div className={rowClasses.join(' ')}>
      <button
        type="button"
        className={cn('v2-oxbtn', 'o', selected === 'O' && 'sel', reveal === 'O' && 'correct')}
        onClick={() => onSelect('O')}
        aria-pressed={selected === 'O'}
        disabled={disabled || !!reveal}
      >
        <span className="v2-oxbtn-glyph">○</span>
        <span className="v2-oxbtn-label">{labels?.o ?? '맞다'}</span>
      </button>
      <button
        type="button"
        className={cn('v2-oxbtn', 'x', selected === 'X' && 'sel', reveal === 'X' && 'correct')}
        onClick={() => onSelect('X')}
        aria-pressed={selected === 'X'}
        disabled={disabled || !!reveal}
      >
        <span className="v2-oxbtn-glyph">✕</span>
        <span className="v2-oxbtn-label">{labels?.x ?? '틀리다'}</span>
      </button>
    </div>
  );
}

function cn(...classes: Array<string | false | undefined | null>): string {
  return classes.filter(Boolean).join(' ');
}
