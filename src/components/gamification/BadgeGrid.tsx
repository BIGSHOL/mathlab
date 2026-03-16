'use client';

import { useState, useEffect } from 'react';
import {
  Flame, Calculator, BookOpen, Zap, Trophy, Star, Crown, Swords, Award,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface BadgeData {
  id: string;
  key: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  earned: boolean;
  earnedAt: string | null;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Flame, Calculator, BookOpen, Zap, Trophy, Star, Crown, Swords,
};

const COLOR_MAP: Record<string, string> = {
  orange: 'bg-orange-100 text-orange-600',
  red: 'bg-red-100 text-red-600',
  blue: 'bg-blue-100 text-blue-600',
  purple: 'bg-purple-100 text-purple-600',
  green: 'bg-green-100 text-green-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  amber: 'bg-amber-100 text-amber-600',
  gold: 'bg-amber-100 text-amber-600',
};

export function BadgeGrid() {
  const [badges, setBadges] = useState<BadgeData[]>([]);

  useEffect(() => {
    fetch('/api/badges')
      .then((r) => r.json())
      .then((json) => { if (json.data) setBadges(json.data); })
      .catch(() => {});
  }, []);

  if (badges.length === 0) return null;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Award className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-text-primary">배지</h3>
        <span className="text-xs text-text-secondary">
          {badges.filter((b) => b.earned).length}/{badges.length}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-3">
        {badges.map((badge) => {
          const Icon = ICON_MAP[badge.icon] ?? Star;
          const colorClass = badge.earned
            ? COLOR_MAP[badge.color] ?? 'bg-slate-100 text-slate-600'
            : 'bg-slate-100 text-slate-300';

          return (
            <div key={badge.id} className="flex flex-col items-center gap-1" title={badge.description}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass} ${!badge.earned ? 'opacity-40' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-medium text-center leading-tight ${badge.earned ? 'text-text-primary' : 'text-slate-400'}`}>
                {badge.label}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
