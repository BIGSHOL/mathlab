'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { EnglishTopicStrategyGroup } from '@/lib/exam-analysis/shared/english-topic-strategy';
import { formatPoints } from '@/lib/exam-analysis/shared/points';
import { QuestionEvidenceList } from './QuestionEvidenceList';

/**
 * 영어 단원별 학습 전략.
 *
 * 전략이 매칭된 단원에만 전략을 보여주고, 못 맞춘 단원에는 **아무 문장도 만들지 않는다.**
 * 억지로 채우면 틀린 특정 조언이 되고, 그건 일반론보다 나쁘다.
 */
export function EnglishTopicStrategies({ groups }: { groups: EnglishTopicStrategyGroup[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  if (groups.length === 0) return null;

  const toggle = (t: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  return (
    <div className="space-y-2">
      {groups.map((g) => {
        const isOpen = open.has(g.topic);
        return (
          <div key={g.topic} className="rounded-sm border border-slate-100 overflow-hidden">
            <button
              onClick={() => toggle(g.topic)}
              className="w-full px-3 py-2.5 flex items-center gap-2 bg-slate-50/50 hover:bg-slate-50 transition-colors"
            >
              <span className="text-sm font-medium text-slate-800 text-left flex-1 min-w-0 truncate">
                {g.leaf}
              </span>
              {g.strategies.length > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded-sm text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0"
                  title={g.unit ? `커리큘럼 단원: ${g.unit}` : undefined}
                >
                  전략 {g.strategies.length}
                </span>
              )}
              <span className="text-xs text-slate-500 shrink-0 tabular-nums">
                {g.questionCount}문항 · {formatPoints(g.points)}점
              </span>
              <span className="text-xs font-semibold text-slate-700 shrink-0 tabular-nums w-9 text-right">
                {g.percent}%
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isOpen && (
              <div className="border-t border-slate-100 bg-white px-3 py-2.5 space-y-2.5">
                {/* 이 시험의 근거를 먼저 — 구체적인 것이 앞이다 */}
                {g.evidence.length > 0 && (
                  <QuestionEvidenceList items={g.evidence} keyPrefix={`ets-${g.leaf}`} />
                )}

                {g.strategies.length > 0 && (
                  <div className="bg-indigo-50/50 rounded-sm p-2.5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold text-white bg-primary">
                        교육과정 맞춤
                      </span>
                      {g.unit && <span className="text-[11px] font-medium text-slate-600">{g.unit}</span>}
                    </div>
                    <ul className="space-y-1">
                      {g.strategies.map((s, i) => (
                        <li key={i} className="text-[11px] text-slate-700 flex items-start gap-1.5 leading-relaxed">
                          <span className="w-1 h-1 rounded-full mt-1.5 shrink-0 bg-indigo-400" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
