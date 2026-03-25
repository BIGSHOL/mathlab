import {
  Users,
  GraduationCap,
  CalendarCheck,
  MessageCircleQuestion,
  TrendingUp,
  TrendingDown,
  BookOpen,
  Trophy,
  Flame,
  ChevronRight,
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { hasRole } from '@/lib/api/auth';
import { formatNumber } from '@/lib/utils/format';
import Link from 'next/link';
import MonthlyChart from '@/components/charts/MonthlyChart';
import DashboardAnalytics from '@/components/charts/DashboardAnalytics';
import { OverviewActions } from '@/components/teacher/OverviewActions';
import SuperAdminDashboard from '@/components/teacher/SuperAdminDashboard';
import OwnerDashboard from '@/components/teacher/OwnerDashboard';

function getAchievementColor(percent: number) {
  if (percent < 55) return { bg: 'bg-red-100', text: 'text-red-600', badge: 'text-red-500' };
  if (percent < 65) return { bg: 'bg-orange-100', text: 'text-orange-600', badge: 'text-orange-500' };
  return { bg: 'bg-amber-100', text: 'text-amber-600', badge: 'text-amber-500' };
}

function getGradeLabel(grade: number | null) {
  if (!grade) return '-';
  return grade <= 6 ? `초등 ${grade}학년` : `중등 ${grade - 6}학년`;
}

function getPeriodDate(period: string): Date | null {
  const now = new Date();
  switch (period) {
    case '7d': now.setDate(now.getDate() - 7); return now;
    case '30d': now.setDate(now.getDate() - 30); return now;
    case '90d': now.setDate(now.getDate() - 90); return now;
    default: return null; // 'all'
  }
}

export default async function TeacherDashboard({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { period = '7d' } = await searchParams;

  // SA 지점장 뷰 감지
  let viewingTenantId: string | null = null;
  if (user.role === 'SUPER_ADMIN') {
    try {
      const cookieStore = await cookies();
      const raw = cookieStore.get('viewing_tenant')?.value;
      if (raw) {
        const parsed = JSON.parse(decodeURIComponent(raw));
        viewingTenantId = parsed?.tenantId ?? null;
      }
    } catch { /* ignore */ }
  }

  // SUPER_ADMIN 지점장 뷰 → OWNER 대시보드 (해당 지점 스코프)
  if (user.role === 'SUPER_ADMIN' && viewingTenantId) {
    const fakeOwner = { ...user, tenantId: viewingTenantId, role: 'OWNER' as const };
    return <OwnerDashboard user={fakeOwner} period={period} />;
  }

  // SUPER_ADMIN 일반 → 플랫폼 관리 전용 대시보드
  if (user.role === 'SUPER_ADMIN') {
    return <SuperAdminDashboard period={period} />;
  }

  // OWNER는 지점 운영 전용 대시보드
  if (user.role === 'OWNER') {
    return <OwnerDashboard user={user} period={period} />;
  }

  const periodStart = getPeriodDate(period);

  // --- Classroom-based student scoping (TEACHER/MANAGER) ---
  const isManager = hasRole(user, 'MANAGER');
  const tenantScope = user.tenantId ? { tenantId: user.tenantId } : {};
  let studentScope: Record<string, unknown> = { role: 'STUDENT', deletedAt: null, ...tenantScope };
  if (!isManager) {
    // TEACHER: 자기 반 학생만
    const teacherClassrooms = await prisma.classroom.findMany({
      where: { teacherId: user.id },
      select: { id: true },
    });
    if (teacherClassrooms.length > 0) {
      studentScope = { role: 'STUDENT', deletedAt: null, classroomId: { in: teacherClassrooms.map(c => c.id) } };
    } else {
      studentScope = { role: 'STUDENT', deletedAt: null, id: '__NONE__' };
    }
  }

  // --- Data queries ---
  const totalStudents = await prisma.user.count({ where: studentScope });

  const profiles = await prisma.studentProfile.findMany({
    where: { user: studentScope },
    select: { totalXp: true, level: true, lastActiveAt: true, currentStreak: true },
  });

  const avgLevel = profiles.length > 0
    ? Math.round(profiles.reduce((sum, p) => sum + p.level, 0) / profiles.length * 10) / 10
    : 0;

  const activeStudents = profiles.filter(
    (p) => p.lastActiveAt && periodStart && p.lastActiveAt >= periodStart
  ).length;
  const attendanceRate = totalStudents > 0
    ? Math.round((activeStudents / totalStudents) * 100)
    : 0;

  const progressWhere = periodStart ? { updatedAt: { gte: periodStart } } : {};
  const totalProgress = await prisma.learningProgress.count({ where: progressWhere });

  // Focus students (lowest XP)
  const lowPerformers = await prisma.user.findMany({
    where: studentScope,
    include: {
      profile: true,
      progress: {
        orderBy: { updatedAt: 'desc' },
        take: 1,
        include: { concept: { include: { subject: true } } },
      },
    },
    orderBy: { profile: { totalXp: 'asc' } },
    take: 5,
  });

  const maxXp = Math.max(...profiles.map((p) => p.totalXp), 1);
  const focusStudents = lowPerformers
    .filter((s) => s.profile)
    .map((s) => {
      const percent = Math.round((s.profile!.totalXp / maxXp) * 100);
      return {
        id: s.id,
        name: s.name,
        grade: s.grade,
        subjectTitle: s.progress[0]?.concept?.subject?.title ?? '미시작',
        achievementPercent: percent,
      };
    })
    .slice(0, 5);

  // Top students (ranking)
  const topStudents = await prisma.user.findMany({
    where: studentScope,
    include: { profile: true },
    orderBy: { profile: { totalXp: 'desc' } },
    take: 5,
  });

  // Grade distribution
  const allStudents = await prisma.user.findMany({
    where: studentScope,
    select: { grade: true },
  });
  const gradeDistribution = new Map<number, number>();
  for (const s of allStudents) {
    if (s.grade) gradeDistribution.set(s.grade, (gradeDistribution.get(s.grade) ?? 0) + 1);
  }
  const gradeEntries = [...gradeDistribution.entries()].sort((a, b) => a[0] - b[0]);
  const maxGradeCount = Math.max(...gradeEntries.map(([, c]) => c), 1);

  // Recent activity
  const recentActivity = await prisma.learningProgress.findMany({
    where: progressWhere,
    orderBy: { updatedAt: 'desc' },
    take: 6,
    include: {
      user: true,
      concept: { include: { subject: true } },
    },
  });

  const stageLabels: Record<string, string> = {
    READING: '개념 읽기',
    BLANK_EASY: '빈칸 (쉬움)',
    BLANK_HARD: '빈칸 (어려움)',
    BLANK_PAGE: '백지 쓰기',
  };

  const stats = [
    {
      label: '전체 학생 수',
      value: formatNumber(totalStudents),
      suffix: '명',
      icon: Users,
      color: 'blue' as const,
      trend: { value: '+5%', positive: true },
    },
    {
      label: period === 'all' ? '전체 활동률' : period === '90d' ? '3개월 활동률' : period === '30d' ? '월간 활동률' : '주간 활동률',
      value: `${attendanceRate}`,
      suffix: '%',
      icon: CalendarCheck,
      color: 'emerald' as const,
      trend: attendanceRate >= 80
        ? { value: '양호', positive: true }
        : { value: '관리 필요', positive: false },
    },
    {
      label: '평균 레벨',
      value: avgLevel.toFixed(1),
      icon: GraduationCap,
      color: 'violet' as const,
      trend: { value: '+2%', positive: true },
    },
    {
      label: '총 학습 기록',
      value: formatNumber(totalProgress),
      suffix: '건',
      icon: MessageCircleQuestion,
      color: 'amber' as const,
      trend: { value: '누적', positive: true },
    },
  ];

  const colorMap = {
    blue: { border: 'border-blue-200', icon: 'text-blue-500', value: 'text-blue-700', sub: 'text-blue-500', deco: 'bg-blue-500/5' },
    emerald: { border: 'border-emerald-200', icon: 'text-emerald-500', value: 'text-emerald-700', sub: 'text-emerald-500', deco: 'bg-emerald-500/5' },
    violet: { border: 'border-violet-200', icon: 'text-violet-500', value: 'text-violet-700', sub: 'text-violet-500', deco: 'bg-violet-500/5' },
    amber: { border: 'border-amber-200', icon: 'text-amber-500', value: 'text-amber-700', sub: 'text-amber-500', deco: 'bg-amber-500/5' },
  };

  return (
      <div className="flex flex-col grow min-w-0 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6 md:py-8 gap-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
          <div>
            <p className="text-sm font-medium text-primary mb-1">환영합니다, {user.name}님</p>
            <h2 className="text-text-primary text-base md:text-lg font-bold leading-tight tracking-tight">
              통합 대시보드
            </h2>
          </div>
          <OverviewActions />
        </div>

        {/* Stat Cards — StudentDetail 스타일 컬러 border 카드 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {stats.map((stat) => {
            const c = colorMap[stat.color];
            const Icon = stat.icon;
            return (
              <div key={stat.label} className={`bg-white border ${c.border} rounded-sm p-3 relative overflow-hidden`}>
                <div className={`absolute top-0 right-0 w-10 h-10 ${c.deco} rounded-bl-full`} />
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${c.icon} shrink-0`} />
                  <div className={`text-lg font-bold ${c.value}`}>
                    {stat.value}
                    {stat.suffix && <span className="text-xs font-medium ml-0.5">{stat.suffix}</span>}
                  </div>
                </div>
                <div className={`text-xs ${c.sub} mt-0.5`}>{stat.label}</div>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-sm flex items-center w-fit mt-1.5 ${
                  stat.trend.positive ? 'text-emerald-600 bg-emerald-50' : 'text-rose-500 bg-rose-50'
                }`}>
                  {stat.trend.positive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {stat.trend.value}
                </span>
              </div>
            );
          })}
        </div>

        {/* Row 2: Chart + Focus Students */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          {/* Chart */}
          <div className="bg-white border border-slate-200 rounded-sm p-3 flex flex-col gap-2 lg:col-span-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-text-primary text-sm font-semibold">월간 학습 추이</h3>
                <p className="text-text-primary text-base font-bold mt-1">
                  {avgLevel.toFixed(1)} <span className="text-sm text-slate-500 font-medium">평균 레벨</span>
                </p>
              </div>
            </div>
            <MonthlyChart />
          </div>

          {/* Focus Students — 리스트 아이템에 좌측 컬러바 + ChevronRight */}
          <div className="bg-white border border-slate-200 rounded-sm flex flex-col overflow-hidden lg:col-span-2">
            <div className="px-3 py-2.5 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-3 h-3 text-primary" />
                </div>
                <h3 className="text-xs font-bold text-text-primary">집중 관리 학생</h3>
              </div>
              <Link href="/students" className="text-primary text-xs font-bold hover:underline">
                모두 보기
              </Link>
            </div>
            <div className="flex-1 overflow-y-auto">
              {focusStudents.length === 0 ? (
                <p className="text-text-secondary text-center py-8 text-sm">등록된 학생이 없습니다.</p>
              ) : (
                <div className="space-y-2 p-2.5">
                  {focusStudents.map((student) => {
                    const colors = getAchievementColor(student.achievementPercent);
                    return (
                      <Link
                        key={student.id}
                        href={`/students?search=${encodeURIComponent(student.name)}`}
                        className="flex items-center bg-white border border-slate-200 rounded-sm overflow-hidden hover:border-primary/40 transition-colors"
                      >
                        <div className={`w-1 self-stretch shrink-0 ${
                          student.achievementPercent < 55 ? 'bg-red-400' : student.achievementPercent < 65 ? 'bg-orange-400' : 'bg-amber-400'
                        }`} />
                        <div className="flex items-center justify-between flex-1 min-w-0 px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-7 h-7 rounded-full ${colors.bg} flex items-center justify-center text-xs font-bold ${colors.text} shrink-0`}>
                              {student.name[0]}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-text-primary truncate">{student.name}</div>
                              <div className="text-xs text-text-secondary">{getGradeLabel(student.grade)} · {student.subjectTitle}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${colors.bg} ${colors.text}`}>
                              {student.achievementPercent}%
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 2.5: Weekly Analytics (client-side fetched) */}
        <DashboardAnalytics />

        {/* Row 3: Ranking + Grade Distribution + Recent Activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Top Students Ranking */}
          <div className="bg-white border border-slate-200 rounded-sm p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-amber-100 flex items-center justify-center shrink-0">
                  <Trophy className="w-3 h-3 text-amber-600" />
                </div>
                <h3 className="text-xs font-bold text-text-primary">XP 랭킹 TOP 5</h3>
              </div>
              <Link href="/ranking" className="text-primary text-xs font-bold hover:underline">
                전체 보기
              </Link>
            </div>
            <div className="space-y-2">
              {topStudents.map((s, i) => (
                <div key={s.id} className="flex items-center bg-white border border-slate-200 rounded-sm overflow-hidden hover:border-amber-300 transition-colors">
                  <div className={`w-1 self-stretch shrink-0 ${
                    i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-orange-400' : 'bg-slate-200'
                  }`} />
                  <div className="flex items-center justify-between flex-1 min-w-0 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-50 text-slate-500'
                      }`}>{i + 1}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-text-primary truncate">{s.name}</div>
                        <div className="text-xs text-text-secondary">{getGradeLabel(s.grade)}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="text-xs font-bold text-primary">{formatNumber(s.profile?.totalXp ?? 0)} XP</div>
                      <div className="text-xs text-text-secondary">Lv.{s.profile?.level ?? 1}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grade Distribution */}
          <div className="bg-white border border-slate-200 rounded-sm p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="w-3 h-3 text-primary" />
              </div>
              <h3 className="text-xs font-bold text-text-primary">학년별 학생 분포</h3>
            </div>
            <div className="flex flex-col gap-2">
              {gradeEntries.length === 0 ? (
                <p className="text-text-secondary text-sm text-center py-2.5">데이터 없음</p>
              ) : (
                gradeEntries.map(([grade, count]) => (
                  <div key={grade} className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-text-secondary w-16 shrink-0">
                      {getGradeLabel(grade)}
                    </span>
                    <div className="flex-1 bg-slate-100 rounded-sm h-5 overflow-hidden">
                      <div
                        className="bg-primary/70 h-full rounded-sm transition-all flex items-center justify-end pr-2"
                        style={{ width: `${Math.max((count / maxGradeCount) * 100, 20)}%` }}
                      >
                        <span className="text-xs font-bold text-white">{count}명</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Streak summary */}
            <div className="mt-3 pt-2.5 border-t border-slate-200">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-5 h-5 rounded bg-orange-100 flex items-center justify-center shrink-0">
                  <Flame className="w-3 h-3 text-orange-500" />
                </div>
                <span className="text-xs font-bold text-text-primary">학습 스트릭</span>
              </div>
              <div className="flex gap-2 text-center">
                <div className="flex-1 bg-orange-50 rounded-sm p-3">
                  <p className="text-sm font-bold text-orange-600">
                    {profiles.length > 0
                      ? Math.max(...profiles.map((p) => p.currentStreak))
                      : 0}
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
          </div>

          {/* Recent Activity — 좌측 컬러바 패턴 */}
          <div className="bg-white border border-slate-200 rounded-sm p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center shrink-0">
                <BookOpen className="w-3 h-3 text-primary" />
              </div>
              <h3 className="text-xs font-bold text-text-primary">최근 학습 활동</h3>
            </div>
            <div className="space-y-2">
              {recentActivity.length === 0 ? (
                <p className="text-text-secondary text-sm text-center py-2.5">아직 학습 기록이 없습니다.</p>
              ) : (
                recentActivity.map((a) => (
                  <div key={a.id} className="flex items-center bg-white border border-slate-200 rounded-sm overflow-hidden">
                    <div className={`w-1 self-stretch shrink-0 ${a.completed ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                    <div className="flex items-center justify-between flex-1 min-w-0 px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          a.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {a.user.name[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-text-primary truncate">
                            <span className="font-semibold">{a.user.name}</span>
                            <span className="text-text-secondary"> · </span>
                            {a.concept.title}
                          </div>
                          <div className="text-xs text-text-secondary">{stageLabels[a.stage] ?? a.stage}</div>
                        </div>
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
                        a.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {a.completed ? '완료' : '진행 중'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
  );
}
