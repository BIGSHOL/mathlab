'use client';

import { useMemo } from 'react';
import { BarChart3, ChevronDown, BookOpen } from 'lucide-react';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import type { TopicSummary } from './types';
import { LEVEL_STRATEGIES } from './constants';

interface LevelStrategiesSectionProps {
  topicSummaries: TopicSummary[];
  questions: AnalyzedQuestion[];
  isSectionExpanded: boolean;
  onToggleSection: () => void;
}

const LEVEL_STYLES = [
  {
    borderColor: '#22c55e',
    bgColor: '#F0FDF4',
    badgeBg: '#DCFCE7',
    badgeText: '#166534',
    dotColor: '#22c55e',
  },
  {
    borderColor: '#f59e0b',
    bgColor: '#FFFBEB',
    badgeBg: '#FEF3C7',
    badgeText: '#92400E',
    dotColor: '#f59e0b',
  },
  {
    borderColor: '#ef4444',
    bgColor: '#FEF2F2',
    badgeBg: '#FEE2E2',
    badgeText: '#991B1B',
    dotColor: '#ef4444',
  },
];

export function LevelStrategiesSection({
  topicSummaries,
  questions,
  isSectionExpanded,
  onToggleSection,
}: LevelStrategiesSectionProps) {
  // 시험 난이도 기반 추천 수준 판별
  const examProfile = useMemo(() => {
    const total = questions.length || 1;
    const creativeCount = questions.filter(q => q.difficulty === 'creative').length;
    const reasoningCount = questions.filter(q => q.difficulty === 'reasoning').length;
    const hardRatio = (creativeCount + reasoningCount) / total;

    // 평균 난이도
    const avgDiff = topicSummaries.length > 0
      ? topicSummaries.reduce((s, t) => s + t.avgDifficulty, 0) / topicSummaries.length
      : 2;

    return { hardRatio, avgDiff };
  }, [questions, topicSummaries]);

  return (
    <div className="border rounded-sm overflow-hidden bg-white">
      {/* 섹션 헤더 */}
      <button
        onClick={onToggleSection}
        className="w-full px-4 py-3.5 flex items-center gap-3 bg-white hover:bg-slate-50 transition-colors"
      >
        <div className="w-7 h-7 rounded-sm bg-emerald-500/15 flex items-center justify-center shrink-0">
          <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
        </div>
        <div className="flex-1 text-left">
          <span className="text-sm font-semibold text-slate-800">수준별 학습 전략</span>
          <span className="text-xs text-slate-400 ml-2">
            현재 수준에 맞는 효과적인 학습법
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
            isSectionExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* 확장 내용 */}
      {isSectionExpanded && (
        <div className="px-4 pb-4 border-t pt-3">
          {/* 시험 프로필 안내 */}
          <div className="bg-slate-50 rounded-sm p-3 mb-4">
            <p className="text-xs text-slate-600">
              이 시험의 고난도 비율은{' '}
              <strong className="text-slate-800">
                {Math.round(examProfile.hardRatio * 100)}%
              </strong>
              이며, 평균 난이도는{' '}
              <strong className="text-slate-800">{examProfile.avgDiff.toFixed(1)}</strong>
              입니다. 아래 수준별 전략 중 본인에게 해당하는 전략을 참고하세요.
            </p>
          </div>

          {/* 3-column 그리드 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {LEVEL_STRATEGIES.map((strategy, idx) => {
              const style = LEVEL_STYLES[idx];

              return (
                <div
                  key={strategy.level}
                  className="rounded-sm p-4 border-2"
                  style={{
                    borderColor: style.borderColor,
                    backgroundColor: style.bgColor,
                  }}
                >
                  {/* 레벨 이름 + 우선순위 + 시험 맞춤 배지 */}
                  <div className="flex items-center gap-2 mb-2.5">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: style.borderColor }}
                    >
                      {idx + 1}
                    </span>
                    <span
                      className="text-sm font-bold"
                      style={{ color: style.borderColor }}
                    >
                      {strategy.level}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded-sm text-[10px] font-medium ml-auto"
                      style={{ backgroundColor: style.badgeBg, color: style.badgeText }}
                    >
                      시험 맞춤
                    </span>
                  </div>

                  {/* 목표 등급 */}
                  <p className="text-[10px] text-slate-500 mb-1.5">{strategy.targetGrade}</p>

                  {/* 설명 */}
                  <p className="text-xs text-slate-700 font-medium mb-3">
                    {strategy.description}
                  </p>

                  {/* 핵심 전략 목록 */}
                  <ul className="space-y-1.5 mb-3">
                    {strategy.coreStrategies.map((s, si) => (
                      <li
                        key={si}
                        className="text-xs text-slate-600 flex items-start gap-1.5"
                      >
                        <span
                          className="w-1 h-1 rounded-full mt-1.5 shrink-0"
                          style={{ backgroundColor: style.dotColor }}
                        />
                        {s}
                      </li>
                    ))}
                  </ul>

                  {/* 학습 시간 */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <BookOpen className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] text-slate-500">{strategy.studyHours}</span>
                  </div>

                  {/* 추천 교재 */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {strategy.recommendedBooks.map((book, bi) => (
                      <span
                        key={bi}
                        className="px-1.5 py-0.5 rounded-sm text-[10px] bg-white/80 text-slate-600 border border-slate-200"
                      >
                        {book}
                      </span>
                    ))}
                  </div>

                  {/* 핵심 원칙 (인용) */}
                  <div
                    className="rounded-sm p-2.5 border-l-2"
                    style={{ borderColor: style.borderColor, backgroundColor: 'rgba(255,255,255,0.6)' }}
                  >
                    <p className="text-[11px] text-slate-600 italic leading-relaxed">
                      &ldquo;{strategy.keyPrinciple}&rdquo;
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
