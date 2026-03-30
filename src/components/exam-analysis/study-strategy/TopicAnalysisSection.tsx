'use client';

import { useState, useMemo } from 'react';
import { BookOpen, ChevronDown, Star } from 'lucide-react';
import type { ChapterGroup } from './types';
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS } from './constants';

interface TopicAnalysisSectionProps {
  chapterGroups: ChapterGroup[];
  totalPoints: number;
  is4Level: boolean;
  isSectionExpanded: boolean;
  onToggleSection: () => void;
}

const CHAPTER_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#06b6d4', '#ef4444', '#84cc16', '#6366f1', '#14b8a6',
];

export function TopicAnalysisSection({
  chapterGroups,
  totalPoints,
  is4Level,
  isSectionExpanded,
  onToggleSection,
}: TopicAnalysisSectionProps) {
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  // 전체 통계
  const totalTopics = useMemo(
    () => chapterGroups.reduce((s, g) => s + g.topics.length, 0),
    [chapterGroups],
  );

  const toggleChapter = (name: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedChapters(new Set());
    } else {
      setExpandedChapters(new Set(chapterGroups.map(g => g.chapterName)));
    }
    setAllExpanded(!allExpanded);
  };

  if (chapterGroups.length === 0) {
    return (
      <div className="text-xs text-slate-400 text-center py-6">
        단원 분석 데이터가 없습니다
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
        <div className="w-7 h-7 rounded-sm bg-blue-500/15 flex items-center justify-center shrink-0">
          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
        </div>
        <div className="flex-1 text-left">
          <span className="text-sm font-semibold text-slate-800">출제 영역별 상세 분석</span>
          <span className="text-xs text-slate-400 ml-2">
            {chapterGroups.length}개 대단원, {totalTopics}개 소단원, 총 {totalPoints}점
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
          {/* 모두 펼치기 / 접기 */}
          <div className="flex justify-end pt-3 pb-2">
            <button
              onClick={toggleAll}
              className="text-xs text-primary hover:underline font-medium"
            >
              {allExpanded ? '모두 접기' : '모두 펼치기'}
            </button>
          </div>

          {/* 대단원 목록 */}
          <div className="space-y-2">
            {chapterGroups.map((group, idx) => {
              const isOpen = expandedChapters.has(group.chapterName);
              const color = CHAPTER_COLORS[idx % CHAPTER_COLORS.length];
              const pctBadge = totalPoints > 0
                ? Math.round((group.totalPoints / totalPoints) * 100)
                : 0;

              // 특성 배지 판별
              const hasEssay = group.essayCount > 0;
              const isKeyChapter = group.percentage >= 25;
              const isHighDifficulty = group.avgDifficulty >= 3;

              return (
                <div key={group.chapterName} className="rounded-sm border border-slate-100 overflow-hidden">
                  {/* 대단원 행 */}
                  <button
                    onClick={() => toggleChapter(group.chapterName)}
                    className="w-full px-3 py-2.5 flex items-center gap-2.5 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    {/* 색상 점 + 대단원 이름 */}
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm font-medium text-slate-800 text-left flex-1 min-w-0 truncate">
                      {group.chapterName}
                      <span className="text-xs text-slate-400 font-normal ml-1.5">
                        ({group.topics.length}개 소단원)
                      </span>
                    </span>

                    {/* 특성 배지들 */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasEssay && (
                        <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-medium bg-amber-100 text-amber-700">
                          서술형 {group.essayNumbers.length}번
                        </span>
                      )}
                      {isKeyChapter && (
                        <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-medium bg-blue-100 text-blue-700 flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5" />
                          핵심 대단원
                        </span>
                      )}
                      {isHighDifficulty && (
                        <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-medium bg-red-100 text-red-700">
                          고난도 집중
                        </span>
                      )}
                    </div>

                    {/* 문항 수 + 배점 + 비율 */}
                    <span className="text-xs text-slate-500 shrink-0 tabular-nums">
                      {group.questionCount}문항
                    </span>
                    <span className="text-xs text-slate-500 shrink-0 tabular-nums w-10 text-right">
                      {group.totalPoints}점
                    </span>
                    <span
                      className="inline-flex px-2 py-0.5 rounded-sm text-[10px] font-bold text-white shrink-0 min-w-[36px] justify-center"
                      style={{ backgroundColor: color }}
                    >
                      {pctBadge}%
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* 소단원 목록 */}
                  {isOpen && (
                    <div className="border-t border-slate-100 bg-white">
                      {group.topics.map((topic, tIdx) => {
                        const topicPct = totalPoints > 0
                          ? Math.round((topic.totalPoints / totalPoints) * 100)
                          : 0;

                        return (
                          <div
                            key={tIdx}
                            className="px-4 py-2 flex items-center gap-2 border-b border-slate-50 last:border-b-0"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0 ml-2" />
                            <span className="text-xs text-slate-700 flex-1 min-w-0 truncate">
                              {topic.shortTopic || topic.topic}
                            </span>

                            {/* 난이도 배지 */}
                            <div className="flex gap-1 shrink-0">
                              {topic.difficulties.map((diff, dIdx) => (
                                <span
                                  key={dIdx}
                                  className="px-1 py-0.5 rounded-sm text-[9px] font-medium text-white"
                                  style={{ backgroundColor: DIFFICULTY_COLORS[diff] || '#94A3B8' }}
                                >
                                  {(is4Level ? DIFFICULTY_LABELS[diff] : diff) || diff}
                                </span>
                              ))}
                            </div>

                            <span className="text-[10px] text-slate-500 shrink-0 tabular-nums">
                              {topic.questionCount}문항
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0 tabular-nums w-8 text-right">
                              {topic.totalPoints}점
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0 w-8 text-right">
                              {topicPct}%
                            </span>
                          </div>
                        );
                      })}
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
