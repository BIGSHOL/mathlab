'use client';

import { DOMAIN_LABELS, DOMAIN_COLORS } from '@/types';
import type { LevelTestDomain } from '@/types';

const DOMAINS: LevelTestDomain[] = ['CALCULATION', 'UNDERSTANDING', 'PROBLEM_SOLVING', 'REASONING'];

interface DomainSelectorProps {
  selectedDomain: LevelTestDomain | null;
  onSelect: (domain: LevelTestDomain) => void;
  size?: 'sm' | 'md';
}

export function DomainSelector({ selectedDomain, onSelect, size = 'sm' }: DomainSelectorProps) {
  return (
    <div className="flex items-center gap-1.5">
      {DOMAINS.map((domain) => {
        const isActive = selectedDomain === domain;
        const colors = DOMAIN_COLORS[domain];
        return (
          <button
            key={domain}
            onClick={() => onSelect(domain)}
            className={`rounded font-medium transition-all ${
              size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
            } ${
              isActive
                ? `${colors.bg} ${colors.text} ring-1 ring-current`
                : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            }`}
          >
            {DOMAIN_LABELS[domain]}
          </button>
        );
      })}
    </div>
  );
}
