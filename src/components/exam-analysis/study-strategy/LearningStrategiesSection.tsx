'use client';

import { useState } from 'react';
import { Lightbulb, ChevronDown } from 'lucide-react';
import type { TopicSummary } from './types';
import { DIFFICULTY_ADVICE, TYPE_STRATEGIES, DIFFICULTY_LABELS, DIFFICULTY_COLORS } from './constants';
import { findMatchingStrategies } from '@/lib/exam-analysis/data/curriculum-strategies';
import { renderInlineMath } from '@/lib/exam-analysis/rendering';

/** 근거 문항 표시 상한 — 아코디언을 연 상태라도 한 단원이 10문항이면 조언이 밀려난다. */
const EVIDENCE_LIMIT = 5;

interface LearningStrategiesSectionProps {
  topicSummaries: TopicSummary[];
  is4Level: boolean;
  isSectionExpanded: boolean;
  onToggleSection: () => void;
}

// 4대 교육과정 영역(2022 개정) 한국어 라벨 매핑 (ExpandedStrategy에서도 사용)
const _TYPE_LABELS: Record<string, string> = {
  number: '수와 연산',
  change_relation: '변화와 관계',
  shape_measure: '도형과 측정',
  data_possibility: '자료와 가능성',
  // 옛 키 호환
  algebra: '변화와 관계',
  function: '변화와 관계',
  geometry: '도형과 측정',
  statistics: '자료와 가능성',
};

/** avgDifficulty 기준 색상 반환 */
function getDifficultyColor(avgDifficulty: number): string {
  if (avgDifficulty >= 3) return '#ef4444';   // red
  if (avgDifficulty >= 2) return '#f59e0b';   // orange
  if (avgDifficulty >= 1) return '#3b82f6';   // blue
  return '#22c55e';                           // green
}

/** avgDifficulty → 난이도 키 (5단계) */
function getDifficultyKey(avgDifficulty: number): string {
  if (avgDifficulty >= 4.5) return '5';
  if (avgDifficulty >= 3.5) return '4';
  if (avgDifficulty >= 2.5) return '3';
  if (avgDifficulty >= 1.5) return '2';
  return '1';
}

export function LearningStrategiesSection({
  topicSummaries,
  is4Level,
  isSectionExpanded,
  onToggleSection,
}: LearningStrategiesSectionProps) {
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  // 난이도 높은 순 정렬
  const sorted = [...topicSummaries].sort((a, b) => b.avgDifficulty - a.avgDifficulty);

  const toggleTopic = (topic: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      return next;
    });
  };

  return (
    <div className="border rounded-sm overflow-hidden bg-white">
      {/* 섹션 헤더 */}
      <button
        onClick={onToggleSection}
        className="w-full px-4 py-3.5 flex items-center gap-3 bg-white hover:bg-slate-50 transition-colors"
      >
        <div className="w-7 h-7 rounded-sm bg-indigo-500/15 flex items-center justify-center shrink-0">
          <Lightbulb className="w-3.5 h-3.5 text-indigo-600" />
        </div>
        <div className="flex-1 text-left">
          <span className="text-sm font-semibold text-slate-800">영역별 학습 전략</span>
          <span className="text-xs text-slate-400 ml-2">
            각 단원을 클릭하여 맞춤 전략을 확인하세요
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
        <div className="px-4 pb-4 border-t">
          {sorted.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">
              학습 전략 데이터가 없습니다
            </p>
          ) : (
            <div className="space-y-2 pt-3">
              {sorted.map(topic => {
                const isOpen = expandedTopics.has(topic.shortTopic);
                const color = getDifficultyColor(topic.avgDifficulty);
                const diffKey = getDifficultyKey(topic.avgDifficulty);

                return (
                  <div
                    key={topic.shortTopic}
                    className="rounded-sm border border-slate-100 overflow-hidden"
                  >
                    {/* 단원 행 */}
                    <button
                      onClick={() => toggleTopic(topic.shortTopic)}
                      className="w-full px-3 py-2.5 flex items-center gap-2.5 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-sm font-medium text-slate-800 text-left flex-1 min-w-0 truncate">
                        {topic.shortTopic}
                      </span>
                      <span className="text-xs text-slate-500 shrink-0 tabular-nums">
                        ({topic.questionCount}문항 · {topic.totalPoints}점)
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {/* 확장: 학습 전략 */}
                    {isOpen && (
                      <ExpandedStrategy topic={topic} diffKey={diffKey} color={color} is4Level={is4Level} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** 확장 영역: 교육과정 기반 전략 우선, 없으면 유형별 폴백 */
function ExpandedStrategy({ topic, diffKey, color, is4Level }: {
  topic: TopicSummary; diffKey: string; color: string; is4Level: boolean;
}) {
  // 1. 교육과정 기반 전략 (단원별 맞춤)
  // 전체 토픽 경로 → 소단원 → 중단원 순으로 시도
  const parts = topic.topic.split(' > ').map(s => s.trim());
  let curriculumMatch = findMatchingStrategies(topic.topic);
  if (!curriculumMatch && parts.length >= 3) curriculumMatch = findMatchingStrategies(parts[2]); // 소단원
  if (!curriculumMatch && parts.length >= 2) curriculumMatch = findMatchingStrategies(parts[1]); // 중단원
  if (!curriculumMatch) curriculumMatch = findMatchingStrategies(topic.shortTopic); // shortTopic
  const hasCurriculumStrategy = curriculumMatch && curriculumMatch.strategies.length > 0;

  // 2. 유형별 폴백
  const uniqueTypes = Array.from(new Set(topic.types));

  // 3. 이 시험의 근거 — 아래 조언들은 전부 정적 카탈로그라 어느 시험에서나 같은 문장이 나온다.
  //    AI 가 이 시험지를 보고 쓴 문항 소견을 맨 위에 놓아 "그래서 이 시험은?" 에 답한다.
  //    근거가 없는 분석본(구버전·저신뢰)에서는 배열이 비어 블록 자체가 사라진다.
  const shownEvidence = topic.evidence.slice(0, EVIDENCE_LIMIT);
  const hiddenEvidence = topic.evidence.length - shownEvidence.length;

  return (
    <div className="border-t border-slate-100 bg-white px-4 py-3 space-y-3">
      {topic.evidence.length > 0 && (
        <div className="rounded-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50">
            <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold text-white bg-slate-700">
              이 시험
            </span>
            <span className="text-xs font-medium text-slate-700">
              출제 근거 {topic.evidence.length}문항
            </span>
          </div>
          <ul className="divide-y divide-slate-100">
            {shownEvidence.map((ev) => (
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
                {/* AI 생성 텍스트 — renderInlineMath 를 거치지 않으면 raw $ 가 그대로 노출된다 */}
                {ev.comment && (
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {renderInlineMath(ev.comment, `ls-c-${ev.number}`)}
                  </p>
                )}
                {ev.reason && (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    난이도 근거: {renderInlineMath(ev.reason, `ls-r-${ev.number}`)}
                  </p>
                )}
              </li>
            ))}
          </ul>
          {hiddenEvidence > 0 && (
            <p className="px-3 py-1.5 text-[10px] text-slate-400 bg-slate-50/50">
              배점이 큰 문항부터 {EVIDENCE_LIMIT}개를 보여 주고 있습니다 · 외 {hiddenEvidence}문항
            </p>
          )}
        </div>
      )}

      {/* 교육과정 기반 맞춤 전략 */}
      {hasCurriculumStrategy ? (
        <div className="bg-indigo-50/50 rounded-sm p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold text-white bg-primary">
              교육과정 맞춤
            </span>
            <span className="text-xs font-medium text-slate-700">{topic.shortTopic} 학습 전략</span>
          </div>
          <ul className="space-y-1.5">
            {curriculumMatch!.strategies.slice(0, 5).map((s: string, i: number) => (
              <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-indigo-400" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          {/* 난이도별 조언 (폴백) */}
          {DIFFICULTY_ADVICE[diffKey] && (
            <div className="bg-slate-50 rounded-sm p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold text-white" style={{ backgroundColor: color }}>
                  {is4Level ? (DIFFICULTY_LABELS[diffKey] || diffKey) : `난이도 ${topic.avgDifficulty.toFixed(1)}`}
                </span>
                <span className="text-xs font-medium text-slate-700">난이도 조언</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{DIFFICULTY_ADVICE[diffKey]}</p>
            </div>
          )}

          {/* 유형별 학습 전략 (폴백) */}
          {uniqueTypes.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-slate-700 mb-2">유형별 학습 전략</h5>
              <div className="space-y-2">
                {uniqueTypes.map(type => {
                  const strategies = TYPE_STRATEGIES[type];
                  if (!strategies) return null;
                  const TYPE_LABELS_MAP: Record<string, string> = {
                    number: '수와 연산', change_relation: '변화와 관계', shape_measure: '도형과 측정', data_possibility: '자료와 가능성',
                    algebra: '변화와 관계', function: '변화와 관계', geometry: '도형과 측정', statistics: '자료와 가능성',
                  };
                  return (
                    <div key={type} className="bg-indigo-50/50 rounded-sm p-2.5">
                      <span className="text-[10px] font-medium text-indigo-700">{TYPE_LABELS_MAP[type] || type}</span>
                      <ul className="mt-1.5 space-y-1">
                        {strategies.map((s, i) => (
                          <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                            <span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: color }} />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* 서술형 조언 */}
      {topic.essayCount > 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-sm px-3 py-2">
          서술형 {topic.essayCount}문항 포함 — 풀이 과정을 논리적으로 작성하는 연습이 필요합니다.
        </p>
      )}
    </div>
  );
}
