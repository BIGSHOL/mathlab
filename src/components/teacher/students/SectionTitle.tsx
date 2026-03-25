'use client';

import type { LucideIcon } from 'lucide-react';

export function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-3 h-3 text-primary" />
      </div>
      <h3 className="text-xs font-bold text-text-primary">{title}</h3>
    </div>
  );
}
