import {
  Users,
  GraduationCap,
  CalendarCheck,
  MessageCircleQuestion,
  TrendingUp,
  TrendingDown,
  KeyRound,
  School,
  AlertTriangle,
  BookOpen,
  Trophy,
  Flame,
  ExternalLink,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { prisma } from '@/lib/db';
import { formatNumber } from '@/lib/utils/format';
import Link from 'next/link';
import MonthlyChart from '@/components/charts/MonthlyChart';
import { DashboardStatCards } from '@/components/student/DashboardStatCards';
import { OverviewActions } from '@/components/teacher/OverviewActions';

interface Props {
  user: { id: string; name: string; role: string; tenantId: string | null };
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

function getGradeLabel(grade: number | null) {
  if (!grade) return '-';
  return grade <= 6 ? `초${grade}` : `중${grade - 6}`;
}

export default async function OwnerDashboard({ user, period }: Props) {
  const periodStart = getPeriodDate(period);
  const tenantId = user.tenantId;
  const now = new Date();
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(now.getDate() + 7);

  // 모든 쿼리에 tenantId 스코핑
  const tenantScope = tenantId ? { tenantId } : {};

  const [
    totalStudents,
    totalTeachers,
    pendingInquiries,
    classroomsRaw,
    profiles,
    licenses,
    topStudents,
    allStudents,
    recentActivity,
  ] = await Promise.all([
    prisma.user.count({
      where: { role: 'STUDENT', deletedAt: null, ...tenantScope },
    }),
    prisma.user.count({
      where: { role: { in: ['TEACHER', 'MANAGER'] }, deletedAt: null, ...tenantScope },
    }),
    prisma.inquiry.count({
      where: { status: 'PENDING', ...(tenantId ? { user: { tenantId } } : {}) },
    }),
    prisma.classroom.findMany({
      where: tenantScope,
      select: {
        id: true,
        name: true,
        grade: true,
        teacherId: true,
        tenantId: true,
        createdAt: true,
        students: {
          where: { deletedAt: null, role: 'STUDENT' },
          select: {
            id: true, name: true, grade: true,
            profile: { select: { totalXp: true, level: true, lastActiveAt: true, currentStreak: true } },
          },
        },
      },
    }),
    prisma.studentProfile.findMany({
      where: { user: { deletedAt: null, role: 'STUDENT', ...tenantScope } },
      select: { totalXp: true, level: true, lastActiveAt: true, currentStreak: true },
    }),
    tenantId
      ? prisma.tenantLicense.findMany({
          where: { tenantId, isActive: true },
          select: { feature: true, maxSeats: true, usedSeats: true, expiresAt: true },
        })
      : Promise.resolve([]),
    prisma.user.findMany({
      where: { role: 'STUDENT', deletedAt: null, ...tenantScope },
      include: { profile: true },
      orderBy: { profile: { totalXp: 'desc' } },
      take: 5,
    }),
    prisma.user.findMany({
      where: { role: 'STUDENT', deletedAt: null, ...tenantScope },
      select: { grade: true },
    }),
    prisma.learningProgress.findMany({
      where: {
        ...(periodStart ? { updatedAt: { gte: periodStart } } : {}),
        user: { ...tenantScope },
      },
      orderBy: { updatedAt: 'desc' },
      take: 6,
      include: {
        user: true,
        concept: { include: { subject: true } },
      },
    }),
  ]);

  // 통계 계산
  const avgLevel = profiles.length > 0
    ? Math.round(profiles.reduce((s, p) => s + p.level, 0) / profiles.length * 10) / 10
    : 0;
  const activeStudents = profiles.filter(
    (p) => p.lastActiveAt && periodStart && p.lastActiveAt >= periodStart
  ).length;
  const attendanceRate = totalStudents > 0
    ? Math.round((activeStudents / totalStudents) * 100)
    : 0;

  // 이용권 요약
  const totalSeats = licenses.reduce((s, l) => s + l.maxSeats, 0);
  const usedSeats = licenses.reduce((s, l) => s + l.usedSeats, 0);
  const seatUsageRate = totalSeats > 0 ? Math.round((usedSeats / totalSeats) * 100) : 0;
  const expiringLicenses = licenses.filter(
    (l) => l.expiresAt && new Date(l.expiresAt) <= sevenDaysLater && new Date(l.expiresAt) >= now
  );

  // 선생님 이름 매핑
  const teacherIds = [...new Set(classroomsRaw.map((c) => c.teacherId).filter(Boolean))] as string[];
  const teacherMap = new Map<string, string>();
  if (teacherIds.length > 0) {
    const teachers = await prisma.user.findMany({
      where: { id: { in: teacherIds } },
      select: { id: true, name: true },
    });
    teachers.forEach((t) => teacherMap.set(t.id, t.name));
  }

  // 반별 성과 계산
  const classroomStats = classroomsRaw.map((c) => {
    const students = c.students;
    const activeCount = periodStart
      ? students.filter((s) => s.profile?.lastActiveAt && s.profile.lastActiveAt >= periodStart).length
      : students.length;
    const actRate = students.length > 0 ? Math.round((activeCount / students.length) * 100) : 0;
    const avgLv = students.length > 0
      ? Math.round(students.reduce((s, st) => s + (st.profile?.level ?? 1), 0) / students.length * 10) / 10
      : 0;
    const totalXp = students.reduce((s, st) => s + (st.profile?.totalXp ?? 0), 0);

    return {
      id: c.id,
      name: c.name,
      teacherName: c.teacherId ? (teacherMap.get(c.teacherId) ?? '-') : '-',
      studentCount: students.length,
      activityRate: actRate,
      avgLevel: avgLv,
      totalXp,
    };
  }).sort((a, b) => b.activityRate - a.activityRate);

  // 학년 분포
  const gradeDistribution = new Map<number, number>();
  for (const s of allStudents) {
    if (s.grade) gradeDistribution.set(s.grade, (gradeDistribution.get(s.grade) ?? 0) + 1);
  }
  const gradeEntries = [...gradeDistribution.entries()].sort((a, b) => a[0] - b[0]);
  const maxGradeCount = Math.max(...gradeEntries.map(([, c]) => c), 1);

  // 스테이지 라벨
  const stageLabels: Record<string, string> = {
    READING: '개념 읽기', BLANK_EASY: '빈칸 (쉬움)',
    BLANK_HARD: '빈칸 (어려움)', BLANK_PAGE: '백지 쓰기',
  };

  const FEATURE_LABELS: Record<string, string> = {
    CONCEPT: '개념학습', ARITHMETIC: '연산', TIME_ATTACK: '타임어택',
    TEST: '시험', REVENGE: '복수전', DIAGNOSTIC: '진단', QUIZ: '퀴즈',
  };

  const periodLabel = period === 'all' ? '전체' : period === '90d' ? '3개월' : period === '30d' ? '월간' : '주간';

  const stats = [
    {
      label: '등록 선생님',
      value: formatNumber(totalTeachers),
      suffix: '명',
      icon: <GraduationCap className="w-8 h-8 text-primary opacity-20" />,
      trend: { value: '활동 중', positive: true },
      href: '/students?tab=teachers',
    },
    {
      label: '전체 학생',
      value: formatNumber(totalStudents),
      suffix: '명',
      icon: <Users className="w-8 h-8 text-primary opacity-20" />,
      trend: { value: `${classroomsRaw.length}개 반`, positive: true },
      href: '/students',
    },
    {
      label: `${periodLabel} 활동률`,
      value: `${attendanceRate}`,
      suffix: '%',
      icon: <CalendarCheck className="w-8 h-8 text-primary opacity-20" />,
      trend: attendanceRate >= 70
        ? { value: '양호', positive: true }
        : { value: '관리 필요', positive: false },
      href: '/analytics',
    },
    {
      label: '이용권',
      value: `${usedSeats}/${totalSeats}`,
      icon: <KeyRound className="w-8 h-8 text-primary opacity-20" />,
      trend: expiringLicenses.length > 0
        ? { value: `${expiringLicenses.length}건 만료 임박`, positive: false }
        : { value: `${seatUsageRate}% 사용`, positive: true },
      href: '/licenses',
    },
    {
      label: '대기 문의',
      value: formatNumber(pendingInquiries),
      suffix: '건',
      icon: <MessageCircleQuestion className="w-8 h-8 text-primary opacity-20" />,
      trend: pendingInquiries > 0
        ? { value: '답변 필요', positive: false }
        : { value: '없음', positive: true },
      href: '/support',
    },
  ];

  return (
    <div className="flex flex-col grow min-w-0 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6 md:py-8 gap-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
        <div>
          <p className="text-sm font-medium text-primary mb-1">환영합니다, {user.name}님</p>
          <h2 className="text-text-primary text-base md:text-lg font-bold leading-tight tracking-tight">
            지점 운영 대시보드
          </h2>
        </div>
        <OverviewActions />
      </div>

      {/* Stat Cards */}
      <DashboardStatCards className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="contents">
            <Card
              variant="glass"
              padding="sm"
              className="flex flex-col gap-2 hover:shadow-md transition-shadow relative overflow-hidden cursor-pointer"
            >
              <div className="absolute top-0 right-0 p-3">{stat.icon}</div>
              <p className="text-text-secondary text-sm font-semibold tracking-wide">{stat.label}</p>
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
                  stat.trend.positive ? 'text-emerald-600 bg-emerald-50' : 'text-rose-500 bg-rose-50'
                }`}
              >
                {stat.trend.positive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {stat.trend.value}
              </span>
            </Card>
          </Link>
        ))}
      </DashboardStatCards>

      {/* Row 2: 월간 차트 + 반별 성과 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <Card variant="glass" padding="sm" className="flex flex-col gap-2 lg:col-span-3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-text-primary text-sm font-semibold">월간 학습 추이</h3>
              <p className="text-text-primary text-base font-bold mt-1">
                {avgLevel.toFixed(1)} <span className="text-sm text-slate-500 font-medium">평균 레벨</span>
              </p>
            </div>
          </div>
          <MonthlyChart />
        </Card>

        {/* 반별 성과 비교 */}
        <Card variant="glass" className="flex flex-col overflow-hidden lg:col-span-2">
          <div className="px-3 py-2.5 border-b border-slate-200/50 flex justify-between items-center">
            <h3 className="text-text-primary text-base font-bold flex items-center gap-2">
              <School className="w-4 h-4 text-primary" /> 반별 성과
            </h3>
            <Link href="/admin/classrooms" className="text-primary text-xs font-bold hover:underline">
              반 관리
            </Link>
          </div>
          <div className="flex-1 p-2.5 overflow-y-auto">
            {classroomStats.length === 0 ? (
              <p className="text-text-secondary text-center py-8 text-sm">등록된 반이 없습니다.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {classroomStats.slice(0, 6).map((c) => (
                  <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-sm bg-white/40 hover:bg-white transition-colors shadow-sm">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      c.activityRate >= 70 ? 'bg-emerald-100 text-emerald-600'
                      : c.activityRate >= 40 ? 'bg-amber-100 text-amber-600'
                      : 'bg-red-100 text-red-500'
                    }`}>
                      {c.activityRate}%
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-text-primary truncate">{c.name}</p>
                      <p className="text-xs text-text-secondary">
                        {c.teacherName} · {c.studentCount}명 · Lv.{c.avgLevel}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-primary">{formatNumber(c.totalXp)} XP</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Row 3: 이용권 현황 + 만료 임박 알림 */}
      {licenses.length > 0 && (
        <Card padding="sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary" />
              <h3 className="text-text-primary text-base font-bold">이용권 현황</h3>
            </div>
            <Link href="/licenses" className="text-primary text-xs font-bold hover:underline flex items-center gap-1">
              관리 <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {licenses.map((l) => {
              const usage = l.maxSeats > 0 ? Math.round((l.usedSeats / l.maxSeats) * 100) : 0;
              const isExpiring = l.expiresAt && new Date(l.expiresAt) <= sevenDaysLater;
              return (
                <div
                  key={l.feature}
                  className={`rounded-lg border p-3 text-center ${
                    isExpiring ? 'border-amber-300 bg-amber-50' : 'border-slate-200'
                  }`}
                >
                  <p className="text-xs font-medium text-text-secondary mb-1">
                    {FEATURE_LABELS[l.feature] ?? l.feature}
                  </p>
                  <p className="text-lg font-bold text-text-primary">{l.usedSeats}<span className="text-xs text-slate-400">/{l.maxSeats}</span></p>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        usage >= 90 ? 'bg-amber-500' : usage >= 70 ? 'bg-blue-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(usage, 100)}%` }}
                    />
                  </div>
                  {isExpiring && (
                    <p className="text-[10px] text-amber-600 font-semibold mt-1 flex items-center justify-center gap-0.5">
                      <AlertTriangle className="w-2.5 h-2.5" /> 만료 임박
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Row 4: 랭킹 + 학년분포 + 최근활동 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* XP 랭킹 TOP 5 */}
        <Card padding="sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-text-primary text-base font-bold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-xp-gold" /> XP 랭킹 TOP 5
            </h3>
          </div>
          <div className="flex flex-col gap-2">
            {topStudents.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 py-2 border-b border-slate-200 last:border-0">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  i === 0 ? 'bg-amber-100 text-amber-700'
                  : i === 1 ? 'bg-slate-200 text-slate-600'
                  : i === 2 ? 'bg-orange-100 text-orange-700'
                  : 'bg-slate-50 text-slate-500'
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{s.name}</p>
                  <p className="text-xs text-text-secondary">{getGradeLabel(s.grade)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-primary">{formatNumber(s.profile?.totalXp ?? 0)}</p>
                  <p className="text-xs text-text-secondary">Lv.{s.profile?.level ?? 1}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 학년별 분포 + 스트릭 */}
        <Card padding="sm">
          <h3 className="text-text-primary text-base font-bold flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-primary" /> 학년별 학생 분포
          </h3>
          <div className="flex flex-col gap-2">
            {gradeEntries.length === 0 ? (
              <p className="text-text-secondary text-sm text-center py-2.5">데이터 없음</p>
            ) : (
              gradeEntries.map(([grade, count]) => (
                <div key={grade} className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text-secondary w-14 shrink-0">
                    {getGradeLabel(grade)}
                  </span>
                  <div className="flex-1 bg-slate-100 rounded-sm h-5 overflow-hidden">
                    <div
                      className="bg-primary/70 h-full rounded-sm flex items-center justify-end pr-2"
                      style={{ width: `${Math.max((count / maxGradeCount) * 100, 20)}%` }}
                    >
                      <span className="text-xs font-bold text-white">{count}명</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-bold text-text-primary">학습 스트릭</span>
            </div>
            <div className="flex gap-2 text-center">
              <div className="flex-1 bg-orange-50 rounded-sm p-3">
                <p className="text-sm font-bold text-orange-600">
                  {profiles.length > 0 ? Math.max(...profiles.map((p) => p.currentStreak)) : 0}
                </p>
                <p className="text-xs text-text-secondary font-medium mt-0.5">최고 연속일</p>
              </div>
              <div className="flex-1 bg-blue-50 rounded-sm p-3">
                <p className="text-sm font-bold text-primary">
                  {profiles.length > 0
                    ? Math.round(profiles.reduce((s, p) => s + p.currentStreak, 0) / profiles.length * 10) / 10
                    : 0}
                </p>
                <p className="text-xs text-text-secondary font-medium mt-0.5">평균 연속일</p>
              </div>
            </div>
          </div>
        </Card>

        {/* 최근 학습 활동 */}
        <Card padding="sm">
          <h3 className="text-text-primary text-base font-bold flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-primary" /> 최근 학습 활동
          </h3>
          <div className="flex flex-col gap-2.5">
            {recentActivity.length === 0 ? (
              <p className="text-text-secondary text-sm text-center py-2.5">아직 학습 기록이 없습니다.</p>
            ) : (
              recentActivity.map((a) => (
                <div key={a.id} className="flex items-start gap-2 py-2 border-b border-slate-200 last:border-0">
                  <div className={`w-8 h-8 rounded-sm flex items-center justify-center text-xs font-bold shrink-0 ${
                    a.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {a.user.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary">
                      <span className="font-semibold">{a.user.name}</span>
                      <span className="text-text-secondary">이(가) </span>
                      <span className="font-medium">{a.concept.title}</span>
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {stageLabels[a.stage] ?? a.stage} ·{' '}
                      {a.completed ? (
                        <span className="text-emerald-600 font-semibold">완료</span>
                      ) : (
                        <span className="text-blue-600 font-semibold">진행 중</span>
                      )}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
