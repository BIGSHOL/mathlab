'use client';

import { useMemo } from 'react';
import { Clock, ChevronDown, Star, Zap, AlertCircle, Lightbulb } from 'lucide-react';
import type { TopicSummary } from './types';
import { collectTimeTips } from '@/lib/exam-analysis/data/curriculum-strategies';

interface TimeAllocationSectionProps {
  topicSummaries: TopicSummary[];
  isSectionExpanded: boolean;
  onToggleSection: () => void;
}

// 단원별 추정 시간 (배점 비율 기반, 45분 시험 기준)
function estimateTime(topic: TopicSummary, totalPoints: number, examMinutes: number): number {
  if (totalPoints === 0) return 1;
  const basePct = topic.totalPoints / totalPoints;
  // 난이도 가중치 (평균 난이도가 높을수록 시간 더 할당)
  const diffMultiplier = topic.avgDifficulty >= 3 ? 1.3
    : topic.avgDifficulty >= 2 ? 1.1
    : 0.9;
  const raw = basePct * (examMinutes - 5) * diffMultiplier; // 5분은 검토용 예비
  return Math.max(1, Math.round(raw));
}

export function TimeAllocationSection({
  topicSummaries,
  isSectionExpanded,
  onToggleSection,
}: TimeAllocationSectionProps) {
  const EXAM_MINUTES = 45; // 기본 시험 시간

  const totalPoints = useMemo(
    () => topicSummaries.reduce((s, t) => s + t.totalPoints, 0),
    [topicSummaries],
  );

  // 시간 배분 계산 + 정렬 (시간 높은 순)
  const allocations = useMemo(() => {
    const items = topicSummaries.map(t => ({
      ...t,
      estimatedMinutes: estimateTime(t, totalPoints, EXAM_MINUTES),
    }));
    return items.sort((a, b) => b.estimatedMinutes - a.estimatedMinutes);
  }, [topicSummaries, totalPoints]);

  const maxMinutes = useMemo(
    () => Math.max(...allocations.map(a => a.estimatedMinutes), 1),
    [allocations],
  );

  // 가장 시간이 많이 걸리는 단원 (상위 1~2개)
  const highTimeTopics = useMemo(
    () => allocations.filter(a => a.estimatedMinutes >= maxMinutes * 0.8),
    [allocations, maxMinutes],
  );

  // 토픽별 시간 관리 팁 수집
  const timeTips = useMemo(
    () => collectTimeTips(topicSummaries.map(t => t.topic)),
    [topicSummaries],
  );

  const hasSpecificTips = timeTips.quickTips.length > 0 || timeTips.cautionTips.length > 0 || timeTips.savingTips.length > 0;

  if (topicSummaries.length === 0) {
    return (
      <div className="text-xs text-slate-400 text-center py-6">
        시간 배분 데이터가 없습니다
      </div>
    );
  }

  return (
    <div className="border rounded-sm overflow-hidden bg-white">
      {/* 섹션 헤더 */}
      <button
        onClick={onToggleSection}
        className="w-full px-4 py-3.5 flex items-center gap-3 bg-white hover:bg-slate-50 transition-colors"
      >
        <div className="w-7 h-7 rounded-sm bg-cyan-500/15 flex items-center justify-center shrink-0">
          <Clock className="w-3.5 h-3.5 text-cyan-600" />
        </div>
        <div className="flex-1 text-left">
          <span className="text-sm font-semibold text-slate-800">시험 시간 배분 전략</span>
          <span className="text-xs text-slate-400 ml-2">
            {EXAM_MINUTES}분 시험 기준
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
        <div className="px-4 pb-4 border-t space-y-4 pt-4">
          {/* 단원별 시간 바 */}
          <div className="space-y-2">
            {allocations.map((alloc, idx) => {
              const isHighTime = highTimeTopics.some(h => h.topic === alloc.topic);
              const barWidth = Math.max((alloc.estimatedMinutes / maxMinutes) * 100, 15);

              return (
                <div key={idx} className="flex items-center gap-2.5">
                  {/* 별 아이콘 (최다 시간) */}
                  <div className="w-4 shrink-0 flex justify-center">
                    {isHighTime && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                  </div>

                  {/* 단원 이름 */}
                  <span className="w-24 sm:w-32 text-xs text-slate-700 truncate shrink-0 font-medium">
                    {alloc.shortTopic || alloc.topic}
                  </span>

                  {/* 시간 바 (그라데이션 cyan → purple) */}
                  <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-full rounded-full flex items-center justify-end pr-2 text-white text-[10px] font-bold"
                      style={{
                        width: `${barWidth}%`,
                        background: 'linear-gradient(90deg, #06b6d4, #8b5cf6)',
                      }}
                    >
                      {alloc.estimatedMinutes}분
                    </div>
                  </div>

                  {/* 문항 수 + 배점 */}
                  <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">
                    {alloc.questionCount}문항 · {alloc.totalPoints}점
                  </span>
                </div>
              );
            })}

            {/* 검토 시간 */}
            <div className="flex items-center gap-2.5 pt-1 border-t border-dashed border-slate-200">
              <div className="w-4 shrink-0" />
              <span className="w-24 sm:w-32 text-xs text-slate-500 shrink-0 font-medium">
                검토 시간
              </span>
              <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                <div
                  className="h-full rounded-full flex items-center justify-end pr-2 text-white text-[10px] font-bold"
                  style={{
                    width: `${Math.max((5 / maxMinutes) * 100, 15)}%`,
                    backgroundColor: '#94a3b8',
                  }}
                >
                  5분
                </div>
              </div>
              <span className="text-[10px] text-red-500 font-medium shrink-0 whitespace-nowrap">
                필수 확보
              </span>
            </div>
          </div>

          {/* 팁 카드 — 토픽별 or 제네릭 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <TipCard
              icon={<Zap className="w-3.5 h-3.5 text-emerald-600" />}
              title="빠르게 풀기"
              items={
                hasSpecificTips && timeTips.quickTips.length > 0
                  ? timeTips.quickTips.slice(0, 3)
                  : ['개념/유형 문항은 1~2분 안에 빠르게 처리하고, 시간을 절약하세요']
              }
              bgColor="bg-emerald-50"
              borderColor="border-emerald-100"
            />
            <TipCard
              icon={<AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
              title="시간 주의"
              items={
                hasSpecificTips && timeTips.cautionTips.length > 0
                  ? timeTips.cautionTips.slice(0, 3)
                  : ['심화/서술형 문항에 시간을 과하게 쓰면 뒤 문제에 영향이 갑니다']
              }
              bgColor="bg-amber-50"
              borderColor="border-amber-100"
            />
            <TipCard
              icon={<Lightbulb className="w-3.5 h-3.5 text-indigo-600" />}
              title="절약 팁"
              items={
                hasSpecificTips && timeTips.savingTips.length > 0
                  ? timeTips.savingTips.slice(0, 3)
                  : ['모르는 문제는 3분 고민 후 표시하고 넘기세요. 마지막에 재도전!']
              }
              bgColor="bg-indigo-50"
              borderColor="border-indigo-100"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── 팁 카드 (다중 아이템 지원) ──

function TipCard({
  icon,
  title,
  items,
  bgColor,
  borderColor,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  bgColor: string;
  borderColor: string;
}) {
  return (
    <div className={`rounded-sm p-3 ${bgColor} border ${borderColor}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-xs font-semibold text-slate-800">{title}</span>
      </div>
      {items.length === 1 ? (
        <p className="text-[11px] text-slate-600 leading-relaxed">{items[0]}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-600 leading-relaxed">
              <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0 mt-1.5" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
