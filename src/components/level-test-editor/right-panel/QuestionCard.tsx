'use client';

import { MathRenderer } from '@/components/math/MathRenderer';
import { DomainSelector } from '@/components/level-test-editor/DomainSelector';
import { DIFFICULTY_LABELS, TYPE_LABELS, DOMAIN_COLORS, DOMAIN_LABELS } from '@/types';
import type { LevelTestDomain, QuestionDifficulty, QuestionType } from '@/types';
import { ChevronUp, ChevronDown, Trash2, GitCompareArrows } from 'lucide-react';

export interface EditorQuestion {
  id: string;
  bookCode: string;
  chapter: string;
  section: string | null;
  questionNum: number;
  difficulty: string;
  type: string;
  content: string;
  choices: string[] | null;
  answer: string;
  explanation: string | null;
}

interface QuestionCardProps {
  question: EditorQuestion;
  index: number;
  totalCount: number;
  domain: LevelTestDomain | null;
  questionsOnlyView: boolean;
  showDomain?: boolean;
  onDomainChange: (domain: LevelTestDomain) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onFindSimilar: () => void;
}

const DIFF_COLORS: Record<string, string> = {
  BASIC: 'bg-emerald-100 text-emerald-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-red-100 text-red-700',
  HIGHEST: 'bg-purple-100 text-purple-700',
};

export function QuestionCard({
  question,
  index,
  totalCount,
  domain,
  questionsOnlyView,
  showDomain = true,
  onDomainChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onFindSimilar,
}: QuestionCardProps) {
  const domainColor = domain ? DOMAIN_COLORS[domain] : null;
  const borderColor = domainColor
    ? domain === 'CALCULATION' ? 'border-l-blue-500'
    : domain === 'UNDERSTANDING' ? 'border-l-green-500'
    : domain === 'PROBLEM_SOLVING' ? 'border-l-orange-500'
    : 'border-l-purple-500'
    : 'border-l-slate-300';

  return (
    <div className={`bg-white rounded-lg border border-slate-200 border-l-[3px] ${borderColor} overflow-hidden transition-shadow hover:shadow-md`}>
      <div className="p-4">
        {/* 헤더: 번호 + 단원명 */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="shrink-0 w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
              {index + 1}
            </span>
            <span className="text-sm font-medium text-text-primary truncate">{question.chapter}</span>
          </div>
          {showDomain && domain && (
            <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold ${domainColor!.bg} ${domainColor!.text}`}>
              {DOMAIN_LABELS[domain]}
            </span>
          )}
        </div>

        {/* 배지: 난이도 + 유형 */}
        {!questionsOnlyView && (
          <div className="flex items-center gap-1.5 mb-3">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${DIFF_COLORS[question.difficulty] ?? 'bg-slate-100 text-slate-600'}`}>
              {DIFFICULTY_LABELS[question.difficulty as QuestionDifficulty] ?? question.difficulty}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
              {TYPE_LABELS[question.type as QuestionType] ?? question.type}
            </span>
          </div>
        )}

        {/* 문제 내용 */}
        <div className={`text-sm text-text-primary ${question.choices && question.choices.length > 0 ? 'mb-2' : 'mb-3'} ${questionsOnlyView ? '' : 'line-clamp-3'}`}>
          <MathRenderer content={question.content.slice(0, questionsOnlyView ? 500 : 200)} />
        </div>

        {/* 객관식 보기 */}
        {question.choices && question.choices.length > 0 && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 mb-3 pl-1">
            {question.choices.map((choice, i) => (
              <div key={i} className="text-xs text-text-secondary">
                <MathRenderer content={choice} />
              </div>
            ))}
          </div>
        )}

        {/* 영역 선택 */}
        {showDomain && !questionsOnlyView && (
          <div className="mb-3">
            <DomainSelector selectedDomain={domain} onSelect={onDomainChange} size="sm" />
          </div>
        )}

        {/* 하단 액션 */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1">
            <button
              onClick={onFindSimilar}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-primary hover:bg-primary/5 rounded transition-colors"
            >
              <GitCompareArrows className="w-3.5 h-3.5" />
              유사 문제
            </button>
            <button
              onClick={onRemove}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              삭제
            </button>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={onMoveUp}
              disabled={index === 0}
              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={index === totalCount - 1}
              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
