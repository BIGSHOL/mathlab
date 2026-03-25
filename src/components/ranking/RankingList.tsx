'use client';

import { useState } from 'react';
import { Star, Flame, ChevronDown, Gem } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MotionStagger, MotionItem } from '@/components/ui/MotionStagger';
import { Skeleton } from '@/components/ui/Skeleton';
import { RankChangeIndicator } from './RankChangeIndicator';
import { UserAvatar } from '@/components/ui/UserAvatar';
import type { RankingEntry, RankingCategory } from './types';

const PAGE_SIZE = 10;

interface RankingListProps {
  rankings: RankingEntry[];
  startRank: number;
  loading?: boolean;
  category?: RankingCategory;
}

export function RankingList({ rankings, startRank, loading, category = 'xp' }: RankingListProps) {
  const [showCount, setShowCount] = useState(PAGE_SIZE);

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-sm">
            <Skeleton className="w-8 h-6 rounded" />
            <Skeleton className="w-8 h-4 rounded" />
            <Skeleton variant="circle" className="w-10 h-10" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (rankings.length === 0) {
    return (
      <Card className="p-12 text-center rounded-sm">
        <p className="text-text-secondary">표시할 순위 데이터가 없습니다.</p>
      </Card>
    );
  }

  const visible = rankings.slice(0, showCount);
  const hasMore = showCount < rankings.length;
  const remaining = rankings.length - showCount;

  return (
    <div>
      <MotionStagger className="flex flex-col gap-2">
        {visible.map((student, i) => {
          const rank = startRank + i;
          return (
            <MotionItem key={student.userId}>
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-sm border-2 transition-all ${
                  student.isMe
                    ? 'bg-primary/5 border-primary/30 animate-pulse-border'
                    : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                }`}
              >
                {/* 순위 */}
                <span className="w-8 text-center font-extrabold text-text-primary text-lg shrink-0">
                  {rank}
                </span>

                {/* 순위 변동 */}
                <div className="w-10 flex justify-center shrink-0">
                  <RankChangeIndicator change={student.rankChange} isNew={student.isNew} />
                </div>

                {/* 아바타 */}
                <UserAvatar name={student.name} badgeIcon={student.badgeIcon} size="md" />

                {/* 이름 + 레벨 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-bold text-sm truncate ${student.isMe ? 'text-primary' : 'text-text-primary'}`}>
                      {student.name}
                    </span>
                    {student.isMe && <Badge variant="info">나</Badge>}
                    {student.currentStreak >= 3 && (
                      <div className="flex items-center gap-0.5">
                        <Flame className="w-3 h-3 text-orange-500" />
                        <span className="text-xs font-bold text-orange-500">{student.currentStreak}일</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary">Lv.{student.level}</span>
                    {student.weeklyXp > 0 && (
                      <span className="text-xs font-semibold text-emerald-600">+{student.weeklyXp} XP</span>
                    )}
                  </div>
                </div>

                {/* 점수 (XP 또는 보석) */}
                <div className="text-right shrink-0">
                  {category === 'gem' ? (
                    <div className="flex items-center gap-1">
                      <Gem className="w-3.5 h-3.5 text-purple-500" />
                      <span className="font-bold text-text-primary text-sm">{student.completedGems ?? 0}개</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-bold text-text-primary text-sm">{student.totalXp.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </MotionItem>
          );
        })}
      </MotionStagger>

      {hasMore && (
        <div className="mt-3 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCount((prev) => prev + PAGE_SIZE)}
            className="text-text-secondary hover:text-text-primary border border-slate-200"
          >
            <ChevronDown className="w-4 h-4 mr-1" />
            더 보기 ({remaining}명)
          </Button>
        </div>
      )}
    </div>
  );
}
