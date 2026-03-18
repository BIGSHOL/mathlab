'use client';

import type { LucideIcon } from 'lucide-react';

export function InfoBox({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon?: LucideIcon }) {
  return (
    <div className="bg-slate-50 rounded-sm p-3">
      <div className="flex items-center gap-1 text-xs text-text-secondary mb-0.5">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </div>
      <div className="text-sm font-semibold text-text-primary">{value}</div>
      {sub && <div className="text-xs text-text-secondary mt-0.5">{sub}</div>}
    </div>
  );
}
