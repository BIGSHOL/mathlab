import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOwner, isResponse, badRequest, notFound } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** 기간 범위 계산 */
function getDateRange(type: string): { start: Date; end: Date; label: string } {
  const now = new Date();
  if (type === 'DAILY') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { start, end: now, label: `${start.toLocaleDateString('ko-KR')}` };
  }
  if (type === 'WEEKLY') {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return {
      start,
      end: now,
      label: `${start.toLocaleDateString('ko-KR')} ~ ${now.toLocaleDateString('ko-KR')}`,
    };
  }
  // MONTHLY
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return {
    start,
    end: end > now ? now : end,
    label: `${now.getFullYear()}년 ${now.getMonth() + 1}월`,
  };
}

const STAGE_LABEL: Record<string, string> = {
  READING: '개념학습',
  BLANK_EASY: '빈칸 1단계',
  BLANK_HARD: '빈칸 2단계',
  BLANK_FULL: '통문장 암기',
};

/** POST: 학생 종합 리포트 생성 */
export async function POST(request: NextRequest) {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const body = await request.json();
  const { studentId, type, send } = body;

  if (!studentId || !type) {
    return badRequest('studentId와 type이 필요합니다');
  }

  if (!['DAILY', 'WEEKLY', 'MONTHLY'].includes(type)) {
    return badRequest('type은 DAILY, WEEKLY, MONTHLY 중 하나여야 합니다');
  }

  // 학생 정보
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    include: { profile: { select: { level: true, totalXp: true } } },
  });
  if (!student) {
    return notFound('학생을 찾을 수 없습니다');
  }

  const { start, end, label } = getDateRange(type);

  // ──── 1. 시험 데이터 ────
  const testAttempts = await prisma.testAttempt.findMany({
    where: {
      studentId,
      completedAt: { gte: start, lte: end },
    },
    include: { test: { select: { title: true } } },
    orderBy: { completedAt: 'desc' },
    take: 10,
  });

  const answerLogs = await prisma.answerLog.findMany({
    where: {
      attempt: { studentId, completedAt: { gte: start, lte: end } },
    },
    select: { isCorrect: true, questionId: true },
  });

  const totalAnswers = answerLogs.length;
  const correctAnswers = answerLogs.filter((a) => a.isCorrect).length;
  const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

  // 단원별 성취
  const questionIds = [...new Set(answerLogs.map((a) => a.questionId))];
  const questions = questionIds.length > 0
    ? await prisma.question.findMany({
        where: { id: { in: questionIds } },
        select: { id: true, chapter: true },
      })
    : [];
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  const chapterStats: Record<string, { total: number; correct: number }> = {};
  for (const log of answerLogs) {
    const q = questionMap.get(log.questionId);
    if (!q?.chapter) continue;
    if (!chapterStats[q.chapter]) chapterStats[q.chapter] = { total: 0, correct: 0 };
    chapterStats[q.chapter].total++;
    if (log.isCorrect) chapterStats[q.chapter].correct++;
  }

  const chapterAchievement = Object.entries(chapterStats)
    .map(([chapter, s]) => ({
      chapter,
      accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      total: s.total,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const strengths = chapterAchievement
    .filter((c) => c.accuracy >= 80)
    .map((c) => c.chapter);
  const weaknesses = chapterAchievement
    .filter((c) => c.accuracy < 60)
    .map((c) => c.chapter);

  // ──── 2. 연산 데이터 ────
  const arithmeticAttempts = await prisma.arithmeticAttempt.findMany({
    where: { studentId, createdAt: { gte: start, lte: end } },
    select: { category: true, correctCount: true, problemCount: true },
  });

  const arithmeticTotal = arithmeticAttempts.reduce((s, a) => s + a.problemCount, 0);
  const arithmeticCorrect = arithmeticAttempts.reduce((s, a) => s + a.correctCount, 0);
  const arithmeticAccuracy = arithmeticTotal > 0
    ? Math.round((arithmeticCorrect / arithmeticTotal) * 100)
    : 0;

  const catStats: Record<string, { total: number; correct: number }> = {};
  for (const a of arithmeticAttempts) {
    if (!catStats[a.category]) catStats[a.category] = { total: 0, correct: 0 };
    catStats[a.category].total += a.problemCount;
    catStats[a.category].correct += a.correctCount;
  }
  const arithmeticSummary = Object.entries(catStats)
    .map(([category, s]) => ({
      category,
      accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      count: s.total,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ──── 3. 개념 학습 ────
  const learningRecords = await prisma.learningProgress.findMany({
    where: {
      userId: studentId,
      startedAt: { gte: start, lte: end },
    },
    include: { concept: { select: { title: true } } },
    orderBy: { startedAt: 'desc' },
    take: 10,
  });

  const conceptsStudied = new Set(learningRecords.map((r) => r.conceptId)).size;
  const conceptsCompleted = learningRecords.filter(
    (r) => r.stage === 'BLANK_FULL' && r.completed
  ).length;

  const learningProgress = learningRecords.map((r) => ({
    conceptTitle: r.concept.title,
    stage: STAGE_LABEL[r.stage] ?? r.stage,
    completed: r.completed,
  }));

  // ──── 4. 학습 과정(배정) ────
  let courseProgress = null;
  try {
    const activeEnrollment = await prisma.learningCourseEnrollment.findFirst({
      where: { studentId, status: 'ACTIVE' },
      include: {
        course: {
          include: {
            concepts: true,
          },
        },
      },
    });

    if (activeEnrollment) {
      const courseConceptIds = activeEnrollment.course.concepts.map((c) => c.conceptId);
      const completedInCourse = courseConceptIds.length > 0
        ? await prisma.learningProgress.count({
            where: {
              userId: studentId,
              conceptId: { in: courseConceptIds },
              stage: 'BLANK_FULL',
              completed: true,
            },
          })
        : 0;

      const completedCourses = await prisma.learningCourseEnrollment.count({
        where: { studentId, status: 'COMPLETED' },
      });
      const upcomingCourses = await prisma.learningCourseEnrollment.count({
        where: { studentId, status: 'LOCKED' },
      });

      courseProgress = {
        activeCourse: {
          title: activeEnrollment.course.title,
          completedConcepts: completedInCourse,
          totalConcepts: courseConceptIds.length,
          progressPercent:
            courseConceptIds.length > 0
              ? Math.round((completedInCourse / courseConceptIds.length) * 100)
              : 0,
        },
        completedCourses,
        upcomingCourses,
      };
    }
  } catch {
    // 배정 테이블이 없는 경우 무시
  }

  // ──── 5. XP 획득 ────
  const xpRecords = await prisma.pointTransaction.aggregate({
    where: {
      userId: studentId,
      type: 'EARN',
      createdAt: { gte: start, lte: end },
    },
    _sum: { amount: true },
  });
  const xpEarned = xpRecords._sum.amount ?? 0;

  // ──── 6. 활동일 (일별 카운트) ────
  const [testDays, arithmeticDays, learningDays] = await Promise.all([
    prisma.testAttempt.findMany({
      where: { studentId, completedAt: { gte: start, lte: end } },
      select: { completedAt: true },
    }),
    prisma.arithmeticAttempt.findMany({
      where: { studentId, createdAt: { gte: start, lte: end } },
      select: { createdAt: true },
    }),
    prisma.learningProgress.findMany({
      where: { userId: studentId, startedAt: { gte: start, lte: end } },
      select: { startedAt: true },
    }),
  ]);

  const dayMap: Record<string, number> = {};
  const toKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  for (const t of testDays) {
    if (t.completedAt) {
      const k = toKey(t.completedAt);
      dayMap[k] = (dayMap[k] ?? 0) + 1;
    }
  }
  for (const a of arithmeticDays) {
    const k = toKey(a.createdAt);
    dayMap[k] = (dayMap[k] ?? 0) + 1;
  }
  for (const l of learningDays) {
    const k = toKey(l.startedAt);
    dayMap[k] = (dayMap[k] ?? 0) + 1;
  }

  const activityDays = Object.entries(dayMap)
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const activeDayCount = activityDays.length;

  // ──── 결과 조합 ────
  const reportContent = {
    studentName: student.name,
    grade: student.grade,
    level: student.profile?.level ?? 1,
    totalXp: student.profile?.totalXp ?? 0,
    period: label,
    reportType: type,
    summary: {
      testsCompleted: testAttempts.length,
      totalAnswers,
      correctAnswers,
      accuracy,
      arithmeticSolved: arithmeticTotal,
      arithmeticAccuracy,
      conceptsStudied,
      conceptsCompleted,
      xpEarned,
      activeDays: activeDayCount,
    },
    courseProgress,
    recentTests: testAttempts.slice(0, 5).map((a) => ({
      title: a.test.title,
      score: a.score,
      maxScore: a.maxScore,
      accuracy: a.maxScore > 0 ? Math.round((a.score / a.maxScore) * 100) : 0,
      completedAt: a.completedAt?.toISOString() ?? null,
    })),
    chapterAchievement,
    strengths,
    weaknesses,
    arithmeticSummary,
    learningProgress,
    activityDays: type !== 'DAILY' ? activityDays : undefined,
    generatedAt: new Date().toISOString(),
  };

  // 리포트 이력 저장
  if (send) {
    await prisma.reportHistory.create({
      data: {
        studentId,
        type,
        content: reportContent,
        channel: 'EMAIL',
      },
    });
  }

  return NextResponse.json({ data: { content: reportContent } }, { status: 201 });
}
