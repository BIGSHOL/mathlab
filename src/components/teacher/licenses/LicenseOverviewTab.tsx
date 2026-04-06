'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { LICENSE_FEATURE_INFO, LICENSE_FEATURES_ORDERED } from '@/lib/constants/license-hub';
import { Activity, ExternalLink, Users, ShieldCheck, TrendingUp, Power } from 'lucide-react';
import type { LicenseFeature } from '@prisma/client';

/** 좌석 기반이 아닌 On/Off 전용 기능 */
const TOGGLE_FEATURES: Set<LicenseFeature> = new Set(['EXAM_ANALYSIS', 'WORKSHEET']);

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

export default function LicenseOverviewTab() {
  const [stats, setStats] = useState<FeatureStatData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/licenses/usage?days=7');
      const json = await res.json();
      if (json.data?.featureStats) {
        setStats(json.data.featureStats);
      }
    } catch {
      toast.error('이용권 통계를 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-sm" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48 rounded-sm" />)}
        </div>
      </div>
    );
  }

  // 종합 통계 계산 (좌석 기반 기능만)
  const seatStats = stats.filter((s) => !TOGGLE_FEATURES.has(s.feature));
  const totalMaxSeats = seatStats.reduce((sum, s) => sum + s.maxSeats, 0);
  const totalUsedSeats = seatStats.reduce((sum, s) => sum + s.usedSeats, 0);
  const activeFeatureCount = stats.filter((s) => s.isActive && (s.maxSeats > 0 || TOGGLE_FEATURES.has(s.feature))).length;
  const totalActiveSum = stats.reduce((sum, s) => sum + s.activeStudentCount, 0);

  return (
    <div className="space-y-6">
      {/* 종합 요약 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard
          icon={<Users className="w-5 h-5 text-primary opacity-40" />}
          label="총 좌석 사용률"
          value={totalMaxSeats > 0 ? `${Math.round((totalUsedSeats / totalMaxSeats) * 100)}%` : '-'}
          sub={`${totalUsedSeats} / ${totalMaxSeats}석`}
        />
        <SummaryCard
          icon={<ShieldCheck className="w-5 h-5 text-emerald-500 opacity-40" />}
          label="활성 이용권"
          value={`${activeFeatureCount}개`}
          sub={`총 ${LICENSE_FEATURES_ORDERED.length}개 기능 중`}
        />
        <SummaryCard
          icon={<TrendingUp className="w-5 h-5 text-amber-500 opacity-40" />}
          label="7일 내 활동"
          value={`${totalActiveSum}건`}
          sub="기능별 활동 학생 합계"
        />
      </div>

      {/* 좌석 기반 기능 카드 — 활성이거나 데이터가 있는 항목만 표시 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {LICENSE_FEATURES_ORDERED.filter((f) => !TOGGLE_FEATURES.has(f)).map((feature) => {
          const info = LICENSE_FEATURE_INFO[feature];
          const stat = stats.find((s) => s.feature === feature);
          if (!stat?.isActive) return null;
          return <FeatureCard key={feature} info={info} stat={stat} />;
        })}
      </div>

      {/* On/Off 기능 — 활성인 항목만 표시 */}
      {LICENSE_FEATURES_ORDERED.filter((f) => TOGGLE_FEATURES.has(f)).some((feature) => {
        const stat = stats.find((s) => s.feature === feature);
        return stat?.isActive;
      }) && (
      <div>
        <p className="text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wider">선생님 도구 · On/Off</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {LICENSE_FEATURES_ORDERED.filter((f) => TOGGLE_FEATURES.has(f)).map((feature) => {
            const stat = stats.find((s) => s.feature === feature);
            if (!stat?.isActive) return null;
            const info = LICENSE_FEATURE_INFO[feature];
            return <ToggleFeatureCard key={feature} info={info} stat={stat} />;
          })}
        </div>
      </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, sub }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="relative p-4 rounded-sm border border-slate-200 bg-white">
      <div className="absolute top-3 right-3">{icon}</div>
      <p className="text-xs font-medium text-text-secondary">{label}</p>
      <p className="text-xl font-bold text-text-primary mt-1">{value}</p>
      <p className="text-xs text-text-secondary mt-0.5">{sub}</p>
    </div>
  );
}

function FeatureCard({ info, stat }: {
  info: typeof LICENSE_FEATURE_INFO[LicenseFeature];
  stat: FeatureStatData | undefined;
}) {
  const Icon = info.icon;
  const hasTenantLicense = stat && stat.maxSeats > 0;
  const isExpired = stat?.expiresAt && new Date(stat.expiresAt) <= new Date();
  const pct = hasTenantLicense ? Math.round((stat.usedSeats / stat.maxSeats) * 100) : 0;

  return (
    <div className={`p-4 rounded-sm border ${
      isExpired ? 'border-red-200 bg-red-50/50' : !hasTenantLicense ? 'border-slate-200 bg-slate-50/50' : 'border-slate-200 bg-white'
    }`}>
      {/* 헤더: 아이콘 + 제목 */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-sm bg-slate-100 flex items-center justify-center shrink-0">
          <Icon className={`w-5 h-5 ${info.textColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm text-text-primary">{info.label}</h4>
          <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{info.description}</p>
        </div>
      </div>

      {/* 학생 기능 태그 */}
      <div className="flex flex-wrap gap-1 mt-3">
        {info.studentCapabilities.map((cap) => (
          <span key={cap} className="px-1.5 py-0.5 text-xs font-medium bg-slate-100 text-text-secondary rounded">
            {cap}
          </span>
        ))}
      </div>

      {/* 좌석 현황 */}
      {hasTenantLicense ? (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-text-secondary">
              <span className="font-bold text-text-primary">{stat.usedSeats}</span>명 배정
              <span className="mx-1 text-slate-300">/</span>
              <span className={`font-bold ${stat.maxSeats - stat.usedSeats <= 3 ? 'text-red-500' : 'text-emerald-600'}`}>
                {stat.maxSeats - stat.usedSeats}
              </span>석 남음
            </span>
            <span className="text-text-secondary">총 {stat.maxSeats}석</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-primary'
              }`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          {isExpired && <p className="text-xs text-red-500 mt-1">만료됨</p>}
          {stat.expiresAt && !isExpired && (
            <p className="text-xs text-text-secondary mt-1">
              만료: {new Date(stat.expiresAt).toLocaleDateString('ko-KR')}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-400">미등록 — 이용권이 배정되지 않았습니다</p>
        </div>
      )}

      {/* 활동 + 관련 메뉴 */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
          <Activity className="w-3.5 h-3.5" />
          <span>7일 활동: <span className="font-bold text-text-primary">{stat?.activeStudentCount ?? 0}</span>명</span>
        </div>
        {info.teacherLinks.length > 0 && (
          <div className="flex items-center gap-2">
            {info.teacherLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
              >
                {link.label}
                <ExternalLink className="w-3 h-3" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ToggleFeatureCard({ info, stat }: {
  info: typeof LICENSE_FEATURE_INFO[LicenseFeature];
  stat: FeatureStatData | undefined;
}) {
  const Icon = info.icon;
  const isActive = stat?.isActive ?? false;

  return (
    <div className={`p-4 rounded-sm border ${isActive ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50/50'}`}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-sm bg-slate-100 flex items-center justify-center shrink-0">
          <Icon className={`w-5 h-5 ${info.textColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm text-text-primary">{info.label}</h4>
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
              isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}>
              <Power className="w-3 h-3 inline mr-0.5" />
              {isActive ? 'ON' : 'OFF'}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{info.description}</p>
        </div>
      </div>

      {/* 관련 메뉴 */}
      {info.teacherLinks.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end">
          <div className="flex items-center gap-2">
            {info.teacherLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
              >
                {link.label}
                <ExternalLink className="w-3 h-3" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
