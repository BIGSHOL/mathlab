'use client';

import { useCallback } from 'react';
import { useStreakCheck } from './useStreakCheck';
import { useBadgeCheck } from './useBadgeCheck';

/**
 * 활동 완료 후 출석 마일스톤 + 뱃지 통합 체크.
 * XP를 획득하는 모든 활동 완료 핸들러에서 호출.
 */
export function usePostActivityCheck() {
  const { checkStreak } = useStreakCheck();
  const { checkBadges, newBadges, clearBadges } = useBadgeCheck();

  const runChecks = useCallback(async () => {
    await Promise.allSettled([checkStreak(), checkBadges()]);
  }, [checkStreak, checkBadges]);

  return { runChecks, newBadges, clearBadges };
}
