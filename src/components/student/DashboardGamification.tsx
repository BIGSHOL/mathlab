'use client';

import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { DailyMissionCard } from './DailyMissionCard';
import { DailyQuestionCard } from './DailyQuestionCard';
import { RevengeBanner } from './RevengeBanner';

/** 대시보드 게이미피케이션 섹션 — Feature Flag 기반 렌더 */
export function DashboardGamification() {
  const { isEnabled, loading } = useFeatureFlags();

  if (loading) return null;

  return (
    <>
      {isEnabled('daily_mission') && <DailyMissionCard />}
      {isEnabled('daily_question') && <DailyQuestionCard />}
      {isEnabled('revenge_challenge') && <RevengeBanner />}
    </>
  );
}
