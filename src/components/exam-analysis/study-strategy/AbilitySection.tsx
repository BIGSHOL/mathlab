'use client';

import { Brain, ChevronDown } from 'lucide-react';
import type { AbilityBreakdown } from '@/lib/exam-analysis/shared/ability-breakdown';
import { AbilityBreakdownView } from '../AbilityBreakdownView';

/**
 * 능력 영역별 배점 섹션 — 단원(무엇을 물었나) 옆에 놓이는 다른 축(어떤 힘을 물었나).
 *
 * 내용은 AbilityBreakdownView 가 그린다(영어 탭과 공유). 여기는 아코디언 껍데기만 맡는다.
 */
export function AbilitySection({
  breakdown,
  isSectionExpanded,
  onToggleSection,
}: {
  breakdown: AbilityBreakdown;
  isSectionExpanded: boolean;
  onToggleSection: () => void;
}) {
  // 능력을 하나도 못 읽으면 섹션 자체를 만들지 않는다 — 빈 헤딩은 "분석이 빠졌다"로 읽힌다
  if (breakdown.groups.length === 0) return null;

  return (
    <div className="border rounded-sm overflow-hidden bg-white">
      <button
        onClick={onToggleSection}
        className="w-full px-4 py-3.5 flex items-center gap-3 bg-white hover:bg-slate-50 transition-colors"
      >
        <div className="w-7 h-7 rounded-sm bg-teal-500/15 flex items-center justify-center shrink-0">
          <Brain className="w-3.5 h-3.5 text-teal-600" />
        </div>
        <div className="flex-1 text-left">
          <span className="text-sm font-semibold text-slate-800">능력 영역별 배점</span>
          <span className="text-xs text-slate-400 ml-2">
            {breakdown.groups.length}개 영역 · 어떤 힘을 물었는지
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isSectionExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {isSectionExpanded && (
        <div className="px-4 pb-4 border-t pt-3">
          <AbilityBreakdownView breakdown={breakdown} />
        </div>
      )}
    </div>
  );
}
