import { Award, Star, CheckCircle, Flame, Play, BookOpen, ArrowRight, CalendarCheck, FileQuestion, Trophy, Activity, XCircle, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageContainer } from '@/components/ui/PageContainer';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getViewAsUser } from '@/lib/view-as';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { xpToNextLevel } from '@/lib/utils/xp';
import { getTodayHomework } from '@/lib/services/homework';
import { getTodayConceptHomework } from '@/lib/services/concept-homework';
import { getTodayQuestionHomework } from '@/lib/services/question-homework';
import { hasLicense } from '@/lib/services/license';
import { DashboardGamification } from '@/components/student/DashboardGamification';
import { ReviewReminderCard } from '@/components/student/ReviewReminderCard';
import { DashboardStatCards } from '@/components/student/DashboardStatCards';
import { ExamPrepWidget } from '@/components/student/ExamPrepWidget';
import { NextBestActionCard, type NextBestAction } from '@/components/student/NextBestActionCard';
import { DailyRouletteCard } from '@/components/student/DailyRouletteCard';

export default async function StudentDashboard({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string; _as?: string }>;
}) {
  const realUser = await getCurrentUser();
  if (!realUser) redirect('/login');

  const params = await searchParams;

  // Redirect teacher to teacher dashboard (unless preview mode or impersonation)
  if (realUser.role !== 'STUDENT' && !params.preview && !params._as) {
    redirect('/overview');
  }

  // 특정 학생 시점으로 보기 (선생님/관리자 전용)
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
          concepts: { orderBy: { sortOrder: 'asc' }, include: { concept: { select: { id: true, title: true, conceptCode: true, subject: { select: { title: true } } } } } },
        },
      },
    },
  });
  const enrollmentCount = await prisma.learningCourseEnrollment.count({ where: { studentId: user.id } });
  const _completedCourseCount = await prisma.learningCourseEnrollment.count({ where: { studentId: user.id, status: 'COMPLETED' } });
  const hasEnrollments = enrollmentCount > 0;

  // enrollment 기반 개념 수
  const courseConceptIds = activeEnrollment?.course.concepts.map((c) => c.conceptId) ?? [];
  // 워크북 출력 전용 본문(textbook-rich)은 학생 대시보드 카운트에서 제외
  const totalConcepts = hasEnrollments ? courseConceptIds.length : await prisma.concept.count({
    where: {
      ...(user.grade ? { subject: { gradeLevel: user.grade } } : {}),
      NOT: { source: 'textbook-rich' },
    },
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

  // 과정 내 개념 진행 상태 (배정된 과정이 있을 때)
  const courseConceptProgress = activeEnrollment
    ? await prisma.learningProgress.findMany({
        where: { userId: user.id, conceptId: { in: courseConceptIds } },
        include: { concept: { include: { subject: true } } },
        orderBy: { updatedAt: 'desc' },
      })
    : [];

  // 과정 내 미완료 개념 우선 표시 (최대 3개)
  const isSequentialCourse = activeEnrollment?.course.mode === 'sequential';
  const courseProgressItems = activeEnrollment
    ? (() => {
        // 개념별 최신 progress만 유지
        const progressMap = new Map<string, typeof courseConceptProgress[number]>();
        for (const p of courseConceptProgress) {
          if (!progressMap.has(p.conceptId)) progressMap.set(p.conceptId, p);
        }
        // 과정 개념 순서대로, 미완료 우선
        const incompleteConcepts = activeEnrollment.course.concepts
          .filter((cc) => !completedConceptIds.has(cc.conceptId));

        // 순차 모드: 잠긴 개념 제외 (이전 개념 미완료)
        const unlocked = isSequentialCourse
          ? incompleteConcepts.filter((cc, _i) => {
              const idx = activeEnrollment.course.concepts.indexOf(cc);
              if (idx === 0) return true;
              const prevId = activeEnrollment.course.concepts[idx - 1].conceptId;
              return completedConceptIds.has(prevId);
            })
          : incompleteConcepts;

        return unlocked
          .slice(0, 3)
          .map((cc) => ({
            conceptId: cc.conceptId,
            concept: cc.concept,
            progress: progressMap.get(cc.conceptId),
          }));
      })()
    : [];

  // 과정이 없을 때 fallback: 최근 학습한 개념
  const recentProgress = !activeEnrollment
    ? await prisma.learningProgress.findMany({
        where: { userId: user.id },
        include: { concept: { include: { subject: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 12,
      })
    : [];
  const seenConcepts = new Set<string>();
  const uniqueRecentProgress = recentProgress.filter((p) => {
    if (seenConcepts.has(p.conceptId)) return false;
    seenConcepts.add(p.conceptId);
    return true;
  }).slice(0, 3);

  const stageLabels: Record<string, string> = {
    READING: 'Stage 1 - 개념 읽기',
    BLANK_EASY: 'Stage 2 - 빈칸 채우기 (쉬움)',
    BLANK_HARD: 'Stage 3 - 빈칸 채우기 (어려움)',
    BLANK_FULL: 'Stage 4 - 통문장 암기',
    BLANK_PAGE: 'Stage 5 - 백지 복원',
  };

  // Today's homework (이용권 있을 때만 조회)
  const hasHomeworkLicense = await hasLicense(user.id, 'homework');
  const todayHomework = hasHomeworkLicense ? await getTodayHomework(user.id) : [];
  const pendingHomework = todayHomework.filter((h) => h.status !== 'COMPLETED');

  const todayConceptHw = hasHomeworkLicense ? await getTodayConceptHomework(user.id) : [];
  const pendingConceptHw = todayConceptHw.filter((hw) =>
    hw.concepts.some((c) => !c.allCompleted)
  );

  const todayQuestionHw = hasHomeworkLicense ? await getTodayQuestionHomework(user.id) : [];
  const pendingQuestionHw = todayQuestionHw.filter((hw) => hw.status !== 'COMPLETED');

  // 주간 활동 카운트
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weeklyActivity = await prisma.learningProgress.count({
    where: { userId: user.id, updatedAt: { gte: weekAgo } },
  });

  // 최근 오답 (최근 5개)
  const recentWrongAnswers = await prisma.answerLog.findMany({
    where: {
      attempt: { studentId: user.id },
      isCorrect: false,
    },
    include: {
      attempt: { select: { test: { select: { title: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  // questionId 중복 제거
  const seenQIds = new Set<string>();
  const uniqueWrongAnswers = recentWrongAnswers.filter((a) => {
    if (seenQIds.has(a.questionId)) return false;
    seenQIds.add(a.questionId);
    return true;
  }).slice(0, 5);
  // 문제 내용 조회
  const wrongQuestionIds = uniqueWrongAnswers.map((a) => a.questionId);
  const wrongQuestions = wrongQuestionIds.length > 0
    ? await prisma.question.findMany({
        where: { id: { in: wrongQuestionIds } },
        select: { id: true, content: true, chapter: true, difficulty: true, answer: true },
      })
    : [];
  const wrongQMap = new Map(wrongQuestions.map((q) => [q.id, q]));

  // 주간 일별 학습량 (7일)
  const dailyActivity: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const count = await prisma.answerLog.count({
      where: {
        attempt: { studentId: user.id },
        createdAt: { gte: dayStart, lt: dayEnd },
      },
    });
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dateLabel = `${d.getMonth() + 1}/${d.getDate()}(${dayNames[d.getDay()]})`;
    dailyActivity.push({ date: dateLabel, count });
  }
  const maxDailyCount = Math.max(...dailyActivity.map((d) => d.count), 1);

  // 랭킹 미리보기 (상위 5명 — 같은 테넌트 내)
  const rankingTenantScope = user.tenantId ? { user: { tenantId: user.tenantId } } : {};
  const topStudents = await prisma.studentProfile.findMany({
    where: { totalXp: { gt: 0 }, ...rankingTenantScope },
    include: { user: { select: { name: true, id: true } } },
    orderBy: { totalXp: 'desc' },
    take: 5,
  });
  const _myRank = profile
    ? (await prisma.studentProfile.count({ where: { totalXp: { gt: profile.totalXp }, ...rankingTenantScope } })) + 1
    : null;

  // 추천 학습 (배정 과정 기반: 아직 완료하지 않은 개념)
  // 순차 모드: 잠긴 개념 제외 (잠금 해제된 개념만 추천)
  const unlockedConceptIds = isSequentialCourse && activeEnrollment
    ? (() => {
        const ids: string[] = [];
        for (const cc of activeEnrollment.course.concepts) {
          const idx = activeEnrollment.course.concepts.indexOf(cc);
          if (completedConceptIds.has(cc.conceptId)) continue; // 이미 완료
          if (idx === 0 || completedConceptIds.has(activeEnrollment.course.concepts[idx - 1].conceptId)) {
            ids.push(cc.conceptId);
          }
        }
        return ids;
      })()
    : courseConceptIds;

  // 워크북 출력 전용 본문(textbook-rich)은 학생 추천에서 제외
  const _recommendedConcepts = hasEnrollments && courseConceptIds.length > 0
    ? await prisma.concept.findMany({
        where: {
          id: { in: unlockedConceptIds.length > 0 ? unlockedConceptIds : courseConceptIds },
          source: { not: 'textbook-rich' },
          NOT: {
            progress: {
              some: { userId: user.id, stage: 'BLANK_FULL', completed: true },
            },
          },
        },
        include: { subject: true },
        take: 3,
        orderBy: { sortOrder: 'asc' },
      })
    : !hasEnrollments
      ? await prisma.concept.findMany({
          where: {
            ...(user.grade ? { subject: { gradeLevel: user.grade } } : {}),
            source: { not: 'textbook-rich' },
            NOT: {
              progress: {
                some: { userId: user.id, stage: 'BLANK_FULL', completed: true },
              },
            },
          },
          include: { subject: true },
          take: 3,
          orderBy: { sortOrder: 'asc' },
        })
      : [];

  const completedCount = completedConcepts.length;
  const progressPercent = totalConcepts > 0 ? Math.round((completedCount / totalConcepts) * 100) : 0;

  // ──── Next Best Action — 우선순위 로직 (단일 CTA) ────
  const nextAction: NextBestAction | null = (() => {
    // 1. 연산 숙제 pending
    if (pendingHomework.length > 0) {
      const hw = pendingHomework[0];
      return {
        kind: 'arithmetic_hw',
        title: '오늘의 연산 숙제',
        subtitle: `${hw.planTitle} · ${hw.dayLabel} · ${hw.dailyCount}문제`,
        href: '/practice/arithmetic/homework',
        ctaLabel: '풀기',
        estimatedMinutes: Math.max(5, Math.round(hw.dailyCount * 0.7)),
        badge: `${hw.dailyCount}문제`,
      };
    }
    // 2. 개념 숙제 pending
    if (pendingConceptHw.length > 0) {
      const hw = pendingConceptHw[0];
      const pendingConcepts = hw.concepts.filter((c) => !c.allCompleted);
      const first = pendingConcepts[0];
      return {
        kind: 'concept_hw',
        title: '오늘의 개념 숙제',
        subtitle: `${hw.planTitle} · ${pendingConcepts.length}개 남음`,
        href: first ? `/concepts/${first.id}` : '/subjects',
        ctaLabel: '학습하기',
        estimatedMinutes: pendingConcepts.length * 12,
        badge: `${pendingConcepts.length}개`,
      };
    }
    // 3. 문제 숙제 pending
    if (pendingQuestionHw.length > 0) {
      const hw = pendingQuestionHw[0];
      return {
        kind: 'question_hw',
        title: '오늘의 문제 숙제',
        subtitle: `${hw.planTitle} · ${hw.dayLabel} · ${hw.questionCount}문제`,
        href: '/practice/question-homework',
        ctaLabel: '풀기',
        estimatedMinutes: Math.max(10, hw.questionCount * 2),
        badge: `${hw.questionCount}문제`,
      };
    }
    // 4. 오답 3개 이상 → 복수전
    if (uniqueWrongAnswers.length >= 3) {
      return {
        kind: 'revenge',
        title: '복수전에 도전!',
        subtitle: `최근 오답 ${uniqueWrongAnswers.length}개를 정복해 보세요`,
        href: '/practice/revenge',
        ctaLabel: '도전',
        estimatedMinutes: 8,
        badge: '🔥 오답 복수',
      };
    }
    // 5. 진행 중 과정에서 다음 개념
    if (activeEnrollment && courseProgressItems.length > 0) {
      const item = courseProgressItems[0];
      return {
        kind: 'course_continue',
        title: '이어서 학습하기',
        subtitle: `${activeEnrollment.course.title} · ${item.concept.title}`,
        href: `/concepts/${item.concept.conceptCode ?? item.conceptId}`,
        ctaLabel: '이어서',
        estimatedMinutes: 15,
      };
    }
    // 6. fallback — 단원 탐색
    return {
      kind: 'practice',
      title: '오늘도 학습 시작!',
      subtitle: '단원을 골라 학습을 시작해 보세요',
      href: '/subjects',
      ctaLabel: '시작하기',
      estimatedMinutes: 10,
    };
  })();

  const hasOtherPendingHw =
    (pendingHomework.length > 0 && nextAction?.kind !== 'arithmetic_hw') ||
    (pendingConceptHw.length > 0 && nextAction?.kind !== 'concept_hw') ||
    (pendingQuestionHw.length > 0 && nextAction?.kind !== 'question_hw');

  return (
    <PageContainer maxWidth="xl">
      {/* ──── 섹션 1: 지금 할 일 (단일 CTA) ──── */}
      {nextAction && <NextBestActionCard action={nextAction} />}

      {/* 남은 숙제들은 작은 칩으로 요약 표시 */}
      {hasOtherPendingHw && (
        <div className="mb-4 flex flex-wrap gap-2">
          {pendingHomework.length > 0 && nextAction?.kind !== 'arithmetic_hw' && (
            <Link
              href="/practice/arithmetic/homework"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold hover:bg-indigo-100 transition-colors"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              연산 숙제 {pendingHomework[0].dailyCount}문제
            </Link>
          )}
          {pendingConceptHw.length > 0 && nextAction?.kind !== 'concept_hw' && (
            <Link
              href="/subjects"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              개념 숙제 {pendingConceptHw.reduce((n, hw) => n + hw.concepts.filter((c) => !c.allCompleted).length, 0)}개
            </Link>
          )}
          {pendingQuestionHw.length > 0 && nextAction?.kind !== 'question_hw' && (
            <Link
              href="/practice/question-homework"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition-colors"
            >
              <FileQuestion className="w-3.5 h-3.5" />
              문제 숙제 {pendingQuestionHw.reduce((n, hw) => n + hw.questionCount, 0)}문제
            </Link>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">
            반가워요, {user.name} 학생!
          </h1>
          <p className="text-text-secondary text-sm mt-0.5">
            {nextLevel.remaining > 0
              ? `다음 레벨까지 ${nextLevel.remaining.toLocaleString()} XP 남았습니다.`
              : '최고 레벨을 달성했습니다!'}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3.5 py-1.5 rounded-full shadow-sm">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-bold text-text-primary">{totalXp.toLocaleString()} pts</span>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-full">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-bold text-orange-600">{streak}일</span>
            </div>
          )}
        </div>
      </div>

      {/* ──── 섹션 2: 통계 카드 4열 ──── */}
      <DashboardStatCards className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
        <Card padding="base" className="flex flex-col gap-2 hover:border-primary/30 transition-all relative overflow-hidden">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">현재 레벨</span>
            <Award className="w-4 h-4 text-blue-400 opacity-60" />
          </div>
          <p className="text-text-primary text-xl font-extrabold leading-none">Level {level}</p>
          <p className="text-xs text-text-secondary">{nextLevel.remaining} XP 남음</p>
        </Card>

        <Card padding="base" className="flex flex-col gap-2 hover:border-amber-300/50 transition-all relative overflow-hidden">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">나의 포인트</span>
            <Star className="w-4 h-4 text-amber-400 opacity-60" />
          </div>
          <p className="text-text-primary text-xl font-extrabold leading-none">{totalXp.toLocaleString()}</p>
          <p className="text-xs text-text-secondary">XP</p>
        </Card>

        <Card padding="base" className="flex flex-col gap-2 hover:border-indigo-300/50 transition-all relative overflow-hidden">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">완료 개념</span>
            <CheckCircle className="w-4 h-4 text-indigo-400 opacity-60" />
          </div>
          <p className="text-text-primary text-xl font-extrabold leading-none">
            {completedCount}
            <span className="text-sm text-slate-400 font-bold ml-0.5">/ {totalConcepts}</span>
          </p>
          <p className="text-xs text-text-secondary">{progressPercent}% 완료</p>
        </Card>

        <Card padding="base" className="flex flex-col gap-2 hover:border-emerald-300/50 transition-all relative overflow-hidden">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">주간 활동</span>
            <Activity className="w-4 h-4 text-emerald-400 opacity-60" />
          </div>
          <p className="text-text-primary text-xl font-extrabold leading-none">
            {weeklyActivity}
            <span className="text-sm text-slate-400 font-bold ml-0.5">건</span>
          </p>
          <p className="text-xs text-text-secondary">최근 7일</p>
        </Card>
      </DashboardStatCards>

      {/* ──── Row 1: 진행 중인 학습 (2/3) + 추천 학습 + 오늘의 미션 (1/3) ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2">
          <Card padding="md" className="h-full rounded-sm">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-text-primary">
                  {activeEnrollment ? activeEnrollment.course.title : '최근 학습'}
                </h2>
                {activeEnrollment && (
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {completedCount}/{totalConcepts}
                  </span>
                )}
              </div>
              <Link href="/subjects" className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
                단원 목록 <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              {activeEnrollment && courseProgressItems.length > 0 ? (
                /* 과정 기반: 미완료 개념 표시 */
                courseProgressItems.map((item) => {
                  const stage = item.progress?.stage;
                  const stageLabel = stage ? (stageLabels[stage] ?? stage) : '미시작';
                  return (
                    <div key={item.conceptId} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-sm bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors group">
                      <div className="flex-shrink-0 h-10 w-10 rounded-sm flex items-center justify-center bg-blue-100 text-blue-600">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-text-primary font-semibold text-sm mb-0.5 group-hover:text-primary transition-colors truncate">
                          {item.concept.title}
                        </h3>
                        <p className="text-text-secondary text-sm">{stageLabel}</p>
                      </div>
                      <Link href={`/concepts/${item.concept.conceptCode ?? item.conceptId}`} className="shrink-0">
                        <Button size="sm" className="w-[100px] justify-center whitespace-nowrap">{stage ? '이어서 하기' : '시작하기'}</Button>
                      </Link>
                    </div>
                  );
                })
              ) : activeEnrollment && courseProgressItems.length === 0 ? (
                /* 과정 내 모든 개념 완료 */
                <div className="text-center py-8">
                  <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                  <p className="text-text-secondary mb-1 font-medium">과정 내 모든 개념을 완료했습니다!</p>
                  <p className="text-text-secondary text-sm">단원 목록에서 복습할 수 있습니다.</p>
                </div>
              ) : uniqueRecentProgress.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-text-secondary mb-4">아직 시작한 학습이 없습니다.</p>
                  <Link href="/subjects">
                    <Button size="md">
                      <Play className="w-4 h-4 mr-2" />
                      학습 시작하기
                    </Button>
                  </Link>
                </div>
              ) : (
                uniqueRecentProgress.map((p) => {
                  const isCompleted = completedConceptIds.has(p.conceptId);
                  return (
                    <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-sm bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors group">
                      <div className={`flex-shrink-0 h-10 w-10 rounded-sm flex items-center justify-center ${isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                        {isCompleted ? <CheckCircle className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-text-primary font-semibold text-sm mb-0.5 group-hover:text-primary transition-colors truncate">
                          {p.concept.subject.title}: {p.concept.title}
                        </h3>
                        <p className="text-text-secondary text-sm">
                          {isCompleted ? '학습 완료!' : stageLabels[p.stage] ?? p.stage}
                        </p>
                      </div>
                      <Link href={`/concepts/${p.concept.conceptCode ?? p.conceptId}`} className="shrink-0">
                        <Button size="sm" className="w-[100px] justify-center whitespace-nowrap">{isCompleted ? '복습하기' : '이어서 하기'}</Button>
                      </Link>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
        <div className="flex flex-col gap-4">
          {/* 일일 룰렛 */}
          <DailyRouletteCard />
          {/* 게이미피케이션 (오늘의 미션 + 오늘의 한 문제) */}
          <DashboardGamification />
        </div>
      </div>

      {/* ──── 내신대비 위젯 ──── */}
      <div className="mb-4">
        <ExamPrepWidget />
      </div>

      {/* ──── 간격 반복 복습 ──── */}
      <div className="mb-4">
        <ReviewReminderCard />
      </div>

      {/* ──── Row 2: 최근 오답 + 주간 학습 (2열) ──── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* 최근 오답 */}
        <Card padding="base" className="rounded-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400" />
              <h2 className="text-sm font-bold text-text-primary">최근 오답</h2>
            </div>
            {uniqueWrongAnswers.length > 0 && (
              <Link href="/practice/revenge" className="text-primary text-xs font-medium hover:underline">
                복습하기
              </Link>
            )}
          </div>
          {uniqueWrongAnswers.length === 0 ? (
            <div className="text-center py-4">
              <CheckCircle className="w-7 h-7 text-emerald-300 mx-auto mb-1.5" />
              <p className="text-text-secondary text-xs">오답이 없습니다!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {uniqueWrongAnswers.map((ans) => {
                const q = wrongQMap.get(ans.questionId);
                if (!q) return null;
                const preview = q.content.replace(/\$[^$]*\$/g, '□').replace(/[#*]/g, '').slice(0, 40);
                const myAns = ans.selectedAnswer?.replace(/\$[^$]*\$/g, '').trim().slice(0, 8) || '?';
                const correctAns = q.answer?.replace(/\$[^$]*\$/g, '').trim().slice(0, 8) || '-';
                return (
                  <div key={ans.id} className="flex items-center gap-2 p-2.5 rounded-sm bg-red-50/50 border border-red-100">
                    <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-text-primary truncate">{preview}</p>
                      <p className="text-xs text-text-secondary">{q.chapter}</p>
                    </div>
                    <div className="text-right shrink-0 text-xs leading-relaxed">
                      <p><span className="text-text-secondary">제출:</span> <span className="text-red-500 font-semibold">{myAns}</span></p>
                      <p><span className="text-text-secondary">정답:</span> <span className="text-emerald-600 font-bold">{correctAns}</span></p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* 주간 학습 차트 */}
        <Card padding="base" className="rounded-sm flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-text-primary">주간 학습량</h2>
          </div>
          <div className="relative flex-1 min-h-[140px]">
            {/* SVG 꺾은선 그래프 오버레이 — 바 높이 공식과 동일하게 매칭 */}
            <svg className="absolute inset-0 w-full h-[calc(100%-24px)] pointer-events-none z-10 overflow-visible" viewBox="0 0 700 100" preserveAspectRatio="none">
              <polyline
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeOpacity="0.7"
                points={dailyActivity.map((day, i) => {
                  const x = (i + 0.5) * 100;
                  // 바 높이 공식과 동일: Math.max((count/max)*100, count > 0 ? 12 : 4)
                  const barPct = Math.max((day.count / maxDailyCount) * 100, day.count > 0 ? 12 : 4);
                  const y = 100 - barPct;
                  return `${x},${y}`;
                }).join(' ')}
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {/* 바 차트 */}
            <div className="flex items-end justify-between gap-2 h-full">
              {dailyActivity.map((day, i) => {
                const isToday = i === 6;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full">
                    <div className="w-full flex flex-col items-center justify-end flex-1">
                      {day.count > 0 && (
                        <span className="text-xs text-text-secondary font-medium mb-1 relative z-20 bg-white px-1 rounded">{day.count}</span>
                      )}
                      <div
                        className={`w-full max-w-[28px] rounded-t-lg transition-all ${
                          isToday ? 'bg-primary/20' : day.count > 0 ? 'bg-primary/10' : 'bg-slate-50'
                        }`}
                        style={{ height: `${Math.max((day.count / maxDailyCount) * 100, day.count > 0 ? 12 : 4)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold ${isToday ? 'text-primary' : 'text-text-secondary'}`}>
                      {day.date}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

      </div>

      {/* ──── Row 3: 랭킹 (전체 너비) ──── */}
      <Card padding="md" className="rounded-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-text-primary">실시간 랭킹</h2>
          </div>
          <Link href="/ranking" className="text-primary text-xs font-bold hover:underline">
            전체 순위 보기
          </Link>
        </div>
        {topStudents.length === 0 ? (
          <p className="text-text-secondary text-xs text-center py-4">학습을 시작하면 랭킹에 표시됩니다.</p>
        ) : (
          <div className="flex flex-wrap justify-center gap-3 pb-1">
            {topStudents.map((s, i) => {
              const isMe = s.user.id === user.id;
              const medalColors = ['text-amber-500', 'text-slate-400', 'text-amber-700'];
              return (
                <div
                  key={s.id}
                  className={`flex-1 min-w-[140px] flex items-center gap-3 px-4 py-2.5 rounded-sm transition-all ${
                    isMe
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-slate-50 border border-slate-200'
                  }`}
                >
                  <span className={`text-lg font-extrabold ${isMe ? 'text-white' : (medalColors[i] ?? 'text-slate-400')}`}>
                    {i + 1}
                  </span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isMe ? 'bg-white/20 text-white' : 'bg-gradient-to-tr from-primary to-blue-400 text-white'
                  }`}>
                    {s.user.name?.[0] ?? '?'}
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${isMe ? 'text-white' : 'text-text-primary'}`}>
                      {s.user.name}{isMe && ' (나)'}
                    </p>
                    <p className={`text-xs ${isMe ? 'text-white/80' : 'text-text-secondary'}`}>
                      {s.totalXp.toLocaleString()} XP
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
