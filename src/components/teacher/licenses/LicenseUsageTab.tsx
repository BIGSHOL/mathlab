'use client';

import { useState, useEffect, useCallback } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { LICENSE_FEATURE_INFO, LICENSE_FEATURES_ORDERED } from '@/lib/constants/license-hub';
import { UserX } from 'lucide-react';
import type { LicenseFeature } from '@prisma/client';

interface FeatureStatData {
  feature: LicenseFeature;
  maxSeats: number;
  usedSeats: number;
  expiresAt: string | null;
  isActive: boolean;
  assignedStudentCount: number;
  activeStudentCount: number;
  dailyActivity: Array<{ date: string; count: number }>;
  inactiveStudents: Array<{ id: string; name: string; classroom: string | null }>;
}

export default function LicenseUsageTab() {
  const [stats, setStats] = useState<FeatureStatData[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [selectedFeature, setSelectedFeature] = useState<LicenseFeature | 'ALL'>('ALL');

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/licenses/usage?days=${days}`);
      const json = await res.json();
      if (json.data?.featureStats) {
        setStats(json.data.featureStats);
      }
    } catch {
      toast.error('사용 통계를 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* 기간 선택 버튼 */}
        <Skeleton className="h-9 w-40 rounded-sm" />
        {/* 사용률 비교 차트 (p-4 + 제목 + 7행 × h-5 + 범례) */}
        <Skeleton className="h-56 rounded-sm" />
        {/* 일별 활동 추이 (p-4 + 필터 + SVG h-36) */}
        <Skeleton className="h-56 rounded-sm" />
        {/* 미사용 학생 테이블 */}
        <Skeleton className="h-48 rounded-sm" />
      </div>
    );
  }

  // 일별 활동 합산 (선택 기능 또는 전체)
  const filteredStats = selectedFeature === 'ALL'
    ? stats.filter((s) => s.maxSeats > 0)
    : stats.filter((s) => s.feature === selectedFeature);

  // 일별 합산 데이터
  const dailyTotals = new Map<string, number>();
  for (const stat of filteredStats) {
    for (const day of stat.dailyActivity) {
      dailyTotals.set(day.date, (dailyTotals.get(day.date) ?? 0) + day.count);
    }
  }
  const dailyData = Array.from(dailyTotals.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
  const maxDaily = Math.max(...dailyData.map((d) => d.count), 1);

  // 미사용 학생 통합 목록
  const inactiveMap = new Map<string, { id: string; name: string; classroom: string | null; features: string[] }>();
  for (const stat of stats) {
    if (!stat.isActive) continue;
    const info = LICENSE_FEATURE_INFO[stat.feature];
    for (const student of stat.inactiveStudents) {
      if (!inactiveMap.has(student.id)) {
        inactiveMap.set(student.id, { ...student, features: [] });
      }
      inactiveMap.get(student.id)!.features.push(info.label);
    }
  }
  const inactiveList = Array.from(inactiveMap.values()).sort((a, b) => b.features.length - a.features.length);

  return (
    <div className="space-y-6">
      {/* 기간 선택 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-secondary">기간:</span>
        {[7, 30].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${
              days === d
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
            }`}
          >
            {d}일
          </button>
        ))}
      </div>

      {/* 사용률 비교 차트 */}
      <div className="p-4 rounded-sm border border-slate-200 bg-white">
        <h3 className="text-sm font-bold text-text-primary mb-4">이용권별 사용률</h3>
        <div className="space-y-3">
          {LICENSE_FEATURES_ORDERED.map((feature) => {
            const stat = stats.find((s) => s.feature === feature);
            const info = LICENSE_FEATURE_INFO[feature];
            if (!stat?.isActive) return null;

            const assignedPct = stat.assignedStudentCount > 0 ? 100 : 0;
            const activePct = stat.assignedStudentCount > 0
              ? Math.round((stat.activeStudentCount / stat.assignedStudentCount) * 100)
              : 0;

            return (
              <div key={feature} className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-24 shrink-0">
                  <info.icon className={`w-3.5 h-3.5 ${info.textColor}`} />
                  <span className="text-xs font-medium text-text-primary truncate">{info.label}</span>
                </div>
                <div className="flex-1 h-5 bg-slate-100 rounded-sm overflow-hidden relative">
                  {/* 배정 학생 (배경 바) */}
                  <div
                    className="absolute inset-y-0 left-0 bg-slate-200 rounded-sm"
                    style={{ width: `${assignedPct}%` }}
                  />
                  {/* 실제 사용 (전면 바) */}
                  <div
                    className={`absolute inset-y-0 left-0 rounded-sm ${info.color} opacity-70`}
                    style={{ width: `${activePct}%` }}
                  />
                </div>
                <div className="w-20 text-right shrink-0">
                  <span className="text-xs font-bold text-text-primary">{stat.activeStudentCount}</span>
                  <span className="text-xs text-text-secondary">/{stat.assignedStudentCount}</span>
                  <span className="text-xs text-text-secondary ml-1">({activePct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <div className="w-3 h-2 rounded-sm bg-slate-200" />
            배정 학생
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <div className="w-3 h-2 rounded-sm bg-primary opacity-70" />
            실제 사용
          </div>
        </div>
      </div>

      {/* 일별 활동 추이 */}
      <div className="p-4 rounded-sm border border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-text-primary">일별 활동 추이</h3>
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => setSelectedFeature('ALL')}
              className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                selectedFeature === 'ALL'
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
              }`}
            >
              전체
            </button>
            {LICENSE_FEATURES_ORDERED.map((f) => {
              const info = LICENSE_FEATURE_INFO[f];
              const stat = stats.find((s) => s.feature === f);
              if (!stat?.isActive) return null;
              return (
                <button
                  key={f}
                  onClick={() => setSelectedFeature(f)}
                  className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                    selectedFeature === f
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                  }`}
                >
                  {info.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* SVG 바 차트 */}
        {dailyData.length > 0 ? (
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${Math.max(dailyData.length * 50, 200)} 140`} className="w-full h-36">
              {dailyData.map((day, i) => {
                const barHeight = maxDaily > 0 ? (day.count / maxDaily) * 100 : 0;
                const x = i * 50 + 15;
                return (
                  <g key={day.date}>
                    {/* 바 */}
                    <rect
                      x={x}
                      y={110 - barHeight}
                      width={28}
                      height={barHeight}
                      rx={2}
                      className="fill-primary/60"
                    />
                    {/* 수치 */}
                    {day.count > 0 && (
                      <text
                        x={x + 14}
                        y={110 - barHeight - 4}
                        textAnchor="middle"
                        className="text-xs fill-text-secondary"
                      >
                        {day.count}
                      </text>
                    )}
                    {/* 날짜 라벨 */}
                    <text
                      x={x + 14}
                      y={128}
                      textAnchor="middle"
                      className="text-[9px] fill-text-secondary"
                    >
                      {day.date.slice(5)}
                    </text>
                  </g>
                );
              })}
              {/* 기준선 */}
              <line x1="10" y1="110" x2={dailyData.length * 50 + 10} y2="110" stroke="#e2e8f0" strokeWidth="1" />
            </svg>
          </div>
        ) : (
          <p className="text-sm text-text-secondary text-center py-8">활동 데이터가 없습니다</p>
        )}
      </div>

      {/* 미사용 학생 목록 */}
      <div className="p-4 rounded-sm border border-slate-200 bg-white">
        <div className="flex items-center gap-2 mb-4">
          <UserX className="w-4 h-4 text-text-secondary" />
          <h3 className="text-sm font-bold text-text-primary">
            이용권 미사용 학생
            {inactiveList.length > 0 && (
              <span className="ml-1.5 text-xs font-normal text-text-secondary">({inactiveList.length}명)</span>
            )}
          </h3>
        </div>

        {inactiveList.length > 0 ? (
          <div className="border border-slate-200 rounded-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-2 text-left font-medium text-text-secondary">학생</th>
                  <th className="px-3 py-2 text-left font-medium text-text-secondary">반</th>
                  <th className="px-3 py-2 text-left font-medium text-text-secondary">미사용 기능</th>
                </tr>
              </thead>
              <tbody>
                {inactiveList.slice(0, 20).map((student) => (
                  <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-3 py-2 font-medium text-text-primary">{student.name}</td>
                    <td className="px-3 py-2 text-text-secondary">{student.classroom ?? '-'}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {student.features.map((f) => (
                          <span key={f} className="px-1.5 py-0.5 text-xs font-medium bg-red-50 text-red-600 rounded">
                            {f}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {inactiveList.length > 20 && (
              <p className="px-3 py-2 text-xs text-text-secondary text-center border-t border-slate-100">
                외 {inactiveList.length - 20}명
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-text-secondary text-center py-6">모든 학생이 배정된 이용권을 사용하고 있습니다</p>
        )}
      </div>
    </div>
  );
}
