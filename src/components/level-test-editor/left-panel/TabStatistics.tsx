'use client';

import { useMemo } from 'react';
import { DIFFICULTY_LABELS, TYPE_LABELS, DOMAIN_LABELS, DOMAIN_COLORS } from '@/types';
import type { LevelTestDomain, QuestionDifficulty, QuestionType } from '@/types';
import type { EditorQuestion } from '../right-panel/QuestionCard';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface TabStatisticsProps {
  questions: EditorQuestion[];
  questionDomains: Record<string, LevelTestDomain>;
  showDomain?: boolean;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onScrollToQuestion: (index: number) => void;
}

const DIFF_ORDER: QuestionDifficulty[] = ['BASIC', 'MEDIUM', 'HIGH', 'HIGHEST'];
const DIFF_BAR_COLORS: Record<string, string> = {
  BASIC: 'bg-emerald-400',
  MEDIUM: 'bg-yellow-400',
  HIGH: 'bg-red-400',
  HIGHEST: 'bg-purple-400',
};

const TYPE_ORDER: QuestionType[] = ['MULTIPLE_CHOICE', 'SHORT_ANSWER', 'ESSAY'];
const DOMAIN_ORDER: LevelTestDomain[] = ['CALCULATION', 'UNDERSTANDING', 'PROBLEM_SOLVING', 'REASONING'];

const DOMAIN_BAR_COLORS: Record<LevelTestDomain, string> = {
  CALCULATION: 'bg-blue-400',
  UNDERSTANDING: 'bg-green-400',
  PROBLEM_SOLVING: 'bg-orange-400',
  REASONING: 'bg-purple-400',
};

export function TabStatistics({ questions, questionDomains, showDomain = true, onReorder, onScrollToQuestion }: TabStatisticsProps) {
  const stats = useMemo(() => {
    const diffCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    const domainCounts: Record<string, number> = {};

    for (const q of questions) {
      diffCounts[q.difficulty] = (diffCounts[q.difficulty] || 0) + 1;
      typeCounts[q.type] = (typeCounts[q.type] || 0) + 1;
    }
    for (const domain of Object.values(questionDomains)) {
      domainCounts[domain] = (domainCounts[domain] || 0) + 1;
    }

    return { diffCounts, typeCounts, domainCounts };
  }, [questions, questionDomains]);

  const maxDiffCount = Math.max(1, ...Object.values(stats.diffCounts));
  const maxDomainCount = Math.max(1, ...Object.values(stats.domainCounts));

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* 문제 통계 */}
      <div className="p-4 border-b border-slate-100">
        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">문제 통계</h3>

        {/* 총 문제수 */}
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-bold text-text-primary">{questions.length}</span>
          <span className="text-sm text-text-secondary">문제</span>
        </div>

        {/* 유형 분포 */}
        <div className="flex items-center gap-3 mb-4">
          {TYPE_ORDER.map((type) => {
            const count = stats.typeCounts[type] || 0;
            if (count === 0) return null;
            return (
              <span key={type} className="text-xs text-text-secondary">
                {TYPE_LABELS[type]} <span className="font-bold text-text-primary">{count}</span>
              </span>
            );
          })}
        </div>

        {/* 난이도 분포 바차트 */}
        <div className="mb-4">
          <h4 className="text-[11px] font-medium text-text-secondary mb-2">난이도 분포</h4>
          <div className="flex items-end gap-2 h-20">
            {DIFF_ORDER.map((diff) => {
              const count = stats.diffCounts[diff] || 0;
              const heightPct = count > 0 ? Math.max(10, (count / maxDiffCount) * 100) : 0;
              return (
                <div key={diff} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-text-secondary">{count > 0 ? `${count}문제` : ''}</span>
                  <div className="w-full relative" style={{ height: '48px' }}>
                    <div
                      className={`absolute bottom-0 left-0 right-0 rounded-t ${DIFF_BAR_COLORS[diff]} transition-all duration-300`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-text-secondary">{DIFFICULTY_LABELS[diff]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 영역 분포 (레벨테스트 전용) */}
        {showDomain && (
          <div>
            <h4 className="text-[11px] font-medium text-text-secondary mb-2">영역 분포</h4>
            <div className="space-y-1.5">
              {DOMAIN_ORDER.map((domain) => {
                const count = stats.domainCounts[domain] || 0;
                const widthPct = count > 0 ? Math.max(5, (count / maxDomainCount) * 100) : 0;
                return (
                  <div key={domain} className="flex items-center gap-2">
                    <span className="text-[11px] text-text-secondary w-16 shrink-0 truncate">
                      {DOMAIN_LABELS[domain]}
                    </span>
                    <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${DOMAIN_BAR_COLORS[domain]} transition-all duration-300`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-text-primary w-5 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 문제 목록 테이블 */}
      <div className="flex-1 min-h-0">
        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center text-[10px] font-bold text-text-secondary uppercase tracking-wider">
            <span className="w-8 text-center">#</span>
            <span className="w-10">난이도</span>
            <span className="w-12">유형</span>
            {showDomain && <span className="w-14">영역</span>}
            <span className="flex-1">단원명</span>
            <span className="w-12 text-center">순서</span>
          </div>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100% - 32px)' }}>
          {questions.map((q, idx) => {
            const domain = questionDomains[q.id];
            const domainColor = domain ? DOMAIN_COLORS[domain] : null;
            return (
              <div
                key={q.id}
                onClick={() => onScrollToQuestion(idx)}
                className="flex items-center px-4 py-2 text-xs border-b border-slate-50 hover:bg-primary/5 cursor-pointer transition-colors"
              >
                <span className="w-8 text-center font-bold text-slate-400">{idx + 1}</span>
                <span className="w-10">
                  <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${
                    q.difficulty === 'BASIC' ? 'bg-emerald-100 text-emerald-700' :
                    q.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                    q.difficulty === 'HIGH' ? 'bg-red-100 text-red-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {DIFFICULTY_LABELS[q.difficulty as QuestionDifficulty] ?? '?'}
                  </span>
                </span>
                <span className="w-12 text-[10px] text-text-secondary truncate">
                  {TYPE_LABELS[q.type as QuestionType] ?? q.type}
                </span>
                {showDomain && (
                  <span className="w-14">
                    {domain && domainColor && (
                      <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${domainColor.bg} ${domainColor.text}`}>
                        {DOMAIN_LABELS[domain].slice(0, 2)}
                      </span>
                    )}
                  </span>
                )}
                <span className="flex-1 text-text-primary truncate">{q.chapter}</span>
                <span className="w-12 flex items-center justify-center gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); onReorder(idx, idx - 1); }}
                    disabled={idx === 0}
                    className="p-0.5 rounded text-slate-400 hover:text-slate-600 disabled:opacity-20"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onReorder(idx, idx + 1); }}
                    disabled={idx === questions.length - 1}
                    className="p-0.5 rounded text-slate-400 hover:text-slate-600 disabled:opacity-20"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
