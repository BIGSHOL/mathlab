'use client';

import { Calendar, ChevronDown } from 'lucide-react';
import { FOUR_WEEK_TIMELINE } from './constants';

interface TimelineSectionProps {
  isSectionExpanded: boolean;
  onToggleSection: () => void;
}

const WEEK_STYLES = [
  { color: '#4F46E5', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200', lineColor: 'bg-indigo-200' }, // 4주 전
  { color: '#8b5cf6', bgColor: 'bg-violet-50', borderColor: 'border-violet-200', lineColor: 'bg-violet-200' }, // 3주 전
  { color: '#f97316', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', lineColor: 'bg-orange-200' }, // 2주 전
  { color: '#ef4444', bgColor: 'bg-red-50',    borderColor: 'border-red-200',    lineColor: 'bg-red-200'    }, // 1주 전
];

export function TimelineSection({
  isSectionExpanded,
  onToggleSection,
}: TimelineSectionProps) {
  return (
    <div className="border rounded-sm overflow-hidden bg-white">
      {/* 섹션 헤더 */}
      <button
        onClick={onToggleSection}
        className="w-full px-4 py-3.5 flex items-center gap-3 bg-white hover:bg-slate-50 transition-colors"
      >
        <div className="w-7 h-7 rounded-sm bg-indigo-500/15 flex items-center justify-center shrink-0">
          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
        </div>
        <div className="flex-1 text-left">
          <span className="text-sm font-semibold text-slate-800">4주 전 학습 타임라인</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
            isSectionExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* 확장 내용 */}
      {isSectionExpanded && (
        <div className="px-4 pb-5 border-t pt-4">
          <p className="text-xs text-slate-500 mb-4">
            시험 4주 전부터 체계적으로 준비하는 로드맵입니다.
          </p>

          {/* 수직 타임라인 */}
          <div className="relative">
            {FOUR_WEEK_TIMELINE.map((week, idx) => {
              const style = WEEK_STYLES[idx % WEEK_STYLES.length];
              const isLast = idx === FOUR_WEEK_TIMELINE.length - 1;
              const weekNumber = FOUR_WEEK_TIMELINE.length - idx;

              return (
                <div key={idx} className="relative flex gap-4 pb-6 last:pb-0">
                  {/* 수직 라인 (마지막 노드 제외) */}
                  {!isLast && (
                    <div
                      className={`absolute left-[15px] top-[34px] w-0.5 ${style.lineColor}`}
                      style={{ height: 'calc(100% - 24px)' }}
                    />
                  )}

                  {/* 원형 노드 */}
                  <div className="shrink-0 z-10">
                    <div
                      className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                      style={{ backgroundColor: style.color }}
                    >
                      {weekNumber}
                    </div>
                  </div>

                  {/* 내용 */}
                  <div className="flex-1 min-w-0">
                    {/* 주차 라벨 + 제목 */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className="px-2 py-0.5 rounded-sm text-[10px] font-bold text-white"
                        style={{ backgroundColor: style.color }}
                      >
                        {week.week}
                      </span>
                      <span className="text-sm font-semibold text-slate-800">{week.title}</span>
                    </div>

                    {/* 할 일 목록 */}
                    <div className={`rounded-sm p-3 ${style.bgColor} border ${style.borderColor}`}>
                      <ul className="space-y-1.5">
                        {week.tasks.map((task, tIdx) => (
                          <li key={tIdx} className="flex items-start gap-2 text-xs text-slate-700">
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
                              style={{ backgroundColor: style.color }}
                            />
                            {task}
                          </li>
                        ))}
                      </ul>
                    </div>
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
