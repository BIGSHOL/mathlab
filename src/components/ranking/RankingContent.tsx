'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { Tabs } from '@/components/ui/Tabs';
import { useFetch } from '@/hooks/useFetch';
import { TopThreePodium } from './TopThreePodium';
import { RankingList } from './RankingList';
import { RankingInsights } from './RankingInsights';
import type { RankingEntry, RankingPeriod } from './types';

interface RankingContentProps {
  initialRankings: RankingEntry[];
  initialMyRank: number | null;
}

const periodTabs: { key: RankingPeriod; label: string }[] = [
  { key: 'week', label: '이번 주' },
  { key: 'month', label: '이번 달' },
  { key: 'all', label: '전체' },
];

export function RankingContent({ initialRankings, initialMyRank }: RankingContentProps) {
  const [period, setPeriod] = useState<RankingPeriod>('week');

  // SSR 데이터는 week 기간. 다른 기간 선택 시 API 호출
  const { data: apiData, loading } = useFetch<{ rankings: RankingEntry[]; myRank: number | null }>(
    period !== 'week' ? '/api/gamification/ranking' : null,
    { limit: 50, period },
  );

  const rankings = period === 'week' ? initialRankings : (apiData?.rankings ?? []);
  const myRank = period === 'week' ? initialMyRank : (apiData?.myRank ?? null);
  const isLoading = period !== 'week' && loading;

  const top3 = rankings.slice(0, 3);
  const rest = rankings.slice(3);

  // 급상승: 기간 XP 높은 순
  const hotRisers = [...rankings]
    .filter((r) => r.weeklyXp > 0)
    .sort((a, b) => b.weeklyXp - a.weeklyXp)
    .slice(0, 5);

  // 순위 하락: rankChange 가장 큰 음수
  const bigFallers = [...rankings]
    .filter((r) => r.rankChange < 0)
    .sort((a, b) => a.rankChange - b.rankChange)
    .slice(0, 3);

  return (
    <div>
      {/* 기간 탭 */}
      <div className="mb-6">
        <Tabs items={periodTabs} activeKey={period} onChange={setPeriod} />
      </div>

      {/* 포디움 */}
      {!isLoading && top3.length >= 3 && <TopThreePodium top3={top3} />}

      {/* 내 순위 배너 (상위 목록에 없을 때) */}
      {myRank && myRank > rankings.length && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/5 border-2 border-primary/20 rounded-xl p-4 flex items-center justify-between mb-4"
        >
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold text-text-primary">내 순위</span>
          </div>
          <span className="text-xl font-extrabold text-primary">{myRank}위</span>
        </motion.div>
      )}

      {/* 2열 레이아웃: 메인 랭킹 + 인사이트 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RankingList rankings={rest} startRank={4} loading={isLoading} />
        </div>
        <div>
          {!isLoading && (
            <RankingInsights
              hotRisers={hotRisers}
              bigFallers={bigFallers}
              totalStudents={rankings.length}
              period={period}
            />
          )}
        </div>
      </div>
    </div>
  );
}
