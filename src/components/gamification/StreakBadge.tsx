'use client';

import { Flame } from 'lucide-react';

interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  if (streak <= 0) return null;

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 text-secondary text-sm font-bold">
      <Flame className="w-4 h-4" />
      <span>{streak}일 연속!</span>
    </div>
  );
}
