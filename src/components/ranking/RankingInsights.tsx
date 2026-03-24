'use client';

import { Rocket, TrendingDown, Users, Flame, Star } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { MotionStagger, MotionItem } from '@/components/ui/MotionStagger';
import { RankChangeIndicator } from './RankChangeIndicator';
import { UserAvatar } from '@/components/ui/UserAvatar';
import type { RankingEntry, RankingPeriod, RankingCategory } from './types';

interface RankingInsightsProps {
  hotRisers: RankingEntry[];
  bigFallers: RankingEntry[];
  totalStudents: number;
  period: RankingPeriod;
  category?: RankingCategory;
  rankings?: RankingEntry[];
}

const periodLabels: Record<RankingPeriod, string> = {
  week: '이번 주',
  month: '이번 달',
  all: '전체',
};

export function RankingInsights({ hotRisers, bigFallers, totalStudents, period, category = 'xp', rankings = [] }: RankingInsightsProps) {
  const avgWeeklyXp = totalStudents > 0
    ? Math.round(hotRisers.reduce((sum, r) => sum + r.weeklyXp, 0) / Math.max(hotRisers.length, 1))
    : 0;
  const avgGems = totalStudents > 0
    ? Math.round(rankings.reduce((sum, r) => sum + (r.completedGems ?? 0), 0) / totalStudents)
    : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* 급상승 */}
      {hotRisers.length > 0 && (
        <Card padding="md" className="border-2 border-orange-200/50 bg-gradient-to-br from-orange-50/50 to-amber-50/30 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Rocket className="w-4 h-4 text-orange-500" />
            <h3 className="font-bold text-text-primary text-sm">급상승</h3>
            <span className="text-[10px] font-extrabold text-orange-500 bg-orange-100 px-1.5 py-0.5 rounded">HOT</span>
          </div>
          <MotionStagger className="flex flex-col gap-2">
            {hotRisers.map((student, i) => (
              <MotionItem key={student.userId}>
                <div className={`flex items-center gap-2.5 p-2.5 rounded-lg transition-colors ${
                  student.isMe ? 'bg-primary/10 border border-primary/20' : 'bg-white/60 border border-orange-100/50'
                }`}>
                  <span className="w-5 text-center text-xs font-extrabold text-orange-400">{i + 1}</span>
                  <UserAvatar name={student.name} badgeIcon={student.badgeIcon} size="xs" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${student.isMe ? 'text-primary' : 'text-text-primary'}`}>
                      {student.name}
                      {student.isMe && <span className="text-primary ml-1">(나)</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Star className="w-3 h-3 text-emerald-500" />
                    <span className="text-xs font-bold text-emerald-600">+{student.weeklyXp}</span>
                  </div>
                </div>
              </MotionItem>
            ))}
          </MotionStagger>
        </Card>
      )}

      {/* 순위 하락 */}
      {bigFallers.length > 0 && period !== 'all' && (
        <Card padding="md" className="border border-slate-200 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-text-primary text-sm">순위 하락</h3>
          </div>
          <div className="flex flex-col gap-1.5">
            {bigFallers.map((student) => (
              <div key={student.userId} className="flex items-center gap-2.5 p-2 rounded-lg bg-blue-50/30">
                <UserAvatar name={student.name} badgeIcon={student.badgeIcon} size="xs" />
                <span className="flex-1 text-xs text-text-primary truncate">{student.name}</span>
                <RankChangeIndicator change={student.rankChange} size="sm" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 기간 통계 */}
      <Card padding="md" className="rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-text-primary text-sm">
            {category === 'gem' ? '보석 통계' : `${periodLabels[period]} 통계`}
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-lg font-extrabold text-text-primary">{totalStudents}</p>
            <p className="text-[10px] text-text-secondary font-medium">참여 학생</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-lg font-extrabold text-text-primary">
              {category === 'gem' ? avgGems : avgWeeklyXp}
            </p>
            <p className="text-[10px] text-text-secondary font-medium">
              {category === 'gem' ? '평균 보석' : '평균 XP'}
            </p>
          </div>
        </div>
        {category === 'xp' && hotRisers.length > 0 && (
          <div className="mt-3 flex items-center gap-2 bg-amber-50 rounded-lg p-2.5">
            <Flame className="w-4 h-4 text-orange-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-text-secondary">최고 상승</p>
              <p className="text-xs font-bold text-text-primary truncate">
                {hotRisers[0].name} · +{hotRisers[0].weeklyXp} XP
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
