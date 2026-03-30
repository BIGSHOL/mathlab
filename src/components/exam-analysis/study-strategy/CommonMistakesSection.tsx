'use client';

import { useState, useMemo } from 'react';
import { AlertTriangle, ChevronDown, ShieldAlert, Lightbulb } from 'lucide-react';
import type { TopicSummary } from './types';
import { ERROR_TYPE_LABELS } from './constants';

interface CommonMistakesSectionProps {
  topicSummaries: TopicSummary[];
  isSectionExpanded: boolean;
  onToggleSection: () => void;
}

// 단원별 흔한 실수 유형 생성 (난이도, 유형 기반)
interface MistakeItem {
  type: string;
  description: string;
  prevention: string;
}

function generateMistakesForTopic(topic: TopicSummary): MistakeItem[] {
  const mistakes: MistakeItem[] = [];

  // 계산 관련 단원
  if (topic.types.some(t => ['calculation', 'algebra', 'equation'].includes(t))) {
    mistakes.push({
      type: 'calculation_error',
      description: '부호 처리 오류, 약분/통분 실수',
      prevention: '계산 중간 과정을 모두 적고 검산하기',
    });
  }

  // 도형/기하 관련 단원
  if (topic.types.some(t => ['geometry', 'trigonometry', 'vector'].includes(t))) {
    mistakes.push({
      type: 'concept_error',
      description: '도형 성질 혼동, 조건 누락',
      prevention: '조건을 그림에 표시하고, 성질을 하나씩 체크하기',
    });
  }

  // 응용/문제해결 관련
  if (topic.types.some(t => ['application', 'problem_solving'].includes(t))) {
    mistakes.push({
      type: 'misread',
      description: '문제 조건 오독, 구하는 것 착각',
      prevention: '문제를 2번 읽고 핵심 조건에 밑줄 치기',
    });
  }

  // 고난도 문항이 있는 경우
  if (topic.difficulties.some(d => d === 'reasoning' || d === 'creative')) {
    mistakes.push({
      type: 'process_error',
      description: '풀이 방향 오선택, 논리적 비약',
      prevention: '풀이 전 전략을 먼저 메모하고 시작하기',
    });
  }

  // 기본 실수 항상 추가
  if (mistakes.length === 0) {
    mistakes.push({
      type: 'careless_mistake',
      description: '단순 계산 실수, 답 옮겨 적기 오류',
      prevention: '검토 시간에 답안지를 꼼꼼히 확인하기',
    });
  }

  return mistakes;
}

export function CommonMistakesSection({
  topicSummaries,
  isSectionExpanded,
  onToggleSection,
}: CommonMistakesSectionProps) {
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  // 단원별 실수 목록
  const topicMistakes = useMemo(
    () =>
      topicSummaries.map(t => ({
        ...t,
        mistakes: generateMistakesForTopic(t),
      })),
    [topicSummaries],
  );

  const totalMistakes = useMemo(
    () => topicMistakes.reduce((s, t) => s + t.mistakes.length, 0),
    [topicMistakes],
  );

  const toggleTopic = (name: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  if (topicSummaries.length === 0) {
    return (
      <div className="text-xs text-slate-400 text-center py-6">
        실수 유형 데이터가 없습니다
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
        <div className="w-7 h-7 rounded-sm bg-red-500/15 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
        </div>
        <div className="flex-1 text-left">
          <span className="text-sm font-semibold text-slate-800">자주 하는 실수 유형</span>
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
          {/* 요약 */}
          <p className="text-xs text-slate-500 mb-3">
            {topicSummaries.length}개 단원에서 총 {totalMistakes}개 유형의 실수가 예상됩니다.
            단원을 펼쳐 상세 내용을 확인하세요.
          </p>

          {/* 단원별 리스트 */}
          <div className="space-y-2">
            {topicMistakes.map((topic, idx) => {
              const isOpen = expandedTopics.has(topic.topic);

              return (
                <div key={idx} className="rounded-sm border border-slate-100 overflow-hidden">
                  {/* 단원 행 */}
                  <button
                    onClick={() => toggleTopic(topic.topic)}
                    className="w-full px-3 py-2.5 flex items-center gap-2.5 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                    <span className="text-xs font-medium text-slate-800 flex-1 text-left truncate">
                      {topic.shortTopic || topic.topic}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-medium bg-red-50 text-red-600 border border-red-100 shrink-0">
                      실수 {topic.mistakes.length}개
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* 실수 상세 (확장) */}
                  {isOpen && (
                    <div className="border-t border-slate-100 bg-white px-3 py-2.5 space-y-2.5">
                      {topic.mistakes.map((mistake, mIdx) => (
                        <div key={mIdx} className="rounded-sm bg-slate-50/70 p-3">
                          {/* 실수 유형 + 설명 */}
                          <div className="flex items-start gap-2 mb-2">
                            <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <span className="text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-sm">
                                {ERROR_TYPE_LABELS[mistake.type] || mistake.type}
                              </span>
                              <p className="text-xs text-slate-700 mt-1">{mistake.description}</p>
                            </div>
                          </div>

                          {/* 예방 팁 */}
                          <div className="flex items-start gap-2 pl-5.5">
                            <Lightbulb className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-slate-600">{mistake.prevention}</p>
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
