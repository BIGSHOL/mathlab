'use client';

import { Star } from 'lucide-react';

interface PointToastProps {
  amount: number;
  visible: boolean;
}

export function PointToast({ amount, visible }: PointToastProps) {
  if (!visible) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
      <div className="flex items-center gap-2 px-5 py-3 rounded-sm bg-gradient-to-r from-xp-gold to-amber-500 text-white font-bold shadow-lg">
        <Star className="w-5 h-5" />
        <span>+{amount} XP!</span>
      </div>
    </div>
  );
}
