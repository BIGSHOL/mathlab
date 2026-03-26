'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RotateCcw, BookOpen, CheckCircle2, ChevronRight, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ReviewStats {
  pendingCount: number;
  completedToday: number;
  totalCompleted: number;
}

interface ReviewItem {
  id: string;
  interval: number;
  streak: number;
  sourceType: string;
  question: { id: string; chapter: string; difficulty: string } | null;
  concept: { id: string; title: string; chapter: string; conceptCode: string } | null;
}

const INTERVAL_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: '즉시복습', color: 'text-rose-700 bg-rose-50' },
  3: { label: '3일차', color: 'text-red-600 bg-red-50' },
  7: { label: '1주차', color: 'text-orange-600 bg-orange-50' },
  14: { label: '2주차', color: 'text-amber-600 bg-amber-50' },
  30: { label: '1달차', color: 'text-blue-600 bg-blue-50' },
  60: { label: '2달차', color: 'text-purple-600 bg-purple-50' },
};

export function ReviewReminderCard() {
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/learning/reviews/today')
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setStats(json.data.stats);
          setReviews(json.data.reviews?.slice(0, 5) ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats || stats.pendingCount === 0) return null;

  return (
    <Card padding="base" className="border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-sm bg-amber-100 flex items-center justify-center">
            <RotateCcw className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">오늘의 복습</h3>
            <p className="text-xs text-text-secondary">
              {stats.completedToday > 0 && `${stats.completedToday}개 완료 · `}
              {stats.pendingCount}개 남음
            </p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
          {stats.pendingCount}
        </span>
      </div>

      <div className="space-y-1.5">
        {reviews.map((review) => {
          const intervalInfo = INTERVAL_LABELS[review.interval] ?? INTERVAL_LABELS[3];
          const isQuestion = !!review.question;
          const label = isQuestion
            ? `${review.question!.chapter} (${review.question!.difficulty})`
            : review.concept?.title ?? '개념 복습';
          const href = isQuestion
            ? `/my-tests` // 문제 복습은 시험 페이지로
            : `/concepts/${review.concept?.conceptCode ?? review.concept?.id}`;

          return (
            <Link key={review.id} href={href}>
              <div className="flex items-center gap-2 p-2 rounded-sm bg-white/70 hover:bg-white border border-amber-100/50 hover:border-amber-200 transition-all group cursor-pointer">
                <div className="w-6 h-6 rounded-sm bg-slate-100 flex items-center justify-center shrink-0">
                  {isQuestion ? (
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">{label}</p>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${intervalInfo.color}`}>
                  {intervalInfo.label}
                </span>
                {review.streak > 0 && (
                  <span className="text-[10px] text-emerald-600 font-bold shrink-0">
                    {review.streak}연속
                  </span>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-primary shrink-0" />
              </div>
            </Link>
          );
        })}
      </div>

      {stats.pendingCount > 5 && (
        <div className="mt-2 text-center">
          <Button variant="ghost" size="sm" className="text-xs text-amber-700">
            전체 {stats.pendingCount}개 보기
          </Button>
        </div>
      )}

      {stats.totalCompleted > 0 && (
        <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-text-secondary">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          총 {stats.totalCompleted}개 복습 완료
        </div>
      )}
    </Card>
  );
}
