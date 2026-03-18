'use client';

import type { LucideIcon } from 'lucide-react';

export function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2 mt-4">
      <Icon className="w-3.5 h-3.5 text-primary" />
      <h3 className="text-xs font-bold text-text-primary">{title}</h3>
    </div>
  );
}
