'use client';

import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useLicenses } from '@/hooks/useLicenses';
import { DailyMissionCard } from './DailyMissionCard';
import { DailyQuestionCard } from './DailyQuestionCard';
import { RevengeBanner } from './RevengeBanner';
import { StreakProgressCard } from './StreakProgressCard';
import { ClassCompetitionCard } from './ClassCompetitionCard';

/** 대시보드 게이미피케이션 섹션 — Feature Flag + 이용권 기반 렌더 */
export function DashboardGamification() {
  const { isEnabled, loading: flagsLoading } = useFeatureFlags();
  const { isLicensed, loading: licensesLoading } = useLicenses();

  if (flagsLoading || licensesLoading) return null;

  return (
    <>
      {isEnabled('daily_mission') && <DailyMissionCard />}
      {isEnabled('daily_question') && <DailyQuestionCard />}
      {isEnabled('revenge_challenge') && isLicensed('revenge') && <RevengeBanner />}
      <StreakProgressCard />
      {isEnabled('class_competition') && <ClassCompetitionCard />}
    </>
  );
}
