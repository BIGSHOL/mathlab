'use client';

import { Star } from 'lucide-react';

interface XpBadgeProps {
  totalXp: number;
  level: number;
}

export function XpBadge({ totalXp, level }: XpBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-xp-gold to-amber-500 text-white text-sm font-bold shadow-sm">
      <Star className="w-4 h-4" />
      <span>Lv.{level}</span>
      <span className="opacity-80">|</span>
      <span>{totalXp.toLocaleString()} XP</span>
    </div>
  );
}
