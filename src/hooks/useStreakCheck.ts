'use client';

import { useCallback } from 'react';
import { useGamificationStore } from '@/stores/gamificationStore';
import { useXpNotification } from '@/stores/xp-notification';

export function useStreakCheck() {
  const checkStreak = useCallback(async () => {
    try {
      const res = await fetch('/api/gamification/streak-check', { method: 'POST' });
      if (!res.ok) return;
      const json = await res.json();
      const milestone = json.data?.milestone;
      if (milestone) {
        if (milestone.bonusXp > 0) {
          useXpNotification.getState().show(milestone.bonusXp);
        }
        useGamificationStore.getState().triggerCelebration({
          id: `streak-${milestone.days}`,
          type: 'streak_milestone',
          title: milestone.celebrationTitle,
          subtitle: milestone.celebrationSubtitle,
          soundId: 'streak',
        });
      }
    } catch {
      // silent
    }
  }, []);

  return { checkStreak };
}
