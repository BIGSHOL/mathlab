'use client';

import { useState, useEffect } from 'react';
import { Flame, Gift } from 'lucide-react';
import { getNextMilestone, STREAK_MILESTONES } from '@/lib/constants/streak-milestones';

export function StreakProgressCard() {
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/gamification/points')
      .then((r) => r.json())
      .then((json) => {
        setStreak(json.data?.currentStreak ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || streak <= 0) return null;

  const next = getNextMilestone(streak);
  const prev = [...STREAK_MILESTONES].reverse().find((m) => m.days <= streak);

  // 진행률 계산
  const from = prev?.days ?? 0;
  const to = next?.days ?? streak;
  const progress = to > from ? Math.min(((streak - from) / (to - from)) * 100, 100) : 100;

  return (
    <div className="rounded-sm border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
          <Flame className="w-4 h-4 text-orange-500" />
        </div>
        <div>
          <p className="text-sm font-bold text-orange-700">{streak}일 연속 학습</p>
          {next && (
            <p className="text-xs text-orange-500">
              {next.days}일까지 {next.days - streak}일 남음
            </p>
          )}
        </div>
      </div>

      {/* 진행 바 */}
      {next && (
        <div className="mb-2">
          <div className="h-2 bg-orange-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 다음 보상 */}
      {next && (
        <div className="flex items-center gap-1.5 text-xs text-orange-600">
          <Gift className="w-3 h-3" />
          <span>{next.days}일 달성 시 +{next.bonusXp} XP 보너스</span>
        </div>
      )}

      {/* 모든 마일스톤 달성 */}
      {!next && (
        <p className="text-xs text-orange-600 font-medium">
          모든 마일스톤을 달성했습니다!
        </p>
      )}
    </div>
  );
}
