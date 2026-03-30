'use client';

import { useState, useMemo } from 'react';
import { Link2, ChevronDown, ArrowRight } from 'lucide-react';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import { findGradeConnections } from '@/lib/exam-analysis/data/curriculum-strategies';

interface GradeConnectionsSectionProps {
  questions: AnalyzedQuestion[];
  isSectionExpanded: boolean;
  onToggleSection: () => void;
}

const IMPORTANCE_STYLES: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  critical: {
    label: '필수',
    bg: '#FEF2F2',
    text: '#991B1B',
    border: '#FECACA',
    dot: '#ef4444',
  },
  high: {
    label: '중요',
    bg: '#FFF7ED',
    text: '#9A3412',
    border: '#FED7AA',
    dot: '#f59e0b',
  },
  recommended: {
    label: '권장',
    bg: '#FEFCE8',
    text: '#854D0E',
    border: '#FDE68A',
    dot: '#eab308',
  },
};

export function GradeConnectionsSection({
  questions,
  isSectionExpanded,
  onToggleSection,
}: GradeConnectionsSectionProps) {
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());

  // 학년 연계 탐색
  const connections = useMemo(() => findGradeConnections(questions), [questions]);

  // critical 수 기준 정렬
  const sorted = useMemo(() => {
    return [...connections].sort((a, b) => {
      const aCritical = a.connections.filter(c => c.importance === 'critical').length;
      const bCritical = b.connections.filter(c => c.importance === 'critical').length;
      return bCritical - aCritical;
    });
  }, [connections]);

  const toggleUnit = (name: string) => {
    setExpandedUnits(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // 연계 데이터가 없으면 렌더하지 않음
  if (connections.length === 0) return null;

  return (
    <div className="border rounded-sm overflow-hidden bg-white">
      {/* 섹션 헤더 */}
      <button
        onClick={onToggleSection}
        className="w-full px-4 py-3.5 flex items-center gap-3 bg-white hover:bg-slate-50 transition-colors"
      >
        <div className="w-7 h-7 rounded-sm bg-orange-500/15 flex items-center justify-center shrink-0">
          <Link2 className="w-3.5 h-3.5 text-orange-600" />
        </div>
        <div className="flex-1 text-left">
          <span className="text-sm font-semibold text-slate-800">학년별 연계 경고</span>
          <span className="text-xs text-slate-400 ml-2">
            선수학습이 중요한 단원
          </span>
        </div>
        <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold bg-orange-100 text-orange-700 shrink-0">
          {connections.length}개 단원
        </span>
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
            {sorted.map(gc => {
              const isOpen = expandedUnits.has(gc.majorUnit);
              const criticalCount = gc.connections.filter(
                c => c.importance === 'critical',
              ).length;

              return (
                <div
                  key={gc.majorUnit}
                  className="rounded-sm border border-slate-100 overflow-hidden"
                >
                  {/* 단원 행 */}
                  <button
                    onClick={() => toggleUnit(gc.majorUnit)}
                    className="w-full px-3 py-2.5 flex items-center gap-2.5 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-orange-500" />
                    <span className="text-sm font-medium text-slate-800 text-left flex-1 min-w-0 truncate">
                      {gc.majorUnit}
                    </span>

                    {/* 필수 배지 */}
                    {criticalCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-medium bg-red-100 text-red-700 shrink-0">
                        필수 {criticalCount}
                      </span>
                    )}

                    <span className="text-xs text-slate-400 shrink-0">
                      {gc.connections.length}개 연계
                    </span>

                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* 확장: 연계 카드 */}
                  {isOpen && (
                    <div className="border-t border-slate-100 bg-white px-4 py-3 space-y-2.5">
                      {gc.connections.map((conn, idx) => {
                        const style = IMPORTANCE_STYLES[conn.importance] || IMPORTANCE_STYLES.recommended;

                        return (
                          <div
                            key={idx}
                            className="rounded-sm border p-3"
                            style={{
                              borderColor: style.border,
                              backgroundColor: style.bg,
                            }}
                          >
                            {/* 중요도 배지 + 학년 흐름 */}
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold text-white shrink-0"
                                style={{ backgroundColor: style.dot }}
                              >
                                {style.label}
                              </span>
                              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                                <span>{conn.fromGrade}</span>
                                <ArrowRight className="w-3 h-3 text-slate-400" />
                                <span>{conn.toGrade}</span>
                              </div>
                            </div>

                            {/* 경고 메시지 */}
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {conn.warning}
                            </p>
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
