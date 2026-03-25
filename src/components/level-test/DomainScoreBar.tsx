'use client';

import { DOMAIN_LABELS } from '@/types';
import type { LevelTestDomain } from '@/types';

interface DomainScoreBarProps {
  domain: LevelTestDomain;
  accuracy: number;
  correct?: number;
  total?: number;
}

// 인라인 스타일로 확실한 색상 적용
const DOMAIN_BAR_COLORS: Record<LevelTestDomain, string> = {
  CALCULATION: '#3b82f6',
  UNDERSTANDING: '#22c55e',
  PROBLEM_SOLVING: '#f97316',
  REASONING: '#a855f7',
};

const DOMAIN_TEXT_COLORS: Record<LevelTestDomain, string> = {
  CALCULATION: '#2563eb',
  UNDERSTANDING: '#16a34a',
  PROBLEM_SOLVING: '#ea580c',
  REASONING: '#7c3aed',
};

export function DomainScoreBar({ domain, accuracy, correct, total }: DomainScoreBarProps) {
  const label = DOMAIN_LABELS[domain];

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-bold w-20 shrink-0" style={{ color: DOMAIN_TEXT_COLORS[domain] }}>
        {label}
      </span>
      <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(accuracy, 100)}%`, backgroundColor: DOMAIN_BAR_COLORS[domain] }}
        />
      </div>
      <span className="text-xs font-bold tabular-nums shrink-0 w-16 text-right" style={{ color: DOMAIN_TEXT_COLORS[domain] }}>
        {accuracy}%
        {total !== undefined && correct !== undefined && (
          <span className="text-slate-400 text-xs ml-0.5">({correct}/{total})</span>
        )}
      </span>
    </div>
  );
}
