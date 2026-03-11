'use client';

import { DOMAIN_LABELS, DOMAIN_COLORS } from '@/types';
import type { LevelTestDomain } from '@/types';

interface DomainScoreBarProps {
  domain: LevelTestDomain;
  accuracy: number;
  correct?: number;
  total?: number;
}

export function DomainScoreBar({ domain, accuracy, correct, total }: DomainScoreBarProps) {
  const colors = DOMAIN_COLORS[domain];
  const label = DOMAIN_LABELS[domain];

  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs font-semibold w-20 shrink-0 ${colors.text}`}>
        {label}
      </span>
      <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden relative">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colors.bg.replace('100', '400')}`}
          style={{ width: `${Math.min(accuracy, 100)}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700">
          {accuracy}%
          {total !== undefined && correct !== undefined && (
            <span className="text-slate-400 ml-1">({correct}/{total})</span>
          )}
        </span>
      </div>
    </div>
  );
}
