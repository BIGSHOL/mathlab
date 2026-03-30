'use client';

import { useMemo } from 'react';
import { UserCheck, ChevronDown, Check, X } from 'lucide-react';
import type { WrongAnswerSummary, ErrorTypeSummary } from './types';
import { ERROR_TYPE_LABELS } from './constants';

interface PersonalizedStrategySectionProps {
  wrongAnswerSummaries: WrongAnswerSummary[];
  errorTypeSummaries: ErrorTypeSummary[];
  totalLostPoints: number;
  totalGradedQuestions: number;
  correctCount: number;
  wrongCount: number;
  isSectionExpanded: boolean;
  onToggleSection: () => void;
}

/** 오답 비율에 따른 바 색상 */
function getLostPointsColor(lostPoints: number, maxLost: number): string {
  const ratio = maxLost > 0 ? lostPoints / maxLost : 0;
  if (ratio >= 0.7) return '#ef4444';
  if (ratio >= 0.4) return '#f59e0b';
  return '#3b82f6';
}

export function PersonalizedStrategySection({
  wrongAnswerSummaries,
  errorTypeSummaries,
  totalLostPoints,
  totalGradedQuestions,
  correctCount,
  wrongCount,
  isSectionExpanded,
  onToggleSection,
}: PersonalizedStrategySectionProps) {
  // 최대 잃은 점수 (바 스케일링용)
  const maxLost = useMemo(
    () => Math.max(...wrongAnswerSummaries.map(w => w.lostPoints), 1),
    [wrongAnswerSummaries],
  );

  // 정답률
  const correctRate = totalGradedQuestions > 0
    ? Math.round((correctCount / totalGradedQuestions) * 100)
    : 0;

  // 채점 데이터가 없으면 렌더하지 않음
  if (totalGradedQuestions === 0) return null;

  return (
    <div className="border rounded-sm overflow-hidden bg-white">
      {/* 섹션 헤더 */}
      <button
        onClick={onToggleSection}
        className="w-full px-4 py-3.5 flex items-center gap-3 bg-white hover:bg-slate-50 transition-colors"
      >
        <div className="w-7 h-7 rounded-sm bg-indigo-500/15 flex items-center justify-center shrink-0">
          <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
        </div>
        <div className="flex-1 text-left">
          <span className="text-sm font-semibold text-slate-800">맞춤형 학습 대책</span>
          <span className="text-xs text-slate-400 ml-2">
            정오답 기반 개인 맞춤 분석
          </span>
        </div>
        {totalLostPoints > 0 && (
          <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold bg-red-100 text-red-700 shrink-0">
            -{totalLostPoints}점
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
        <div className="px-4 pb-4 border-t pt-3 space-y-4">
          {/* 요약 통계 카드 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <StatCard
              label="총 채점 문항"
              value={`${totalGradedQuestions}`}
              sub="문항"
            />
            <StatCard
              label="정답"
              value={`${correctCount}`}
              sub={`${correctRate}%`}
              icon={<Check className="w-3.5 h-3.5 text-emerald-500" />}
            />
            <StatCard
              label="오답"
              value={`${wrongCount}`}
              sub={`${100 - correctRate}%`}
              icon={<X className="w-3.5 h-3.5 text-red-500" />}
            />
            <StatCard
              label="잃은 점수"
              value={`${totalLostPoints}`}
              sub="점"
              valueColor="#ef4444"
            />
          </div>

          {/* 단원별 오답 분석 */}
          {wrongAnswerSummaries.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-700 mb-2.5 flex items-center gap-1.5">
                <span className="w-1 h-4 rounded-full bg-red-400" />
                단원별 오답 분포
              </h4>
              <div className="space-y-2">
                {wrongAnswerSummaries.map((ws, i) => {
                  const barWidth = maxLost > 0
                    ? Math.max((ws.lostPoints / maxLost) * 100, 12)
                    : 12;
                  const barColor = getLostPointsColor(ws.lostPoints, maxLost);

                  return (
                    <div key={i} className="flex items-center gap-2.5">
                      <span className="w-28 text-xs text-slate-700 shrink-0 truncate font-medium">
                        {ws.shortTopic}
                      </span>
                      <div className="flex-1 bg-slate-100 rounded-sm h-5 overflow-hidden">
                        <div
                          className="h-full rounded-sm flex items-center justify-end pr-2 text-white text-[10px] font-bold transition-all"
                          style={{
                            width: `${barWidth}%`,
                            backgroundColor: barColor,
                          }}
                        >
                          -{ws.lostPoints}점
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 w-20 text-right">
                        {ws.questionNumbers.map(n => `${n}번`).join(', ')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 오답 유형 분석 */}
          {errorTypeSummaries.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-700 mb-2.5 flex items-center gap-1.5">
                <span className="w-1 h-4 rounded-full bg-amber-400" />
                오답 유형 분석
              </h4>
              <div className="space-y-1.5">
                {errorTypeSummaries.map((es, i) => {
                  const label = ERROR_TYPE_LABELS[es.errorType] || es.errorType;

                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 rounded-sm"
                    >
                      <span className="text-xs text-slate-700 font-medium flex-1 min-w-0">
                        {label}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-amber-100 text-amber-700 shrink-0">
                        {es.count}건
                      </span>
                      <span className="text-[10px] text-red-500 font-medium shrink-0 w-14 text-right">
                        -{es.totalLostPoints}점
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 통계 카드 서브 컴포넌트 ──

function StatCard({ label, value, sub, valueColor, icon }: {
  label: string;
  value: string;
  sub: string;
  valueColor?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-slate-50 rounded-sm p-3 text-center">
      <p className="text-[10px] font-medium text-slate-500 mb-1">{label}</p>
      <div className="flex items-center justify-center gap-1">
        {icon}
        <span
          className="text-base font-bold text-slate-800"
          style={valueColor ? { color: valueColor } : undefined}
        >
          {value}
        </span>
        <span className="text-[10px] text-slate-400">{sub}</span>
      </div>
    </div>
  );
}
