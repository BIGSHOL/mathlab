'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Target, ChevronRight, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface ExamPrepCampaign {
  enrollmentId: string;
  title: string;
  schoolName: string | null;
  examDate: string;
  daysLeft: number;
  progressPct: number;
  todayDay: { activities: { completed: boolean }[] } | null;
}

/**
 * 학생 대시보드용 내신대비 위젯
 *
 * 활성 캠페인 1개(가장 임박한 시험)를 강조하여 노출.
 * - D-day 카운터
 * - 진도율
 * - 오늘 남은 활동 수
 * - /exam-prep 페이지로 이동 링크
 */
export function ExamPrepWidget() {
  const [campaigns, setCampaigns] = useState<ExamPrepCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/student/exam-prep')
      .then((r) => r.json())
      .then((j) => setCampaigns(j.data ?? []))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (campaigns.length === 0) return null;

  // 가장 임박한 시험 (daysLeft >= 0 중 최소)
  const sorted = [...campaigns]
    .filter((c) => c.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);
  const primary = sorted[0];
  if (!primary) return null;

  const todayPending = primary.todayDay
    ? primary.todayDay.activities.filter((a) => !a.completed).length
    : 0;
  const todayTotal = primary.todayDay?.activities.length ?? 0;

  return (
    <Link href="/exam-prep" className="block">
      <Card padding="base" className="rounded-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-text-primary">내신대비</h2>
            {campaigns.length > 1 && (
              <span className="text-xs text-slate-400">+{campaigns.length - 1}</span>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-text-primary truncate">{primary.title}</h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{primary.schoolName}</p>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(primary.examDate).toLocaleDateString('ko-KR')}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <div
              className={`text-2xl font-bold ${
                primary.daysLeft <= 7 ? 'text-red-600' : 'text-primary'
              }`}
            >
              {primary.daysLeft === 0 ? 'D-DAY' : `D-${primary.daysLeft}`}
            </div>
          </div>
        </div>

        {/* 진도 바 */}
        <div className="mb-2">
          <div className="flex justify-between text-xs text-text-secondary mb-1">
            <span>진도</span>
            <span className="font-semibold">{primary.progressPct}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary-hover"
              style={{ width: `${primary.progressPct}%` }}
            />
          </div>
        </div>

        {/* 오늘 할 일 */}
        {todayTotal > 0 && (
          <div className="text-xs text-slate-600 mt-2 pt-2 border-t border-slate-100">
            오늘 학습 <span className="font-semibold text-primary">{todayPending}/{todayTotal}</span>{' '}
            {todayPending > 0 ? '남음' : '완료!'}
          </div>
        )}
      </Card>
    </Link>
  );
}
