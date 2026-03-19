import {
  Users,
  GraduationCap,
  CalendarCheck,
  MessageCircleQuestion,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  BookOpen,
  Trophy,
  Flame,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { formatNumber } from '@/lib/utils/format';
import Link from 'next/link';
import MonthlyChart from '@/components/charts/MonthlyChart';
import DashboardAnalytics from '@/components/charts/DashboardAnalytics';
import { OverviewActions } from '@/components/teacher/OverviewActions';
import { DashboardStatCards } from '@/components/student/DashboardStatCards';

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

  const isAdmin = user.role === 'ADMIN';
  const { period = '7d' } = await searchParams;
  const periodStart = getPeriodDate(period);

  // --- Data queries ---
  const totalStudents = await prisma.user.count({ where: { role: 'STUDENT', deletedAt: null } });
  const totalTeachers = isAdmin
    ? await prisma.user.count({ where: { role: 'TEACHER', deletedAt: null } })
    : 0;
  const pendingInquiries = isAdmin
    ? await prisma.inquiry.count({ where: { status: 'PENDING' } })
    : 0;

  const profiles = await prisma.studentProfile.findMany({
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
    where: { role: 'STUDENT', deletedAt: null },
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
    where: { role: 'STUDENT', deletedAt: null },
    include: { profile: true },
    orderBy: { profile: { totalXp: 'desc' } },
    take: 5,
  });

  // Grade distribution
  const allStudents = await prisma.user.findMany({
    where: { role: 'STUDENT', deletedAt: null },
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
    ...(isAdmin ? [{
      label: '등록 선생님',
      value: formatNumber(totalTeachers),
      suffix: '명',
      icon: <GraduationCap className="w-8 h-8 text-primary opacity-20" />,
      trend: { value: '활동 중', positive: true },
    }] : []),
    {
      label: '전체 학생 수',
      value: formatNumber(totalStudents),
      suffix: '명',
      icon: <Users className="w-8 h-8 text-primary opacity-20" />,
      trend: { value: '+5%', positive: true },
    },
    {
      label: period === 'all' ? '전체 활동률' : period === '90d' ? '3개월 활동률' : period === '30d' ? '월간 활동률' : '주간 활동률',
      value: `${attendanceRate}`,
      suffix: '%',
      icon: <CalendarCheck className="w-8 h-8 text-primary opacity-20" />,
      trend: attendanceRate >= 80
        ? { value: '양호', positive: true }
        : { value: '관리 필요', positive: false },
    },
    ...(isAdmin ? [{
      label: '대기 문의',
      value: formatNumber(pendingInquiries),
      suffix: '건',
      icon: <MessageCircleQuestion className="w-8 h-8 text-primary opacity-20" />,
      trend: pendingInquiries > 0
        ? { value: '답변 필요', positive: false }
        : { value: '없음', positive: true },
    }] : [{
      label: '평균 레벨',
      value: avgLevel.toFixed(1),
      icon: <GraduationCap className="w-8 h-8 text-primary opacity-20" />,
      trend: { value: '+2%', positive: true },
    }]),
    {
      label: '총 학습 기록',
      value: formatNumber(totalProgress),
      suffix: '건',
      icon: <MessageCircleQuestion className="w-8 h-8 text-primary opacity-20" />,
      trend: { value: '누적', positive: true },
    },
  ];

  return (
      <div className="flex flex-col grow min-w-0 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6 md:py-8 gap-3">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
          <div>
            <p className="text-sm font-medium text-primary mb-1">환영합니다, {user.name}님</p>
            <h2 className="text-text-primary text-base md:text-lg font-bold leading-tight tracking-tight">
              {isAdmin ? '시스템 관리 대시보드' : '통합 대시보드'}
            </h2>
          </div>
          <OverviewActions />
        </div>

        {/* Stat Cards - 2x2 on mobile, 4 on desktop */}
        <DashboardStatCards className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="glass-card flex flex-col gap-2 rounded-sm p-3 md:p-3 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-3 md:p-3">{stat.icon}</div>
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
            </div>
          ))}
        </DashboardStatCards>

        {/* Row 2: Chart + Focus Students */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          {/* Chart */}
          <Card variant="glass" className="flex flex-col gap-2 p-3 md:p-3 lg:col-span-3">
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

          {/* Focus Students */}
          <Card variant="glass" className="flex flex-col overflow-hidden lg:col-span-2">
            <div className="px-3 py-2.5 border-b border-slate-200/50 flex justify-between items-center">
              <h3 className="text-text-primary text-base font-bold">집중 관리 학생</h3>
              <Link href="/students" className="text-primary text-xs font-bold hover:underline">
                모두 보기
              </Link>
            </div>
            <div className="flex-1 p-2.5 overflow-y-auto">
              <div className="flex flex-col gap-2">
                {focusStudents.length === 0 ? (
                  <p className="text-text-secondary text-center py-8 text-sm">등록된 학생이 없습니다.</p>
                ) : (
                  focusStudents.map((student) => {
                    const colors = getAchievementColor(student.achievementPercent);
                    return (
                      <div
                        key={student.id}
                        className="flex items-center gap-2 p-2.5 rounded-sm bg-white/40 hover:bg-white transition-colors shadow-sm"
                      >
                        <div
                          className={`w-9 h-9 rounded-full ${colors.bg} flex items-center justify-center text-xs font-bold ${colors.text} shrink-0`}
                        >
                          {student.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-text-primary truncate">{student.name}</p>
                          <p className="text-xs text-text-secondary">
                            {student.subjectTitle} &bull;{' '}
                            <span className={`font-bold ${colors.badge}`}>{student.achievementPercent}%</span>
                          </p>
                        </div>
                        <Link
                          href={`/students?search=${encodeURIComponent(student.name)}`}
                          className="bg-primary/10 hover:bg-primary/20 text-primary p-1.5 rounded-sm transition-colors shrink-0"
                          title="학생 상세 보기"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Row 2.5: Weekly Analytics (client-side fetched) */}
        <DashboardAnalytics />

        {/* Row 3: Ranking + Grade Distribution + Recent Activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Top Students Ranking */}
          <Card className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-text-primary text-base font-bold flex items-center gap-2">
                <Trophy className="w-4 h-4 text-xp-gold" /> XP 랭킹 TOP 5
              </h3>
              <Link href="/ranking" className="text-primary text-xs font-bold hover:underline">
                전체 보기
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              {topStudents.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2 py-2 border-b border-slate-200 last:border-0">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0
                        ? 'bg-amber-100 text-amber-700'
                        : i === 1
                          ? 'bg-slate-200 text-slate-600'
                          : i === 2
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-slate-50 text-slate-500'
                    }`}
                  >
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

          {/* Grade Distribution */}
          <Card className="p-3">
            <h3 className="text-text-primary text-base font-bold flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-primary" /> 학년별 학생 분포
            </h3>
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
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-bold text-text-primary">학습 스트릭</span>
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
          </Card>

          {/* Recent Activity */}
          <Card className="p-3">
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
                        {stageLabels[a.stage] ?? a.stage} &bull;{' '}
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
