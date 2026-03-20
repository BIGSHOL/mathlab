import {
  Award, BookOpen, CalendarCheck, Play,
  CheckCircle, Flame, Trophy, Rocket,
  XCircle, BarChart3, History, Lightbulb, Target,
  FileQuestion, Calculator, ClipboardCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getViewAsUser } from '@/lib/view-as';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { xpToNextLevel } from '@/lib/utils/xp';
import { getTodayHomework } from '@/lib/services/homework';
import { getTodayConceptHomework } from '@/lib/services/concept-homework';
import { getTodayQuestionHomework } from '@/lib/services/question-homework';
import { DashboardGamification } from '@/components/student/DashboardGamification';

export default async function StudentDashboardV2({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string; _as?: string }>;
}) {
  const realUser = await getCurrentUser();
  if (!realUser) redirect('/login');

  const params = await searchParams;
  if (realUser.role !== 'STUDENT' && !params.preview && !params._as) {
    redirect('/overview');
  }

  const user = await getViewAsUser(params) ?? realUser;

  const profile = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
  const totalXp = profile?.totalXp ?? 0;
  const level = profile?.level ?? 1;
  const streak = profile?.currentStreak ?? 0;
  const nextLevel = xpToNextLevel(totalXp);

  // 배정된 과정 조회
  const activeEnrollment = await prisma.learningCourseEnrollment.findFirst({
    where: { studentId: user.id, status: 'ACTIVE' },
    include: {
      course: {
        include: {
          concepts: { orderBy: { sortOrder: 'asc' }, include: { concept: { select: { id: true, title: true, conceptCode: true } } } },
        },
      },
    },
  });
  const enrollmentCount = await prisma.learningCourseEnrollment.count({ where: { studentId: user.id } });
  const _completedCourseCount = await prisma.learningCourseEnrollment.count({ where: { studentId: user.id, status: 'COMPLETED' } });
  const hasEnrollments = enrollmentCount > 0;

  const courseConceptIds = activeEnrollment?.course.concepts.map((c) => c.conceptId) ?? [];
  const totalConcepts = hasEnrollments ? courseConceptIds.length : await prisma.concept.count({
    where: user.grade ? { subject: { gradeLevel: user.grade } } : {},
  });

  const completedConcepts = await prisma.learningProgress.groupBy({
    by: ['conceptId'],
    where: {
      userId: user.id,
      stage: 'BLANK_FULL',
      completed: true,
      ...(hasEnrollments && courseConceptIds.length > 0 ? { conceptId: { in: courseConceptIds } } : {}),
    },
  });
  const completedConceptIds = new Set(completedConcepts.map((c) => c.conceptId));

  // 최근 학습한 개념 (최근 3개)
  const recentProgress = await prisma.learningProgress.findMany({
    where: { userId: user.id },
    include: { concept: { include: { subject: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 12,
  });
  const seenConcepts = new Set<string>();
  const uniqueRecentProgress = recentProgress.filter((p) => {
    if (seenConcepts.has(p.conceptId)) return false;
    seenConcepts.add(p.conceptId);
    return true;
  }).slice(0, 3);

  const stageLabels: Record<string, string> = {
    READING: '개념 읽기',
    BLANK_EASY: '빈칸 (쉬움)',
    BLANK_HARD: '빈칸 (어려움)',
    BLANK_FULL: '통문장 암기',
    BLANK_PAGE: '통문장 암기',
  };

  // 숙제
  const todayHomework = await getTodayHomework(user.id);
  const pendingHomework = todayHomework.filter((h) => h.status !== 'COMPLETED');
  const todayConceptHw = await getTodayConceptHomework(user.id);
  const pendingConceptHw = todayConceptHw.filter((hw) => hw.concepts.some((c) => !c.allCompleted));
  const todayQuestionHw = await getTodayQuestionHomework(user.id);
  const pendingQuestionHw = todayQuestionHw.filter((hw) => hw.status !== 'COMPLETED');

  // 주간 활동
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const _weeklyActivity = await prisma.learningProgress.count({
    where: { userId: user.id, updatedAt: { gte: weekAgo } },
  });

  // 최근 오답
  const recentWrongAnswers = await prisma.answerLog.findMany({
    where: { attempt: { studentId: user.id }, isCorrect: false },
    include: { attempt: { select: { test: { select: { title: true } } } } },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  const seenQIds = new Set<string>();
  const uniqueWrongAnswers = recentWrongAnswers.filter((a) => {
    if (seenQIds.has(a.questionId)) return false;
    seenQIds.add(a.questionId);
    return true;
  }).slice(0, 5);
  const wrongQuestionIds = uniqueWrongAnswers.map((a) => a.questionId);
  const wrongQuestions = wrongQuestionIds.length > 0
    ? await prisma.question.findMany({
        where: { id: { in: wrongQuestionIds } },
        select: { id: true, content: true, chapter: true, difficulty: true },
      })
    : [];
  const wrongQMap = new Map(wrongQuestions.map((q) => [q.id, q]));

  // 주간 일별 학습량
  const dailyActivity: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const count = await prisma.answerLog.count({
      where: { attempt: { studentId: user.id }, createdAt: { gte: dayStart, lt: dayEnd } },
    });
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    dailyActivity.push({ date: dayNames[d.getDay()], count });
  }
  const maxDailyCount = Math.max(...dailyActivity.map((d) => d.count), 1);
  const todayIdx = dailyActivity.length - 1;

  // 랭킹
  const topStudents = await prisma.studentProfile.findMany({
    where: { totalXp: { gt: 0 } },
    include: { user: { select: { name: true, id: true } } },
    orderBy: { totalXp: 'desc' },
    take: 5,
  });
  const _myRank = profile
    ? (await prisma.studentProfile.count({ where: { totalXp: { gt: profile.totalXp } } })) + 1
    : null;

  // 추천 학습
  const recommendedConcepts = hasEnrollments && courseConceptIds.length > 0
    ? await prisma.concept.findMany({
        where: {
          id: { in: courseConceptIds },
          NOT: { progress: { some: { userId: user.id, stage: 'BLANK_FULL', completed: true } } },
        },
        include: { subject: true },
        take: 3,
        orderBy: { sortOrder: 'asc' },
      })
    : !hasEnrollments
      ? await prisma.concept.findMany({
          where: {
            ...(user.grade ? { subject: { gradeLevel: user.grade } } : {}),
            NOT: { progress: { some: { userId: user.id, stage: 'BLANK_FULL', completed: true } } },
          },
          include: { subject: true },
          take: 3,
          orderBy: { sortOrder: 'asc' },
        })
      : [];

  const completedCount = completedConcepts.length;
  const progressPercent = totalConcepts > 0 ? Math.round((completedCount / totalConcepts) * 100) : 0;

  // 시험 성적 (평균 점수 + 최근 시험)
  const testAttempts = await prisma.testAttempt.findMany({
    where: { studentId: user.id, completedAt: { not: null } },
    include: { test: { select: { title: true } } },
    orderBy: { completedAt: 'desc' },
  });
  const avgScore = testAttempts.length > 0
    ? Math.round(testAttempts.reduce((sum, a) => sum + (a.maxScore > 0 ? (a.score / a.maxScore) * 100 : 0), 0) / testAttempts.length)
    : 0;
  const lastTest = testAttempts[0] ?? null;

  // 연산 연습 (총 풀이 수 + 정답률)
  const arithmeticAttempts = await prisma.arithmeticAttempt.findMany({
    where: { studentId: user.id },
    select: { problemCount: true, correctCount: true },
  });
  const totalArithProblems = arithmeticAttempts.reduce((s, a) => s + a.problemCount, 0);
  const totalArithCorrect = arithmeticAttempts.reduce((s, a) => s + a.correctCount, 0);
  const arithAccuracy = totalArithProblems > 0 ? Math.round((totalArithCorrect / totalArithProblems) * 100) : 0;

  // 뱃지 현황
  const earnedBadges = await prisma.userBadge.count({ where: { userId: user.id } });
  const totalBadges = await prisma.badge.count();

  // 총 미완료 숙제 수
  const totalPendingHw = pendingHomework.length + pendingConceptHw.length + pendingQuestionHw.length;
  const hasMission = totalPendingHw > 0;

  return (
    <div className="px-4 md:px-8 py-6 w-full">
      {/* ──── Header ──── */}
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
            반가워요, {user.name} 학생!
          </h2>
          <p className="text-text-secondary text-sm mt-0.5">
            {nextLevel.remaining > 0
              ? `다음 레벨까지 ${nextLevel.remaining.toLocaleString()} XP 남았습니다.`
              : '최고 레벨을 달성했습니다!'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-full shadow-sm">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-bold text-text-primary">{totalXp.toLocaleString()} pts</span>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 px-3 py-2 rounded-full">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-bold text-orange-600">{streak}일</span>
            </div>
          )}
        </div>
      </header>

      {/* ──── 숙제 배너 ──── */}
      {pendingHomework.length > 0 && (
        <Link href="/practice/arithmetic/homework" className="block mb-3">
          <div className="bg-gradient-to-r from-indigo-500 to-violet-500 rounded-xl p-4 text-white hover:from-indigo-600 hover:to-violet-600 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CalendarCheck className="w-7 h-7 opacity-90" />
                <div>
                  <p className="text-xs font-medium opacity-80">오늘의 연산 숙제</p>
                  <p className="font-bold text-sm">{pendingHomework[0].planTitle} · {pendingHomework[0].dayLabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5">
                <Play className="w-3.5 h-3.5" />
                <span className="font-bold text-xs">풀기</span>
              </div>
            </div>
          </div>
        </Link>
      )}

      {pendingConceptHw.length > 0 && pendingConceptHw.map((hw) => {
        const pending = hw.concepts.filter((c) => !c.allCompleted);
        const firstConcept = pending[0];
        return (
          <Link key={hw.planId} href={firstConcept ? `/concepts/${firstConcept.id}` : '/subjects'} className="block mb-3">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-4 text-white hover:from-emerald-600 hover:to-teal-600 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-7 h-7 opacity-90" />
                  <div>
                    <p className="text-xs font-medium opacity-80">오늘의 개념 숙제 · {hw.dayLabel}</p>
                    <p className="font-bold text-sm">{hw.planTitle} · {pending.length}개 남음</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {hw.concepts.map((c) => (
                    <div key={c.id} className="flex gap-0.5">
                      {c.stages.map((s, i) => (
                        <div key={i} className={`w-2 h-2 rounded-sm ${s.completed ? 'bg-white' : 'bg-white/30'}`} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Link>
        );
      })}

      {pendingQuestionHw.length > 0 && pendingQuestionHw.map((hw) => (
        <Link key={hw.planId} href="/practice/question-homework" className="block mb-3">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-4 text-white hover:from-amber-600 hover:to-orange-600 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileQuestion className="w-7 h-7 opacity-90" />
                <div>
                  <p className="text-xs font-medium opacity-80">오늘의 문제 숙제</p>
                  <p className="font-bold text-sm">{hw.planTitle} · {hw.dayLabel} · {hw.questionCount}문제</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5">
                <Play className="w-3.5 h-3.5" />
                <span className="font-bold text-xs">풀기</span>
              </div>
            </div>
          </div>
        </Link>
      ))}

      {/* ──── Main Grid: 12-column ──── */}
      <div className="grid grid-cols-12 gap-5">
        {/* ─ Left Column (8/12) ─ */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-5">
          {/* Row 1: 지표 카드 3개 + 레벨 목표 */}
          <div className="grid grid-cols-12 gap-5">
            {/* 지표 카드 3개 */}
            <div className="col-span-12 md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* 시험 성적 */}
              <Link href="/my-tests" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-primary/30 transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">시험 성적</span>
                    <ClipboardCheck className="w-4 h-4 text-blue-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-2xl font-extrabold text-text-primary mb-0.5">
                    {testAttempts.length > 0 ? `${avgScore}점` : '-'}
                  </p>
                </div>
                <p className="text-[11px] text-text-secondary">
                  {lastTest ? `최근: ${lastTest.test.title}` : `총 ${testAttempts.length}회 응시`}
                </p>
              </Link>

              {/* 연산 연습 */}
              <Link href="/practice/arithmetic" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-primary/30 transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">연산 연습</span>
                    <Calculator className="w-4 h-4 text-emerald-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-2xl font-extrabold text-text-primary mb-0.5">
                    {totalArithProblems > 0 ? `${totalArithProblems.toLocaleString()}문제` : '-'}
                  </p>
                </div>
                <p className="text-[11px] text-text-secondary">
                  {totalArithProblems > 0 ? `정답률 ${arithAccuracy}%` : '아직 풀이 없음'}
                </p>
              </Link>

              {/* 뱃지 현황 */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-primary/30 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">뱃지</span>
                    <Award className="w-4 h-4 text-amber-400 opacity-50" />
                  </div>
                  <p className="text-2xl font-extrabold text-text-primary mb-0.5">
                    {earnedBadges}<span className="text-sm text-slate-400 font-bold ml-1">/ {totalBadges}</span>
                  </p>
                </div>
                <p className="text-[11px] text-text-secondary">
                  {earnedBadges > 0 ? `${totalBadges - earnedBadges}개 남음` : '첫 뱃지를 획득해보세요'}
                </p>
              </div>
            </div>

            {/* 레벨 목표 위젯 */}
            <div className="col-span-12 md:col-span-4">
              <div className="bg-gradient-to-br from-blue-700 to-primary p-5 rounded-2xl text-white shadow-lg h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 opacity-80" />
                    <h3 className="text-xs font-bold opacity-90">학습 목표</h3>
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-2xl font-extrabold">Level {level}</span>
                      <span className="text-xs font-medium opacity-80">{progressPercent}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full" style={{ width: `${progressPercent}%` }} />
                    </div>
                  </div>
                </div>
                <p className="text-[11px] opacity-70 leading-relaxed">
                  {totalConcepts - completedCount > 0
                    ? `${totalConcepts - completedCount}개의 개념 학습이 남아있습니다.`
                    : '모든 개념을 완료했습니다!'}
                </p>
              </div>
            </div>
          </div>

          {/* Row 2: 오늘의 학습 여정 (Hero) */}
          <div className="bg-primary p-7 rounded-2xl relative overflow-hidden text-white shadow-xl shadow-primary/20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
              <div className="w-28 h-28 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shrink-0">
                <Rocket className="w-14 h-14 text-white" />
              </div>
              <div className="text-center md:text-left">
                <h2 className="text-xl font-extrabold mb-1.5">오늘의 학습 여정</h2>
                <p className="text-white/80 text-sm mb-5 max-w-sm">
                  {hasMission
                    ? `오늘 ${totalPendingHw}건의 미완료 숙제가 있습니다. 학습을 시작하세요!`
                    : uniqueRecentProgress.length > 0
                      ? '이어서 학습하거나 새로운 개념을 시작해보세요!'
                      : '첫 번째 개념 학습을 시작하고 배지를 획득하세요!'}
                </p>
                <Link href="/subjects">
                  <button className="px-7 py-2.5 bg-white text-primary rounded-full font-extrabold text-sm shadow-lg hover:bg-slate-50 transition-all active:scale-95">
                    학습 시작하기
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* Row 3: 주간 학습 활동 차트 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-end mb-5">
              <div>
                <h3 className="text-base font-bold text-text-primary">주간 학습 활동</h3>
                <p className="text-xs text-text-secondary">지난 7일간의 학습 통계</p>
              </div>
              <Link href="/ranking" className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/5 px-3 py-1 rounded-full hover:bg-primary/10 transition-colors">
                <span>상세 보기</span>
                <BarChart3 className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="flex items-end justify-between gap-3 h-44 px-1">
              {dailyActivity.map((day, i) => {
                const isToday = i === todayIdx;
                const pct = Math.max((day.count / maxDailyCount) * 100, day.count > 0 ? 12 : 4);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full flex flex-col items-center justify-end h-[140px]">
                      {day.count > 0 && (
                        <span className="text-[10px] text-text-secondary font-medium mb-1">{day.count}</span>
                      )}
                      <div
                        className={`w-full max-w-[28px] rounded-t-lg transition-all ${
                          isToday ? 'bg-primary shadow-md' : 'bg-slate-100'
                        }`}
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-bold ${isToday ? 'text-primary' : 'text-text-secondary'}`}>
                      {day.date}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─ Right Column (4/12) ─ */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-5">
          {/* 진행 중인 학습 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-text-primary">진행 중인 학습</h3>
              </div>
              <Link href="/subjects" className="text-[10px] font-semibold text-primary hover:underline">모두 보기</Link>
            </div>
            <div className="space-y-2.5">
              {uniqueRecentProgress.length === 0 ? (
                <div className="text-center py-6">
                  <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-text-secondary text-xs mb-3">아직 시작한 학습이 없습니다.</p>
                  <Link href="/subjects">
                    <Button size="sm">학습 시작하기</Button>
                  </Link>
                </div>
              ) : (
                uniqueRecentProgress.map((p) => {
                  const isCompleted = completedConceptIds.has(p.conceptId);
                  return (
                    <Link key={p.id} href={`/concepts/${p.concept.conceptCode ?? p.conceptId}`} className="block">
                      <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors group ${
                        isCompleted ? 'bg-emerald-50/50 border border-emerald-100' : 'hover:bg-slate-50 border border-slate-100'
                      }`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {isCompleted ? <CheckCircle className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-text-primary truncate group-hover:text-primary transition-colors">
                            {p.concept.title}
                          </p>
                          <p className="text-[10px] text-text-secondary">
                            {isCompleted ? '완료됨' : stageLabels[p.stage] ?? p.stage}
                            {p.concept.subject && ` · ${p.concept.subject.title}`}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* 취약 개념 / 최근 오답 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-text-primary">취약 개념</h3>
              {uniqueWrongAnswers.length > 0 && (
                <Link href="/practice/revenge" className="text-[10px] font-semibold text-primary hover:underline">복습하기</Link>
              )}
            </div>
            <div className="space-y-2.5">
              {uniqueWrongAnswers.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle className="w-7 h-7 text-emerald-300 mx-auto mb-1.5" />
                  <p className="text-text-secondary text-xs">오답이 없습니다!</p>
                </div>
              ) : (
                <>
                  {uniqueWrongAnswers.slice(0, 3).map((ans) => {
                    const q = wrongQMap.get(ans.questionId);
                    if (!q) return null;
                    const preview = q.content.replace(/\$[^$]*\$/g, '□').replace(/[#*]/g, '').slice(0, 30);
                    const isHigh = q.difficulty === 'HIGH' || q.difficulty === 'HIGHEST';
                    return (
                      <div key={ans.id} className={`flex items-center justify-between p-3 rounded-xl border ${
                        isHigh ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'
                      }`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <XCircle className={`w-4 h-4 shrink-0 ${isHigh ? 'text-red-500' : 'text-amber-500'}`} />
                          <span className={`text-[11px] font-bold truncate ${isHigh ? 'text-red-900' : 'text-amber-900'}`}>{preview}</span>
                        </div>
                        {q.chapter && (
                          <span className={`text-[9px] font-bold shrink-0 ml-2 ${isHigh ? 'text-red-500' : 'text-amber-500'}`}>{q.chapter}</span>
                        )}
                      </div>
                    );
                  })}
                  <Link href="/practice/revenge">
                    <button className="w-full py-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold hover:bg-slate-50 transition-colors mt-1">
                      복습 문제 풀기
                    </button>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* 최근 학습 기록 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              최근 학습 기록
            </h3>
            <div className="space-y-5 relative before:absolute before:left-[11px] before:top-1 before:bottom-1 before:w-[2px] before:bg-slate-100">
              {uniqueRecentProgress.length === 0 ? (
                <p className="text-text-secondary text-xs text-center py-4 relative">학습 기록이 없습니다.</p>
              ) : (
                uniqueRecentProgress.map((p, i) => {
                  const diff = Date.now() - p.updatedAt.getTime();
                  const hours = Math.floor(diff / (1000 * 60 * 60));
                  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                  const timeLabel = hours < 1 ? '방금 전' : hours < 24 ? `${hours}시간 전` : days === 1 ? '어제' : `${days}일 전`;
                  const isFirst = i === 0;
                  return (
                    <div key={p.id} className="relative pl-8">
                      <div className={`absolute left-0 top-1 w-[24px] h-[24px] bg-white border-2 rounded-full flex items-center justify-center z-10 ${
                        isFirst ? 'border-primary' : 'border-slate-200'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${isFirst ? 'bg-primary' : 'bg-slate-300'}`} />
                      </div>
                      <p className="text-[11px] font-bold text-text-primary">{stageLabels[p.stage] ?? p.stage}</p>
                      <p className="text-[10px] text-text-secondary">{timeLabel} · {p.concept.subject.title} &gt; {p.concept.title}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 추천 학습 */}
          <div className="bg-slate-50/50 p-4 rounded-2xl border border-dashed border-slate-200">
            <p className="text-[10px] font-extrabold text-text-secondary uppercase tracking-widest mb-3">추천 학습</p>
            {recommendedConcepts.length === 0 ? (
              <div className="text-center py-2">
                <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                <p className="text-text-secondary text-xs">모든 개념을 완료했습니다!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recommendedConcepts.map((c) => (
                  <Link key={c.id} href={`/concepts/${c.conceptCode ?? c.id}`} className="flex items-center gap-2.5 text-xs font-bold text-text-primary hover:text-primary transition-colors group">
                    <Lightbulb className="w-4 h-4 text-primary shrink-0" />
                    <span className="truncate">{c.title}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 게이미피케이션 */}
          <DashboardGamification />
        </div>

        {/* ──── 하단 전체: 랭킹 ──── */}
        <div className="col-span-12">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-text-primary">실시간 학생 랭킹</h3>
              <Link href="/ranking" className="text-primary text-xs font-bold hover:underline">전체 순위 보기</Link>
            </div>
            {topStudents.length === 0 ? (
              <p className="text-text-secondary text-xs text-center py-4">학습을 시작하면 랭킹에 표시됩니다.</p>
            ) : (
              <div className="flex overflow-x-auto gap-3 pb-1 no-scrollbar">
                {topStudents.map((s, i) => {
                  const isMe = s.user.id === user.id;
                  const medalColors = ['text-amber-500', 'text-slate-400', 'text-amber-700'];
                  return (
                    <div
                      key={s.id}
                      className={`flex-shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                        isMe
                          ? 'bg-primary text-white shadow-lg shadow-primary/20'
                          : 'bg-slate-50 border border-slate-200'
                      }`}
                    >
                      <span className={`text-lg font-extrabold ${
                        isMe ? 'text-white' : (medalColors[i] ?? 'text-slate-400')
                      }`}>
                        {i + 1}
                      </span>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isMe ? 'bg-white/20 text-white' : 'bg-gradient-to-tr from-primary to-accent text-white'
                      }`}>
                        {s.user.name?.[0] ?? '?'}
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${isMe ? 'text-white' : 'text-text-primary'}`}>
                          {s.user.name}{isMe && ' (나)'}
                        </p>
                        <p className={`text-[10px] ${isMe ? 'text-white/80' : 'text-text-secondary'}`}>
                          {s.totalXp.toLocaleString()} XP
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
