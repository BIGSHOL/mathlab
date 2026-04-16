'use client';

import { useState, useEffect } from 'react';
import { Flame, Gift, Snowflake, AlertTriangle } from 'lucide-react';
import { getNextMilestone, STREAK_MILESTONES } from '@/lib/constants/streak-milestones';

interface PointsData {
  currentStreak: number;
  streakFreezeCount?: number;
  hoursSinceLastActive?: number;
}

export function StreakProgressCard() {
  const [data, setData] = useState<PointsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/gamification/points')
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setData(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data || data.currentStreak <= 0) return null;

  const { currentStreak, streakFreezeCount = 0, hoursSinceLastActive = 0 } = data;

  const next = getNextMilestone(currentStreak);
  const prev = [...STREAK_MILESTONES].reverse().find((m) => m.days <= currentStreak);

  const from = prev?.days ?? 0;
  const to = next?.days ?? currentStreak;
  const progress = to > from ? Math.min(((currentStreak - from) / (to - from)) * 100, 100) : 100;

  // 스트릭 유지까지 남은 시간 (KST 자정 기준)
  // hoursSinceLastActive > 18 → 경고
  const needsWarning = hoursSinceLastActive >= 18 && hoursSinceLastActive < 48;
  const hoursLeft = Math.max(0, 24 - hoursSinceLastActive);

  return (
    <div className="rounded-sm border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-orange-700">{currentStreak}일 연속 학습</p>
            {next && (
              <p className="text-xs text-orange-500">
                {next.days}일까지 {next.days - currentStreak}일 남음
              </p>
            )}
          </div>
        </div>
        {streakFreezeCount > 0 && (
          <div
            className="flex items-center gap-1 bg-sky-100 border border-sky-200 text-sky-700 px-2 py-1 rounded-full text-xs font-bold shrink-0"
            title="스트릭 프리즈 — 하루 빠져도 자동 유지"
          >
            <Snowflake className="w-3 h-3" />
            <span>프리즈 {streakFreezeCount}개</span>
          </div>
        )}
      </div>

      {/* 경고 배너 — 학습 공백이 18시간을 넘으면 표시 */}
      {needsWarning && (
        <div className="mb-3 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <p className="text-xs font-semibold">
            {hoursLeft > 0
              ? `${hoursLeft}시간 내 학습 없으면 스트릭이 끊깁니다!`
              : '오늘 학습하지 않으면 스트릭이 리셋됩니다!'}
            {streakFreezeCount > 0 && ' (프리즈 자동 소비됨)'}
          </p>
        </div>
      )}

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
