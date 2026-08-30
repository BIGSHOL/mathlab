'use client';

import { useState, useMemo } from 'react';
import { Skull, ChevronDown } from 'lucide-react';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import { findKillerPatterns } from '@/lib/exam-analysis/data/curriculum-strategies';
import { isHighDifficulty } from '@/lib/exam-analysis/shared/difficulty';
import { collectQuestionEvidence } from '@/lib/exam-analysis/shared/question-evidence';
import { renderInlineMath } from '@/lib/exam-analysis/rendering';
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from './constants';

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

  // 최상위/심화 문항 — 배지 개수와 아래 목록이 **같은 술어**를 써야 어긋나지 않는다(§12-13).
  const highDiffQuestions = useMemo(() => questions.filter(q => isHighDifficulty(q.difficulty)), [questions]);
  const highDiffCount = highDiffQuestions.length;

  // 이 시험의 킬러 문항 근거. 아래 패턴 카드는 전부 정적 카탈로그(KILLER_QUESTION_TYPES)라
  // 단원 이름만 맞으면 어느 시험에서나 같은 함정 설명이 나온다 — 정작 "이 시험의 어느 문항이
  // 왜 어려웠나" 는 빠져 있었다. AI 가 시험지를 보고 쓴 소견을 카탈로그 위에 놓는다.
  const highEvidence = useMemo(() => collectQuestionEvidence(highDiffQuestions), [highDiffQuestions]);
  const evidenceMissing = highDiffCount - highEvidence.length;

  const toggleUnit = (name: string) => {
    setExpandedUnits(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // 예전엔 카탈로그 매칭이 실패하면(단원 이름이 KILLER_QUESTION_TYPES 키워드와 안 맞으면)
  // **이 시험에 고난도 문항이 있어도** 섹션이 통째로 사라졌다. 우리 손에 있는 근거를
  // 카탈로그 커버리지 때문에 숨기지 않는다 — 둘 중 하나라도 있으면 렌더한다.
  if (killerPatterns.length === 0 && highEvidence.length === 0) return null;

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
          {highEvidence.length > 0 && (
            <div className="mt-3 rounded-sm border border-red-100 overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 py-2 bg-red-50/60">
                <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold text-white bg-red-600">
                  이 시험
                </span>
                <span className="text-xs font-medium text-slate-700">
                  고난도 문항 {highEvidence.length}개
                </span>
              </div>
              <ul className="divide-y divide-red-50 bg-white">
                {highEvidence.map((ev) => (
                  <li key={ev.number} className="px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[11px] font-bold text-slate-700">{ev.number}번</span>
                      {ev.difficulty && (
                        <span
                          className="px-1 py-0.5 rounded-sm text-[9px] font-bold text-white"
                          style={{ backgroundColor: DIFFICULTY_COLORS[ev.difficulty] || '#94A3B8' }}
                        >
                          {DIFFICULTY_LABELS[ev.difficulty] || ev.difficulty}
                        </span>
                      )}
                      {ev.points !== null && (
                        <span className="text-[10px] text-slate-500 tabular-nums">{ev.points}점</span>
                      )}
                      {ev.isEssay && (
                        <span className="text-[9px] font-medium text-amber-700 bg-amber-50 px-1 py-0.5 rounded-sm">
                          서술형
                        </span>
                      )}
                    </div>
                    {/* AI 생성 텍스트 — renderInlineMath 를 거치지 않으면 raw $ 가 노출된다 */}
                    {ev.reason && (
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {renderInlineMath(ev.reason, `kp-r-${ev.number}`)}
                      </p>
                    )}
                    {ev.comment && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {renderInlineMath(ev.comment, `kp-c-${ev.number}`)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              {/* 배지(고난도 N문항)와 목록 개수가 다를 수 있다 — 그 차이를 화면이 밝힌다.
                  세는 쪽이 알려 주지 않으면 사용자는 목록이 잘린 줄 안다. */}
              {evidenceMissing > 0 && (
                <p className="px-3 py-1.5 text-[10px] text-slate-400 bg-red-50/30">
                  고난도 {highDiffCount}문항 중 소견이 기록된 {highEvidence.length}개입니다
                </p>
              )}
            </div>
          )}

          <div className="space-y-2 pt-3">
            {killerPatterns.map(kp => {
              const isOpen = expandedUnits.has(kp.unitName);
              const trapCount = kp.patterns.length;
              const creativeCount = kp.patterns.filter(
                p => p.difficultyLevel === 'creative' || p.difficultyLevel === '5',
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
                              (pattern.difficultyLevel === 'creative' || pattern.difficultyLevel === '5')
                                ? '#FECACA'
                                : '#FDE68A',
                            backgroundColor:
                              (pattern.difficultyLevel === 'creative' || pattern.difficultyLevel === '5')
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
                                  (pattern.difficultyLevel === 'creative' || pattern.difficultyLevel === '5')
                                    ? '#ef4444'
                                    : '#f59e0b',
                              }}
                            >
                              {(pattern.difficultyLevel === 'creative' || pattern.difficultyLevel === '5') ? '5' : '4'}
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
