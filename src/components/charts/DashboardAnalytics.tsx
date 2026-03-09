'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertTriangle, CheckCircle2, Clock, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import WeeklyTrendChart from './WeeklyTrendChart';

interface DashboardData {
  weeklyWrongRate: { week: string; rate: number; total: number; wrong: number }[];
  chapterAchievement: { chapter: string; total: number; correct: number; rate: number }[];
  assignmentStats: {
    assigned: number;
    completed: number;
    overdue: number;
    inProgress: number;
    total: number;
    completionRate: number;
  };
  weekSummary: {
    totalAnswers: number;
    wrongAnswers: number;
    wrongRate: number;
    completedAttempts: number;
  };
}

export default function DashboardAnalytics() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/dashboard')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data) setData(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  const { weeklyWrongRate, chapterAchievement, assignmentStats, weekSummary } = data;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left: Weekly trend + Week summary */}
      <div className="lg:col-span-3 flex flex-col gap-4">
        {/* Week summary mini cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <BarChart3 className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-semibold text-text-secondary">이번 주 풀이</span>
            </div>
            <p className="text-xl font-black text-text-primary">{weekSummary.totalAnswers}<span className="text-sm text-slate-400 font-bold ml-0.5">문제</span></p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-[11px] font-semibold text-text-secondary">이번 주 오답률</span>
            </div>
            <p className={`text-xl font-black ${
              weekSummary.wrongRate <= 30 ? 'text-emerald-600' :
              weekSummary.wrongRate >= 50 ? 'text-red-600' : 'text-amber-600'
            }`}>
              {weekSummary.wrongRate}<span className="text-sm text-slate-400 font-bold ml-0.5">%</span>
            </p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[11px] font-semibold text-text-secondary">완료된 시험</span>
            </div>
            <p className="text-xl font-black text-text-primary">{weekSummary.completedAttempts}<span className="text-sm text-slate-400 font-bold ml-0.5">건</span></p>
          </div>
        </div>

        {/* Weekly wrong rate chart */}
        <Card variant="glass" className="p-5">
          <h3 className="text-text-primary text-base font-bold mb-1">주간 오답률 추이</h3>
          <p className="text-xs text-text-secondary mb-3">최근 4주간 오답 비율 변화</p>
          <WeeklyTrendChart
            data={weeklyWrongRate}
            label="오답률"
            color="#ef4444"
            invertColor
          />
        </Card>
      </div>

      {/* Right: Chapter achievement + Assignment stats */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        {/* Assignment stats */}
        <Card className="p-4">
          <h3 className="text-text-primary text-sm font-bold flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-primary" /> 배정 현황
          </h3>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-blue-50 rounded-lg p-2.5 text-center">
              <p className="text-lg font-black text-blue-600">{assignmentStats.assigned}</p>
              <p className="text-[10px] text-text-secondary font-medium">배정됨</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-2.5 text-center">
              <p className="text-lg font-black text-amber-600">{assignmentStats.inProgress}</p>
              <p className="text-[10px] text-text-secondary font-medium">진행 중</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-2.5 text-center">
              <p className="text-lg font-black text-emerald-600">{assignmentStats.completed}</p>
              <p className="text-[10px] text-text-secondary font-medium">완료</p>
            </div>
            <div className="bg-red-50 rounded-lg p-2.5 text-center">
              <p className="text-lg font-black text-red-600">{assignmentStats.overdue}</p>
              <p className="text-[10px] text-text-secondary font-medium">기한 초과</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all"
                style={{ width: `${assignmentStats.completionRate}%` }}
              />
            </div>
            <span className="text-xs font-bold text-text-primary">{assignmentStats.completionRate}%</span>
          </div>
          <p className="text-[10px] text-text-secondary mt-1">전체 수행률</p>
        </Card>

        {/* Chapter achievement */}
        <Card className="p-4 flex-1">
          <h3 className="text-text-primary text-sm font-bold flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-primary" /> 단원별 정답률 (30일)
          </h3>
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[220px]">
            {chapterAchievement.length === 0 ? (
              <p className="text-text-secondary text-xs text-center py-4">데이터 없음</p>
            ) : (
              chapterAchievement.map((ch) => (
                <div key={ch.chapter} className="flex items-center gap-2">
                  <span className="text-[11px] text-text-secondary w-20 truncate shrink-0" title={ch.chapter}>
                    {ch.chapter.length > 8 ? ch.chapter.slice(0, 8) + '…' : ch.chapter}
                  </span>
                  <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all flex items-center justify-end pr-1.5 ${
                        ch.rate >= 80 ? 'bg-emerald-400' :
                        ch.rate >= 60 ? 'bg-amber-400' :
                        'bg-red-400'
                      }`}
                      style={{ width: `${Math.max(ch.rate, 8)}%` }}
                    >
                      <span className="text-[9px] font-bold text-white">{ch.rate}%</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-text-secondary w-10 text-right shrink-0">
                    {ch.total}문제
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
