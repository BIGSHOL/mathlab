'use client';

import { useState } from 'react';
import { Lightbulb, ChevronDown } from 'lucide-react';
import type { TopicSummary } from './types';
import { DIFFICULTY_ADVICE, TYPE_STRATEGIES, DIFFICULTY_LABELS } from './constants';

interface LearningStrategiesSectionProps {
  topicSummaries: TopicSummary[];
  is4Level: boolean;
  isSectionExpanded: boolean;
  onToggleSection: () => void;
}

/** avgDifficulty 기준 색상 반환 */
function getDifficultyColor(avgDifficulty: number): string {
  if (avgDifficulty >= 3) return '#ef4444';   // red
  if (avgDifficulty >= 2) return '#f59e0b';   // orange
  if (avgDifficulty >= 1) return '#3b82f6';   // blue
  return '#22c55e';                           // green
}

/** avgDifficulty → 난이도 키 */
function getDifficultyKey(avgDifficulty: number): string {
  if (avgDifficulty >= 3.5) return 'creative';
  if (avgDifficulty >= 2.5) return 'reasoning';
  if (avgDifficulty >= 1.5) return 'pattern';
  return 'concept';
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
        <div className="w-7 h-7 rounded-sm bg-purple-500/15 flex items-center justify-center shrink-0">
          <Lightbulb className="w-3.5 h-3.5 text-purple-600" />
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
                      <div className="border-t border-slate-100 bg-white px-4 py-3 space-y-3">
                        {/* 난이도별 조언 */}
                        {DIFFICULTY_ADVICE[diffKey] && (
                          <div className="bg-slate-50 rounded-sm p-3">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span
                                className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold text-white"
                                style={{ backgroundColor: color }}
                              >
                                {is4Level
                                  ? (DIFFICULTY_LABELS[diffKey] || diffKey)
                                  : `난이도 ${topic.avgDifficulty.toFixed(1)}`}
                              </span>
                              <span className="text-xs font-medium text-slate-700">난이도 조언</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {DIFFICULTY_ADVICE[diffKey]}
                            </p>
                          </div>
                        )}

                        {/* 유형별 학습 전략 */}
                        {topic.types.length > 0 && (
                          <div>
                            <h5 className="text-xs font-semibold text-slate-700 mb-2">
                              유형별 학습 전략
                            </h5>
                            <div className="space-y-2">
                              {topic.types.map(type => {
                                const strategies = TYPE_STRATEGIES[type];
                                if (!strategies) return null;
                                return (
                                  <div key={type} className="bg-purple-50/50 rounded-sm p-2.5">
                                    <span className="text-[10px] font-medium text-purple-700 uppercase">
                                      {type}
                                    </span>
                                    <ul className="mt-1.5 space-y-1">
                                      {strategies.map((s, i) => (
                                        <li
                                          key={i}
                                          className="text-xs text-slate-600 flex items-start gap-1.5"
                                        >
                                          <span
                                            className="w-1 h-1 rounded-full mt-1.5 shrink-0"
                                            style={{ backgroundColor: color }}
                                          />
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
                      </div>
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
