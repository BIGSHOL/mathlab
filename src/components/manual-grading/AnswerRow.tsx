'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, X, Trash2 } from 'lucide-react';

interface AnswerRowProps {
  index: number;
  questionId: string;
  correctAnswer: string;
  currentAnswer?: {
    selectedAnswer: string;
    isCorrect: boolean;
    isOverridden: boolean;
  };
  isActive: boolean;
  disabled: boolean;
  onSubmit: (questionId: string, answer: string) => void;
  onOverride: (questionId: string, isCorrect: boolean) => void;
  onDelete: (questionId: string) => void;
  onClick: (questionId: string) => void;
  onNext: () => void;
}

export function AnswerRow({
  index,
  questionId,
  correctAnswer: _correctAnswer,
  currentAnswer,
  isActive,
  disabled,
  onSubmit,
  onOverride,
  onDelete,
  onClick,
  onNext,
}: AnswerRowProps) {
  const [inputValue, setInputValue] = useState(currentAnswer?.selectedAnswer ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 외부 답안 변경에 동기화
  useEffect(() => {
    setInputValue(currentAnswer?.selectedAnswer ?? '');
  }, [currentAnswer?.selectedAnswer]);

  const handleChange = (value: string) => {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (value.trim()) {
        onSubmit(questionId, value.trim());
      }
    }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // 즉시 저장 후 다음으로
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (inputValue.trim()) {
        onSubmit(questionId, inputValue.trim());
      }
      onNext();
    }
  };

  const hasAnswer = currentAnswer !== undefined;
  const isCorrect = currentAnswer?.isCorrect ?? false;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-sm transition-colors cursor-pointer ${
        isActive ? 'bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-slate-50'
      }`}
      onClick={() => onClick(questionId)}
    >
      {/* 번호 */}
      <span className="text-xs font-semibold text-slate-400 w-8 text-right shrink-0 tabular-nums">
        {index + 1}번
      </span>

      {/* 답 입력 */}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        disabled={disabled}
        placeholder="답 입력"
        className="flex-1 min-w-0 px-2 py-1 text-sm font-medium border border-slate-200 rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
        data-question-id={questionId}
      />

      {/* 자동 채점 결과 배지 */}
      {hasAnswer ? (
        <span
          className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${
            isCorrect ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
          }`}
        >
          {isCorrect ? '✓정' : '✗오'}
        </span>
      ) : (
        <span className="shrink-0 w-8 text-center text-[10px] text-slate-300">—</span>
      )}

      {/* O/X 오버라이드 */}
      <button
        onClick={(e) => { e.stopPropagation(); if (hasAnswer) onOverride(questionId, true); }}
        disabled={!hasAnswer || disabled}
        className={`shrink-0 p-1 rounded transition-colors ${
          hasAnswer && isCorrect
            ? 'bg-emerald-100 text-emerald-600'
            : 'text-slate-300 hover:bg-emerald-50 hover:text-emerald-500'
        } disabled:opacity-30`}
        title="정답 처리"
      >
        <Check className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); if (hasAnswer) onOverride(questionId, false); }}
        disabled={!hasAnswer || disabled}
        className={`shrink-0 p-1 rounded transition-colors ${
          hasAnswer && !isCorrect
            ? 'bg-red-100 text-red-600'
            : 'text-slate-300 hover:bg-red-50 hover:text-red-500'
        } disabled:opacity-30`}
        title="오답 처리"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* 삭제 */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(questionId); }}
        disabled={!hasAnswer || disabled}
        className="shrink-0 p-1 rounded text-slate-300 hover:bg-slate-100 hover:text-slate-500 disabled:opacity-30 transition-colors"
        title="답안 삭제"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
