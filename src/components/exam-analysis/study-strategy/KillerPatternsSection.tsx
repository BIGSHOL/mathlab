'use client';

import { useState, useMemo } from 'react';
import { Skull, ChevronDown } from 'lucide-react';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import { findKillerPatterns } from '@/lib/exam-analysis/data/curriculum-strategies';

interface KillerPatternsSectionProps {
  questions: AnalyzedQuestion[];
  isSectionExpanded: boolean;
  onToggleSection: () => void;
}

export function KillerPatternsSection({
  questions,
  isSectionExpanded,
  onToggleSection,
}: KillerPatternsSectionProps) {
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());

  // 킬러 패턴 탐색
  const killerPatterns = useMemo(() => findKillerPatterns(questions), [questions]);

  // 최상위/심화 문항 수 계산
  const highDiffCount = useMemo(
    () => questions.filter(q => q.difficulty === 'creative' || q.difficulty === 'reasoning').length,
    [questions],
  );

  const toggleUnit = (name: string) => {
    setExpandedUnits(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // 킬러 패턴이 없으면 섹션 자체를 렌더하지 않음
  if (killerPatterns.length === 0) return null;

  return (
    <div className="border rounded-sm overflow-hidden bg-white">
      {/* 섹션 헤더 */}
      <button
        onClick={onToggleSection}
        className="w-full px-4 py-3.5 flex items-center gap-3 bg-white hover:bg-slate-50 transition-colors"
      >
        <div className="w-7 h-7 rounded-sm bg-red-500/15 flex items-center justify-center shrink-0">
          <Skull className="w-3.5 h-3.5 text-red-600" />
        </div>
        <div className="flex-1 text-left">
          <span className="text-sm font-semibold text-slate-800">킬러 문항 유형 경고</span>
          <span className="text-xs text-slate-400 ml-2">
            고난도 함정 문제 유형과 대응 전략
          </span>
        </div>
        {highDiffCount > 0 && (
          <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold bg-red-100 text-red-700 shrink-0">
            고난도 {highDiffCount}문항
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
            isSectionExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* 확장 내용 */}
      {isSectionExpanded && (
        <div className="px-4 pb-4 border-t">
          <div className="space-y-2 pt-3">
            {killerPatterns.map(kp => {
              const isOpen = expandedUnits.has(kp.unitName);
              const trapCount = kp.patterns.length;
              const creativeCount = kp.patterns.filter(
                p => p.difficultyLevel === 'creative',
              ).length;

              return (
                <div
                  key={kp.unitName}
                  className="rounded-sm border border-slate-100 overflow-hidden"
                >
                  {/* 단원 행 */}
                  <button
                    onClick={() => toggleUnit(kp.unitName)}
                    className="w-full px-3 py-2.5 flex items-center gap-2.5 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-red-500" />
                    <span className="text-sm font-medium text-slate-800 text-left flex-1 min-w-0 truncate">
                      {kp.unitName}
                    </span>

                    {/* 배지 */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-medium bg-amber-100 text-amber-700">
                        함정 {trapCount}개
                      </span>
                      {creativeCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-medium bg-red-100 text-red-700">
                          최상 {creativeCount}
                        </span>
                      )}
                    </div>

                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* 확장: 패턴 카드 */}
                  {isOpen && (
                    <div className="border-t border-slate-100 bg-white px-4 py-3 space-y-3">
                      {kp.patterns.map((pattern, idx) => (
                        <div
                          key={idx}
                          className="rounded-sm border p-3"
                          style={{
                            borderColor:
                              pattern.difficultyLevel === 'creative'
                                ? '#FECACA'
                                : '#FDE68A',
                            backgroundColor:
                              pattern.difficultyLevel === 'creative'
                                ? '#FEF2F2'
                                : '#FFFBEB',
                          }}
                        >
                          {/* 패턴 이름 + 난이도 */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-semibold text-slate-800">
                              {pattern.name}
                            </span>
                            <span
                              className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold text-white"
                              style={{
                                backgroundColor:
                                  pattern.difficultyLevel === 'creative'
                                    ? '#ef4444'
                                    : '#f59e0b',
                              }}
                            >
                              {pattern.difficultyLevel === 'creative' ? '최상위' : '심화'}
                            </span>
                          </div>

                          {/* 함정 설명 */}
                          <p className="text-xs text-slate-600 leading-relaxed mb-2.5">
                            {pattern.trapDescription}
                          </p>

                          {/* 솔루션 키 */}
                          <div>
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                              대응 전략
                            </span>
                            <ul className="mt-1 space-y-1">
                              {pattern.solutionKeys.map((key, ki) => (
                                <li
                                  key={ki}
                                  className="text-xs text-slate-700 flex items-start gap-1.5"
                                >
                                  <span className="w-1 h-1 rounded-full bg-red-400 mt-1.5 shrink-0" />
                                  {key}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
