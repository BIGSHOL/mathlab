import {
  Building2,
  Users,
  KeyRound,
  Clock,
  MessageCircleQuestion,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { prisma } from '@/lib/db';
import { formatNumber } from '@/lib/utils/format';
import Link from 'next/link';
import { DashboardStatCards } from '@/components/student/DashboardStatCards';

interface Props {
  user: { id: string; name: string; role: string };
  period: string;
}

function getPeriodDate(period: string): Date | null {
  const now = new Date();
  switch (period) {
    case '7d': now.setDate(now.getDate() - 7); return now;
    case '30d': now.setDate(now.getDate() - 30); return now;
    case '90d': now.setDate(now.getDate() - 90); return now;
    default: return null;
  }
}

export default async function SuperAdminDashboard({ period }: Omit<Props, 'user'>) {
  const periodStart = getPeriodDate(period);
  const now = new Date();
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(now.getDate() + 7);

  // ── 병렬 쿼리 ──
  const [
    activeTenants,
    totalTenants,
    totalUsers,
    activeLicenses,
    expiringLicenses,
    pendingInquiries,
    tenants,
    licenseAlerts,
  ] = await Promise.all([
    prisma.tenant.count({ where: { isActive: true } }),
    prisma.tenant.count(),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.tenantLicense.count({ where: { isActive: true } }),
    prisma.tenantLicense.count({
      where: {
        isActive: true,
        expiresAt: { not: null, lte: sevenDaysLater, gte: now },
      },
    }),
    prisma.inquiry.count({ where: { status: 'PENDING' } }),
    // 지점별 현황
    prisma.tenant.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        users: {
          where: { deletedAt: null },
          select: {
            role: true,
            profile: { select: { lastActiveAt: true } },
          },
        },
        tenantLicenses: {
          where: { isActive: true },
          select: { feature: true, maxSeats: true, usedSeats: true, expiresAt: true },
        },
      },
    }),
    // 이용권 알림 (만료 임박 또는 좌석 높은 사용률)
    prisma.tenantLicense.findMany({
      where: {
        isActive: true,
        expiresAt: { not: null, lte: sevenDaysLater, gte: now },
      },
      include: { tenant: { select: { name: true, slug: true } } },
      orderBy: { expiresAt: 'asc' },
    }),
  ]);

  // 좌석 90%+ 사용 중인 이용권도 알림에 포함
  const seatAlerts = tenants.flatMap((t) =>
    t.tenantLicenses
      .filter((l) => l.maxSeats > 0 && l.usedSeats / l.maxSeats >= 0.9)
      .filter((l) => !licenseAlerts.some((a) => a.feature === l.feature && a.tenant.slug === t.slug))
      .map((l) => ({
        tenantName: t.name,
        feature: l.feature,
        usedSeats: l.usedSeats,
        maxSeats: l.maxSeats,
        expiresAt: l.expiresAt,
        type: 'seat' as const,
      })),
  );

  const allAlerts = [
    ...licenseAlerts.map((a) => ({
      tenantName: a.tenant.name,
      feature: a.feature,
      usedSeats: a.usedSeats,
      maxSeats: a.maxSeats,
      expiresAt: a.expiresAt,
      type: 'expiry' as const,
    })),
    ...seatAlerts,
  ];

  // 지점별 통계 계산
  const tenantStats = tenants.map((t) => {
    const students = t.users.filter((u) => u.role === 'STUDENT');
    const teachers = t.users.filter((u) => u.role === 'TEACHER' || u.role === 'OWNER' || u.role === 'MANAGER');
    const activeStudents = periodStart
      ? students.filter((s) => s.profile?.lastActiveAt && s.profile.lastActiveAt >= periodStart).length
      : students.length;
    const activityRate = students.length > 0 ? Math.round((activeStudents / students.length) * 100) : 0;

    const totalSeats = t.tenantLicenses.reduce((s, l) => s + l.maxSeats, 0);
    const usedSeats = t.tenantLicenses.reduce((s, l) => s + l.usedSeats, 0);
    const licenseUsage = totalSeats > 0 ? Math.round((usedSeats / totalSeats) * 100) : 0;

    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      isActive: t.isActive,
      studentCount: students.length,
      teacherCount: teachers.length,
      activityRate,
      licenseUsage,
    };
  });

  const FEATURE_LABELS: Record<string, string> = {
    CONCEPT: '개념학습',
    ARITHMETIC: '연산',
    TIME_ATTACK: '타임어택',
    TEST: '시험',
    REVENGE: '복수전',
    DIAGNOSTIC: '진단',
    QUIZ: '퀴즈',
    EXAM_ANALYSIS: '기출분석',
    HOMEWORK: '숙제',
    WORKSHEET: '학습지',
  };

  const stats = [
    {
      label: '활성 지점',
      value: formatNumber(activeTenants),
      suffix: '개',
      icon: <Building2 className="w-8 h-8 text-primary opacity-20" />,
      trend: { value: `/${totalTenants}개 전체`, positive: true },
    },
    {
      label: '전체 사용자',
      value: formatNumber(totalUsers),
      suffix: '명',
      icon: <Users className="w-8 h-8 text-primary opacity-20" />,
      trend: { value: '활동 중', positive: true },
    },
    {
      label: '활성 이용권',
      value: formatNumber(activeLicenses),
      suffix: '개',
      icon: <KeyRound className="w-8 h-8 text-primary opacity-20" />,
      trend: { value: '정상 운영', positive: true },
    },
    {
      label: '만료 임박',
      value: formatNumber(expiringLicenses),
      suffix: '건',
      icon: <Clock className="w-8 h-8 text-primary opacity-20" />,
      trend: expiringLicenses > 0
        ? { value: '7일 이내', positive: false }
        : { value: '없음', positive: true },
    },
    {
      label: '대기 문의',
      value: formatNumber(pendingInquiries),
      suffix: '건',
      icon: <MessageCircleQuestion className="w-8 h-8 text-primary opacity-20" />,
      trend: pendingInquiries > 0
        ? { value: '답변 필요', positive: false }
        : { value: '없음', positive: true },
    },
  ];

  return (
    <div className="flex flex-col grow min-w-0 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6 md:py-8 gap-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
        <div>
          <p className="text-sm font-medium text-primary mb-1">플랫폼 관리</p>
          <h2 className="text-text-primary text-base md:text-lg font-bold leading-tight tracking-tight">
            전체 지점 현황
          </h2>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/tenants"
            className="flex items-center rounded-sm bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-hover transition-all shadow-md"
          >
            <Building2 className="w-4 h-4 mr-1.5" />
            새 지점 추가
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <DashboardStatCards className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            variant="default"
            padding="sm"
            className="flex flex-col gap-2 hover:shadow-md transition-shadow relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-3">{stat.icon}</div>
            <p className="text-text-secondary text-sm font-semibold tracking-wide">
              {stat.label}
            </p>
            <div className="flex items-end justify-between mt-auto">
              <p className="text-text-primary text-base md:text-lg font-bold leading-none">
                {stat.value}
                {stat.suffix && (
                  <span className="text-base md:text-sm text-slate-400 font-bold ml-0.5">{stat.suffix}</span>
                )}
              </p>
            </div>
            <span
              className={`text-xs font-bold px-1.5 py-0.5 rounded-sm flex items-center w-fit ${
                stat.trend.positive
                  ? 'text-emerald-600 bg-emerald-50'
                  : 'text-rose-500 bg-rose-50'
              }`}
            >
              {stat.trend.positive ? (
                <TrendingUp className="w-3 h-3 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-1" />
              )}
              {stat.trend.value}
            </span>
          </Card>
        ))}
      </DashboardStatCards>

      {/* 지점별 현황 테이블 */}
      <Card variant="default" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="text-left font-bold text-text-primary px-4 py-3">지점명</th>
                <th className="text-center font-semibold text-text-secondary px-3 py-3">학생</th>
                <th className="text-center font-semibold text-text-secondary px-3 py-3">선생님</th>
                <th className="text-center font-semibold text-text-secondary px-3 py-3">활동률</th>
                <th className="text-center font-semibold text-text-secondary px-3 py-3 min-w-[140px]">이용권 사용</th>
                <th className="text-center font-semibold text-text-secondary px-3 py-3">상태</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {tenantStats.map((t) => (
                <tr
                  key={t.id}
                  className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors ${
                    !t.isActive ? 'opacity-50' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-sm flex items-center justify-center text-xs font-bold shrink-0 ${
                        t.isActive ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {t.name[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-text-primary">{t.name}</p>
                        <p className="text-xs text-slate-400">{t.slug}.mathlab.com</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-center font-semibold text-text-primary px-3 py-3">
                    {t.isActive ? formatNumber(t.studentCount) : '-'}
                  </td>
                  <td className="text-center font-semibold text-text-primary px-3 py-3">
                    {t.isActive ? formatNumber(t.teacherCount) : '-'}
                  </td>
                  <td className="text-center px-3 py-3">
                    {t.isActive ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                        t.activityRate >= 80 ? 'bg-emerald-50 text-emerald-600'
                          : t.activityRate >= 60 ? 'bg-amber-50 text-amber-600'
                            : 'bg-red-50 text-red-500'
                      }`}>
                        {t.activityRate}%
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-3 py-3">
                    {t.isActive ? (
                      <div className="flex items-center gap-2 justify-center">
                        <div className="flex-1 max-w-[80px] bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              t.licenseUsage >= 90 ? 'bg-amber-500' : 'bg-primary'
                            }`}
                            style={{ width: `${Math.min(t.licenseUsage, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-secondary font-medium">{t.licenseUsage}%</span>
                      </div>
                    ) : '-'}
                  </td>
                  <td className="text-center px-3 py-3">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      t.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                    }`}>
                      {t.isActive ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <Link
                      href={`/admin/tenants/${t.id}`}
                      className="text-slate-400 hover:text-primary transition-colors"
                      title="상세 보기"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Row 3: 이용권 알림 + 최근 이벤트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* 이용권 알림 */}
        <Card padding="sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-text-primary text-base font-bold">이용권 알림</h3>
            {allAlerts.length > 0 && (
              <span className="text-xs font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                {allAlerts.length}
              </span>
            )}
          </div>
          {allAlerts.length === 0 ? (
            <p className="text-text-secondary text-sm text-center py-6">긴급 알림이 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {allAlerts.slice(0, 5).map((alert, i) => {
                const daysLeft = alert.expiresAt
                  ? Math.ceil((new Date(alert.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                  : null;
                const isUrgent = daysLeft !== null && daysLeft <= 3;

                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-sm border-l-3 ${
                      isUrgent ? 'bg-red-50 border-l-red-500' : 'bg-amber-50 border-l-amber-500'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-text-primary">
                        {alert.tenantName} — {FEATURE_LABELS[alert.feature] ?? alert.feature}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        좌석 {alert.usedSeats}/{alert.maxSeats} 사용 중 ({alert.maxSeats > 0 ? Math.round((alert.usedSeats / alert.maxSeats) * 100) : 0}%)
                        {daysLeft !== null && ` · ${daysLeft}일 후 만료`}
                      </p>
                    </div>
                    <Link
                      href="/licenses"
                      className={`shrink-0 px-2.5 py-1 rounded text-xs font-semibold text-white ${
                        isUrgent ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'
                      } transition-colors`}
                    >
                      갱신
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* 최근 플랫폼 이벤트 — placeholder */}
        <Card padding="sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <h3 className="text-text-primary text-base font-bold">최근 플랫폼 이벤트</h3>
            </div>
          </div>
          <p className="text-text-secondary text-sm text-center py-6">
            이벤트 로그 기능 준비 중입니다.
          </p>
        </Card>
      </div>
    </div>
  );
}
