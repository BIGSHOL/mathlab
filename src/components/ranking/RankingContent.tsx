'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Gem } from 'lucide-react';
import { Tabs } from '@/components/ui/Tabs';
import { useFetch } from '@/hooks/useFetch';
import { TopThreePodium } from './TopThreePodium';
import { RankingList } from './RankingList';
import { RankingInsights } from './RankingInsights';
import type { RankingEntry, RankingPeriod, RankingCategory, RankingScope } from './types';

interface RankingContentProps {
  initialXpRankings: RankingEntry[];
  initialXpMyRank: number | null;
  initialGemRankings: RankingEntry[];
  initialGemMyRank: number | null;
}

const periodTabs: { key: RankingPeriod; label: string }[] = [
  { key: 'week', label: '이번 주' },
  { key: 'month', label: '이번 달' },
  { key: 'all', label: '전체' },
];

const categoryTabs: { key: RankingCategory; label: string; icon: React.ReactNode }[] = [
  { key: 'xp', label: 'XP 랭킹', icon: <Star className="w-4 h-4" /> },
  { key: 'gem', label: '보석 랭킹', icon: <Gem className="w-4 h-4" /> },
];

export function RankingContent({
  initialXpRankings,
  initialXpMyRank,
  initialGemRankings,
  initialGemMyRank,
}: RankingContentProps) {
  const [category, setCategory] = useState<RankingCategory>('xp');
  const [period, setPeriod] = useState<RankingPeriod>('week');
  const [scope, setScope] = useState<RankingScope>('tenant');

  // SSR 데이터는 category=xp, period=week, scope=tenant 기본.
  // 변경 시 API 호출
  const isXpDefault = category === 'xp' && period === 'week' && scope === 'tenant';
  const isGemDefault = category === 'gem' && scope === 'tenant';

  const needsApi = category === 'xp'
    ? !isXpDefault
    : !isGemDefault;

  const { data: apiData, loading } = useFetch<{ rankings: RankingEntry[]; myRank: number | null }>(
    needsApi ? '/api/gamification/ranking' : null,
    { limit: 50, period, category, scope },
  );

  let rankings: RankingEntry[];
  let myRank: number | null;

  if (category === 'xp') {
    rankings = isXpDefault ? initialXpRankings : (apiData?.rankings ?? []);
    myRank = isXpDefault ? initialXpMyRank : (apiData?.myRank ?? null);
  } else {
    rankings = isGemDefault ? initialGemRankings : (apiData?.rankings ?? []);
    myRank = isGemDefault ? initialGemMyRank : (apiData?.myRank ?? null);
  }

  const isLoading = needsApi && loading;

  const top3 = rankings.slice(0, 3);
  const rest = rankings.slice(3);

  // 급상승: XP에서만 유의미
  const hotRisers = category === 'xp'
    ? [...rankings].filter((r) => r.weeklyXp > 0).sort((a, b) => b.weeklyXp - a.weeklyXp).slice(0, 5)
    : [];

  const bigFallers = category === 'xp'
    ? [...rankings].filter((r) => r.rankChange < 0).sort((a, b) => a.rankChange - b.rankChange).slice(0, 3)
    : [];

  return (
    <div>
      {/* 카테고리 탭 (XP | 보석) */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center bg-slate-100 rounded-sm p-0.5">
          {categoryTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setCategory(tab.key);
                // 보석 랭킹은 기간 탭 불필요
                if (tab.key === 'gem') setPeriod('all');
                else setPeriod('week');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                category === tab.key
                  ? 'bg-white text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* 스코프 토글 (우리 지점 | 전체) */}
        <div className="flex items-center bg-slate-100 rounded-sm p-0.5 ml-auto">
          {(['tenant', 'all'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                scope === s
                  ? 'bg-white text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {s === 'tenant' ? '우리 지점' : '전체'}
            </button>
          ))}
        </div>
      </div>

      {/* 기간 탭 (XP에서만 표시) */}
      {category === 'xp' && (
        <div className="mb-6">
          <Tabs items={periodTabs} activeKey={period} onChange={setPeriod} />
        </div>
      )}

      {/* 포디움 */}
      {!isLoading && top3.length >= 3 && (
        <TopThreePodium top3={top3} category={category} />
      )}

      {/* 내 순위 배너 (상위 목록에 없을 때) */}
      {myRank && myRank > rankings.length && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/5 border-2 border-primary/20 rounded-sm p-4 flex items-center justify-between mb-4"
        >
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold text-text-primary">내 순위</span>
          </div>
          <span className="text-xl font-extrabold text-primary">{myRank}위</span>
        </motion.div>
      )}

      {/* 2열 레이아웃: 메인 랭킹 + 인사이트 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2">
          <RankingList rankings={rest} startRank={4} loading={isLoading} category={category} />
        </div>
        <div>
          {!isLoading && (
            <RankingInsights
              hotRisers={hotRisers}
              bigFallers={bigFallers}
              totalStudents={rankings.length}
              period={period}
              category={category}
              rankings={rankings}
            />
          )}
        </div>
      </div>
    </div>
  );
}
