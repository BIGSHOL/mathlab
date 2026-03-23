import {
  Users,
  GraduationCap,
  TrendingUp,
  BookOpen,
  Trophy,
  UserPlus,
  AlertTriangle,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  ArrowRight,
  Zap,
  Target,
  FileWarning,
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { hasRole } from '@/lib/api/auth';
import { formatNumber } from '@/lib/utils/format';
import Link from 'next/link';
import MonthlyChartV2 from '@/components/charts/MonthlyChartV2';
import DashboardAnalytics from '@/components/charts/DashboardAnalytics';
import { DashboardStatCards } from '@/components/student/DashboardStatCards';
import { OverviewActions } from '@/components/teacher/OverviewActions';

// --- 유틸 ---
function getAchievementColor(percent: number) {
  if (percent < 55) return { bg: 'bg-red-100', text: 'text-red-600', badge: 'text-red-500' };
  if (percent < 65) return { bg: 'bg-orange-100', text: 'text-orange-600', badge: 'text-orange-500' };
  return { bg: 'bg-amber-100', text: 'text-amber-600', badge: 'text-amber-500' };
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return `${Math.floor(diffDay / 7)}주 전`;
}

export default async function TeacherDashboardV2({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const isOwner = user.role === 'OWNER' || user.role === 'SUPER_ADMIN';
  const { period: _period = '7d' } = await searchParams;

  // --- Classroom-based student scoping ---
  const isOwnerOrAbove = hasRole(user, 'OWNER');
  let studentScope: Record<string, unknown> = { role: 'STUDENT', deletedAt: null };
  if (!isOwnerOrAbove) {
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

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // ===== 모든 쿼리를 병렬 실행 =====
  const [
    totalStudents,
    totalTeachers,
    profiles,
    // 액션 아이템
    pendingGrading,
    overdueAssignments,
    pendingAssignments,
    // 실시간 현황
    inProgressTests,
    weekCompletedLearning,
    // 집중 관리 학생
    lowPerformers,
    // 랭킹
    topStudents,
    // 학년 분포
    allStudents,
    // 최근 활동
    recentActivity,
    // 취약 단원 데이터
    recentAnswers,
  ] = await Promise.all([
    // 기본 통계
    prisma.user.count({ where: studentScope }),
    isOwner ? prisma.user.count({ where: { role: 'TEACHER', deletedAt: null } }) : Promise.resolve(0),
    prisma.studentProfile.findMany({
      where: isOwnerOrAbove ? {} : { user: studentScope },
      select: { totalXp: true, level: true, lastActiveAt: true, currentStreak: true },
    }),

    // === 액션 아이템 (V1에 없는 핵심 차별점) ===
    prisma.testAttempt.count({
      where: { entryMethod: 'manual', completedAt: null },
    }),
    prisma.testAssignment.count({
      where: { status: 'OVERDUE' },
    }),
    prisma.testAssignment.count({
      where: { status: 'ASSIGNED' },
    }),

    // === 실시간 현황 ===
    prisma.testAttempt.count({
      where: { completedAt: null, entryMethod: 'online' },
    }),
    prisma.learningProgress.count({
      where: { completed: true, updatedAt: { gte: weekStart } },
    }),

    // 집중 관리 학생
    prisma.user.findMany({
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
    }),

    // 랭킹
    prisma.user.findMany({
      where: studentScope,
      include: { profile: true },
      orderBy: { profile: { totalXp: 'desc' } },
      take: 5,
    }),

    // 학년 분포
    prisma.user.findMany({
      where: studentScope,
      select: { grade: true },
    }),

    // 최근 활동
    prisma.learningProgress.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 6,
      include: {
        user: true,
        concept: { include: { subject: true } },
      },
    }),

    // 취약 단원: 최근 30일 AnswerLog
    prisma.answerLog.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { questionId: true, isCorrect: true },
    }),
  ]);

  // === 파생 계산 ===
  const avgLevel = profiles.length > 0
    ? Math.round(profiles.reduce((sum, p) => sum + p.level, 0) / profiles.length * 10) / 10
    : 0;

  const todayActiveStudents = profiles.filter(
    (p) => p.lastActiveAt && p.lastActiveAt >= todayStart
  ).length;

  const maxXp = Math.max(...profiles.map((p) => p.totalXp), 1);
  const focusStudents = lowPerformers
    .filter((s) => s.profile)
    .map((s) => ({
      id: s.id,
      name: s.name,
      grade: s.grade,
      subjectTitle: s.progress[0]?.concept?.subject?.title ?? '미시작',
      achievementPercent: Math.round((s.profile!.totalXp / maxXp) * 100),
    }))
    .slice(0, 5);

  // 학년 분포 - 안 쓰이지만 기존 쿼리 유지 (allStudents는 가져옴)
  void allStudents;

  // === 취약 단원 집계 ===
  const questionIds = [...new Set(recentAnswers.map((a) => a.questionId))];
  const questions = questionIds.length > 0
    ? await prisma.question.findMany({
        where: { id: { in: questionIds } },
        select: { id: true, chapter: true },
      })
    : [];
  const questionChapterMap = new Map(questions.map((q) => [q.id, q.chapter]));

  const chapterStats = new Map<string, { total: number; correct: number }>();
  for (const answer of recentAnswers) {
    const chapter = questionChapterMap.get(answer.questionId);
    if (!chapter) continue;
    const stat = chapterStats.get(chapter) ?? { total: 0, correct: 0 };
    stat.total++;
    if (answer.isCorrect) stat.correct++;
    chapterStats.set(chapter, stat);
  }

  const weakChapters = [...chapterStats.entries()]
    .map(([chapter, stat]) => ({
      chapter,
      total: stat.total,
      correct: stat.correct,
      rate: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
    }))
    .filter((ch) => ch.total >= 3)
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 5);

  const stageLabels: Record<string, string> = {
    READING: '개념 읽기',
    BLANK_EASY: '빈칸 (쉬움)',
    BLANK_HARD: '빈칸 (어려움)',
    BLANK_PAGE: '백지 쓰기',
  };

  const stageColors: Record<string, string> = {
    READING: 'bg-blue-500',
    BLANK_EASY: 'bg-emerald-500',
    BLANK_HARD: 'bg-orange-500',
    BLANK_PAGE: 'bg-purple-500',
  };

  const totalActions = pendingGrading + overdueAssignments + pendingAssignments;

  return (
    <div className="flex flex-col grow min-w-0 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 gap-5">
      {/* V2 비교 배너 */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-xl text-sm">
        <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-md">V2</span>
        <span className="text-blue-800">액션 + 실시간 + 인사이트 통합 대시보드</span>
        <Link href="/overview" className="ml-auto text-primary font-bold text-xs hover:underline flex items-center gap-1">
          기존 대시보드 <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
        <div>
          <p className="text-primary font-semibold text-xs tracking-widest uppercase mb-1">Overview</p>
          <h2 className="text-2xl md:text-3xl font-black text-text-primary tracking-tight">
            {isOwner ? '시스템 관리 대시보드' : '통합 대시보드'}
          </h2>
        </div>
        <OverviewActions />
      </div>

      {/* ===== 섹션 1: 액션 아이템 (선생님이 해야 할 일) ===== */}
      {totalActions > 0 ? (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-amber-800">처리 필요 항목 {totalActions}건</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/manual-grading"
              className="flex items-center gap-3 bg-white rounded-lg p-3 border border-amber-200/40 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <ClipboardCheck className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500">채점 대기</p>
                <p className="text-lg font-black text-orange-600">{pendingGrading}<span className="text-xs text-slate-400 font-bold ml-1">건</span></p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 transition-colors shrink-0" />
            </Link>
            <Link
              href="/tests"
              className="flex items-center gap-3 bg-white rounded-lg p-3 border border-red-200/40 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <FileWarning className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500">기한 초과</p>
                <p className="text-lg font-black text-red-600">{overdueAssignments}<span className="text-xs text-slate-400 font-bold ml-1">건</span></p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-red-500 transition-colors shrink-0" />
            </Link>
            <Link
              href="/tests"
              className="flex items-center gap-3 bg-white rounded-lg p-3 border border-blue-200/40 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500">미응시 배정</p>
                <p className="text-lg font-black text-blue-600">{pendingAssignments}<span className="text-xs text-slate-400 font-bold ml-1">건</span></p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200/60 rounded-xl px-4 py-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <p className="text-sm font-semibold text-emerald-700">모든 항목이 처리되었습니다. 대기 중인 작업이 없습니다.</p>
        </div>
      )}

      {/* ===== 섹션 2: 실시간 현황 카드 ===== */}
      <DashboardStatCards className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/60 flex items-start justify-between shadow-soft hover:shadow-hover hover:-translate-y-0.5 transition-all duration-300">
          <div>
            <p className="text-slate-500 text-xs font-medium">오늘 활동 학생</p>
            <h3 className="text-2xl font-black text-text-primary leading-none mt-1.5">
              {todayActiveStudents}<span className="text-sm text-slate-400 font-bold ml-1">/{totalStudents}명</span>
            </h3>
            <div className="flex items-center gap-1 mt-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-600">실시간</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/60 flex items-start justify-between shadow-soft hover:shadow-hover hover:-translate-y-0.5 transition-all duration-300">
          <div>
            <p className="text-slate-500 text-xs font-medium">진행 중 시험</p>
            <h3 className="text-2xl font-black text-text-primary leading-none mt-1.5">
              {inProgressTests}<span className="text-sm text-slate-400 font-bold ml-1">건</span>
            </h3>
            <div className="flex items-center gap-1 mt-2">
              {inProgressTests > 0 ? (
                <>
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span className="text-[10px] font-bold text-amber-600">응시 중</span>
                </>
              ) : (
                <span className="text-[10px] font-bold text-slate-400">대기</span>
              )}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5 text-amber-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/60 flex items-start justify-between shadow-soft hover:shadow-hover hover:-translate-y-0.5 transition-all duration-300">
          <div>
            <p className="text-slate-500 text-xs font-medium">이번 주 학습 완료</p>
            <h3 className="text-2xl font-black text-text-primary leading-none mt-1.5">
              {weekCompletedLearning}<span className="text-sm text-slate-400 font-bold ml-1">건</span>
            </h3>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-600">최근 7일</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/60 flex items-start justify-between shadow-soft hover:shadow-hover hover:-translate-y-0.5 transition-all duration-300">
          <div>
            <p className="text-slate-500 text-xs font-medium">
              {isOwner ? `선생님 ${totalTeachers}명 · 학생` : '전체 학생'}
            </p>
            <h3 className="text-2xl font-black text-text-primary leading-none mt-1.5">
              {totalStudents}<span className="text-sm text-slate-400 font-bold ml-1">명</span>
            </h3>
            <div className="flex items-center gap-1 mt-2">
              <GraduationCap className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-bold text-primary">평균 Lv.{avgLevel.toFixed(1)}</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-primary" />
          </div>
        </div>
      </DashboardStatCards>

      {/* ===== 섹션 3: 차트 (8col) + 집중 관리 학생 (4col) ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 bg-white p-5 md:p-6 rounded-xl border border-slate-200/60 shadow-soft">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-text-primary">월간 학습 추이</h3>
              <p className="text-slate-500 text-xs mt-0.5">전체 코호트 학습 완료율 추적</p>
            </div>
            <span className="text-xs text-text-secondary bg-slate-100 px-2.5 py-1.5 rounded-md font-medium">
              최근 6개월
            </span>
          </div>
          <MonthlyChartV2 />
        </div>

        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/60 shadow-soft flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <h3 className="text-base font-bold text-text-primary">집중 관리 학생</h3>
            <Link href="/students" className="text-primary text-xs font-bold hover:underline">
              모두 보기
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ maxHeight: '320px' }}>
            {focusStudents.length === 0 ? (
              <p className="text-slate-400 text-center py-8 text-sm">등록된 학생이 없습니다.</p>
            ) : (
              focusStudents.map((student, idx) => {
                const colors = getAchievementColor(student.achievementPercent);
                const barColor = student.achievementPercent < 50 ? 'bg-red-500' : 'bg-primary';
                return (
                  <div key={student.id} className={`flex items-center gap-3 ${idx >= 3 ? 'opacity-60' : ''}`}>
                    <div className={`w-10 h-10 rounded-full ${colors.bg} flex items-center justify-center text-sm font-bold ${colors.text} shrink-0`}>
                      {student.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-end mb-1">
                        <p className="text-sm font-bold text-text-primary leading-none truncate">{student.name}</p>
                        <span className={`text-[10px] font-bold ${student.achievementPercent < 50 ? 'text-red-500' : 'text-primary'}`}>
                          {student.achievementPercent}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${student.achievementPercent}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="px-4 py-3 border-t border-slate-100">
            <Link
              href="/students"
              className="flex items-center justify-center gap-1.5 w-full py-2.5 bg-slate-100 rounded-xl text-text-primary text-xs font-bold hover:bg-slate-200 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              집중 관리 목록 추가
            </Link>
          </div>
        </div>
      </div>

      {/* ===== 섹션 4: DashboardAnalytics (기존 클라이언트 컴포넌트) ===== */}
      <DashboardAnalytics />

      {/* ===== 섹션 5: 인사이트 하단 3열 ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
        {/* 취약 단원 TOP 5 (V1에 없는 차별점) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200/60 shadow-soft">
          <h3 className="text-sm font-black text-text-primary uppercase tracking-wider flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            취약 단원 TOP 5
          </h3>
          {weakChapters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
              <p className="text-xs text-slate-400">30일 내 데이터가 부족합니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {weakChapters.map((ch, i) => {
                const rateColor = ch.rate < 50 ? 'text-red-600 bg-red-50' : ch.rate < 70 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50';
                const barColor = ch.rate < 50 ? 'bg-red-400' : ch.rate < 70 ? 'bg-amber-400' : 'bg-emerald-400';
                return (
                  <div key={ch.chapter} className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-300 w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-text-primary truncate">{ch.chapter}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${rateColor}`}>
                          {ch.rate}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${ch.rate}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
              <p className="text-[10px] text-slate-400 mt-1">최근 30일 · 3문제 이상 풀이 기준</p>
            </div>
          )}
        </div>

        {/* XP 랭킹 TOP 5 */}
        <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200/60 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              XP 랭킹 Top 5
            </h3>
            <Link href="/ranking" className="text-primary text-xs font-bold hover:underline">
              전체 보기
            </Link>
          </div>
          <div className="space-y-2.5">
            {topStudents.map((s, i) => (
              <div key={s.id} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0 ? 'bg-amber-100 text-amber-700'
                        : i === 1 ? 'bg-slate-200 text-slate-600'
                        : i === 2 ? 'bg-orange-100 text-orange-700'
                        : 'bg-slate-50 text-slate-400'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-text-primary">{s.name}</span>
                </div>
                <span className={`text-xs font-bold ${i <= 2 ? 'text-slate-600' : 'text-slate-300'}`}>
                  {formatNumber(s.profile?.totalXp ?? 0)} XP
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 최근 활동 타임라인 */}
        <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200/60 shadow-soft">
          <h3 className="text-sm font-black text-text-primary uppercase tracking-wider flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-primary" />
            최근 활동
          </h3>
          <div className="space-y-3.5">
            {recentActivity.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">아직 학습 기록이 없습니다.</p>
            ) : (
              recentActivity.slice(0, 5).map((a) => {
                const dotColor = stageColors[a.stage] ?? 'bg-blue-500';
                return (
                  <div key={a.id} className="flex gap-3">
                    <div className={`w-2 h-2 rounded-full ${dotColor} mt-1.5 shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-text-primary truncate">
                        {a.user.name} — {stageLabels[a.stage] ?? a.stage}
                        {a.completed && ' 완료'}
                      </p>
                      <p className="text-[10px] text-slate-400">{getTimeAgo(a.updatedAt)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
