'use client';

import * as React from 'react';
import { MathRenderer } from '@/components/math/MathRenderer';

export type Choice = {
  id: string;
  label: string;
  /** label 이 KaTeX 표현식이면 true (예: "$x = 5$") */
  isLatex?: boolean;
};

export type ChoiceListLayout = 'list' | 'grid-2';

export type ChoiceListProps = {
  choices: Choice[];
  selectedId?: string;
  onSelect: (id: string) => void;
  /** 정답 표시 모드. correctId 와 selectedId 가 다르면 selectedId 는 wrong 처리 */
  revealAnswer?: { correctId: string };
  layout?: ChoiceListLayout;
  disabled?: boolean;
  /** 1~5 숫자 키로 즉시 선택 활성화 (기본 true) */
  keyboardShortcut?: boolean;
};

const NUMERAL = ['①', '②', '③', '④', '⑤'];

/**
 * v2 디자인 시스템 ChoiceList.
 * practice-suite.css 의 .v2-choices / .v2-choice 매핑.
 *
 * 키보드: 1~5 숫자키 즉시 선택.
 */
export function ChoiceList({
  choices,
  selectedId,
  onSelect,
  revealAnswer,
  layout = 'list',
  disabled = false,
  keyboardShortcut = true,
}: ChoiceListProps) {
  React.useEffect(() => {
    if (!keyboardShortcut || disabled) return;
    function onKey(e: KeyboardEvent) {
      const n = Number(e.key);
      if (n >= 1 && n <= choices.length) {
        const c = choices[n - 1];
        if (c) onSelect(c.id);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choices, onSelect, keyboardShortcut, disabled]);

  const listClasses = ['v2-choices'];
  if (layout === 'grid-2') listClasses.push('grid-2');

  return (
    <ul className={listClasses.join(' ')} role="radiogroup">
      {choices.map((c, i) => {
        const isSelected = c.id === selectedId;
        const isCorrect = revealAnswer?.correctId === c.id;
        const isWrong = !!(isSelected && revealAnswer && !isCorrect);
        const itemClasses = ['v2-choice'];
        if (isSelected && !revealAnswer) itemClasses.push('sel');
        if (isCorrect) itemClasses.push('correct');
        if (isWrong) itemClasses.push('wrong');

        return (
          <li key={c.id}>
            <button
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled || !!revealAnswer}
              className={itemClasses.join(' ')}
              onClick={() => onSelect(c.id)}
            >
              <span className="v2-choice-n">{NUMERAL[i] ?? `${i + 1}`}</span>
              {c.isLatex ? (
                <MathRenderer inline content={c.label} />
              ) : (
                <span>{c.label}</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
