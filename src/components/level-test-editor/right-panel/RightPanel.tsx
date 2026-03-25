'use client';

import { useState } from 'react';
import { QuestionCard } from './QuestionCard';
import type { EditorQuestion } from './QuestionCard';
import type { LevelTestDomain } from '@/types';
import { ListChecks, ArrowUpDown, ArrowUp, ArrowDown, Check } from 'lucide-react';

export type SortKey = 'difficulty' | 'type' | 'domain' | 'chapter' | 'curriculum';
export type SortDirection = 'asc' | 'desc';
export interface SortCriterion { key: SortKey; direction: SortDirection }

const SORT_LABELS: Record<SortKey, string> = {
  difficulty: '난이도',
  type: '객관식/주관식',
  domain: '4대 영역',
  chapter: '계통도(단원)',
  curriculum: '교과과정(교재)',
};

const ALL_SORT_KEYS: SortKey[] = ['difficulty', 'type', 'domain', 'chapter', 'curriculum'];
const SORT_KEYS_NO_DOMAIN: SortKey[] = ['difficulty', 'type', 'chapter', 'curriculum'];

interface RightPanelProps {
  questions: EditorQuestion[];
  questionDomains: Record<string, LevelTestDomain>;
  showDomain?: boolean;
  onDomainChange: (questionId: string, domain: LevelTestDomain) => void;
  onRemove: (questionId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onFindSimilar: (questionId: string) => void;
  onSort: (criteria: SortCriterion[]) => void;
}

export function RightPanel({
  questions,
  questionDomains,
  showDomain = true,
  onDomainChange,
  onRemove,
  onReorder,
  onFindSimilar,
  onSort,
}: RightPanelProps) {
  const [questionsOnlyView, setQuestionsOnlyView] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  // 다중 정렬 기준 (순서 = 우선순위)
  const [sortCriteria, setSortCriteria] = useState<SortCriterion[]>([]);

  const toggleCriterion = (key: SortKey) => {
    setSortCriteria((prev) => {
      const existing = prev.find((c) => c.key === key);
      if (existing) {
        return prev.filter((c) => c.key !== key);
      }
      return [...prev, { key, direction: 'asc' }];
    });
  };

  const toggleDirection = (key: SortKey) => {
    setSortCriteria((prev) =>
      prev.map((c) =>
        c.key === key ? { ...c, direction: c.direction === 'asc' ? 'desc' : 'asc' } : c
      )
    );
  };

  const applySort = () => {
    if (sortCriteria.length > 0) {
      onSort(sortCriteria);
    }
    setShowSortMenu(false);
  };

  const clearSort = () => {
    setSortCriteria([]);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
      {/* 헤더 */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-slate-800 text-white">
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4" />
          <span className="text-sm font-bold">선택한 문제 목록</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white/20">
            {questions.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* 정렬 드롭다운 */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors ${
                sortCriteria.length > 0
                  ? 'text-white bg-primary/80 hover:bg-primary'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              정렬{sortCriteria.length > 0 && ` (${sortCriteria.length})`}
            </button>
            {showSortMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 w-64 bg-white rounded-sm shadow-lg border border-slate-200 overflow-hidden">
                  {/* 헤더 */}
                  <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text-secondary">다중 정렬 (위에서 아래 순서로 적용)</span>
                      {sortCriteria.length > 0 && (
                        <button
                          onClick={clearSort}
                          className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                        >
                          초기화
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 정렬 기준 목록 */}
                  <div className="py-1">
                    {(showDomain ? ALL_SORT_KEYS : SORT_KEYS_NO_DOMAIN).map((key) => {
                      const criterion = sortCriteria.find((c) => c.key === key);
                      const isActive = !!criterion;
                      const order = isActive ? sortCriteria.indexOf(criterion!) + 1 : null;
                      return (
                        <div
                          key={key}
                          className={`flex items-center gap-2 px-3 py-2 transition-colors ${
                            isActive ? 'bg-primary/5' : 'hover:bg-slate-50'
                          }`}
                        >
                          {/* 체크박스 */}
                          <button
                            onClick={() => toggleCriterion(key)}
                            className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                              isActive
                                ? 'bg-primary border-primary text-white'
                                : 'border-slate-300 hover:border-slate-400'
                            }`}
                          >
                            {isActive && <Check className="w-3 h-3" />}
                          </button>

                          {/* 우선순위 번호 */}
                          {order && (
                            <span className="shrink-0 w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center">
                              {order}
                            </span>
                          )}

                          {/* 라벨 */}
                          <span className={`flex-1 text-xs ${isActive ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                            {SORT_LABELS[key]}
                          </span>

                          {/* 방향 토글 */}
                          {isActive && (
                            <button
                              onClick={() => toggleDirection(key)}
                              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-text-secondary hover:bg-slate-200 transition-colors"
                            >
                              {criterion!.direction === 'asc' ? (
                                <>
                                  <ArrowUp className="w-3 h-3" />
                                  오름
                                </>
                              ) : (
                                <>
                                  <ArrowDown className="w-3 h-3" />
                                  내림
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* 적용 버튼 */}
                  <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setShowSortMenu(false)}
                      className="px-3 py-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={applySort}
                      disabled={sortCriteria.length === 0}
                      className="px-3 py-1 text-xs font-medium text-white bg-primary rounded hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      정렬 적용
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 문제만 보기 */}
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-slate-300">문제만 보기</span>
            <div className="relative">
              <input
                type="checkbox"
                checked={questionsOnlyView}
                onChange={(e) => setQuestionsOnlyView(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-slate-600 rounded-full peer-checked:bg-primary transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4" />
            </div>
          </label>
        </div>
      </div>

      {/* 문제 목록 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <ListChecks className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-text-secondary mb-1">아직 문제가 없습니다</p>
            <p className="text-xs text-slate-400">왼쪽 &apos;문제 추가&apos; 탭에서 문제를 선택하세요</p>
          </div>
        ) : (
          questions.map((q, idx) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={idx}
              totalCount={questions.length}
              domain={questionDomains[q.id] ?? null}
              questionsOnlyView={questionsOnlyView}
              showDomain={showDomain}
              onDomainChange={(domain) => onDomainChange(q.id, domain)}
              onRemove={() => onRemove(q.id)}
              onMoveUp={() => onReorder(idx, idx - 1)}
              onMoveDown={() => onReorder(idx, idx + 1)}
              onFindSimilar={() => onFindSimilar(q.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
