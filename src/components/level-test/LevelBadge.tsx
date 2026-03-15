'use client';

import { LEVEL_COLORS } from '@/types';

interface LevelBadgeProps {
  level: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LevelBadge({ level, size = 'md' }: LevelBadgeProps) {
  const colors = LEVEL_COLORS[level] ?? { bg: 'bg-slate-100', text: 'text-slate-600' };
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-3 py-1',
  };

  return (
    <span className={`inline-flex items-center font-bold rounded-full ${colors.bg} ${colors.text} ${sizeClasses[size]}`}>
      {level}
    </span>
  );
}
