import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/** GET: 대시보드 주간 집계 데이터 */
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

  const now = new Date();

  // --- 1. 주간 오답률 추이 (최근 4주) — 8개 쿼리를 한번에 병렬 실행 ---
  const weekRanges = Array.from({ length: 4 }, (_, idx) => {
    const i = 3 - idx;
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - i * 7);
    return { weekStart, weekEnd };
  });

  const weekCounts = await Promise.all(
    weekRanges.flatMap(({ weekStart, weekEnd }) => [
      prisma.answerLog.count({ where: { createdAt: { gte: weekStart, lt: weekEnd } } }),
      prisma.answerLog.count({ where: { createdAt: { gte: weekStart, lt: weekEnd }, isCorrect: false } }),
    ])
  );

  const weeklyWrongRate = weekRanges.map(({ weekStart }, idx) => {
    const total = weekCounts[idx * 2];
    const wrong = weekCounts[idx * 2 + 1];
    return {
      week: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
      total,
      wrong,
      rate: total > 0 ? Math.round((wrong / total) * 100) : 0,
    };
  });

  // --- 2. 단원별 성취도 (최근 30일, 상위 8개 단원) ---
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentAnswers = await prisma.answerLog.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: { questionId: true, isCorrect: true },
  });

  // questionId → chapter 매핑
  const questionIds = [...new Set(recentAnswers.map((a) => a.questionId))];
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, chapter: true },
  });
  const questionChapterMap = new Map(questions.map((q) => [q.id, q.chapter]));

  const chapterStats: Record<string, { total: number; correct: number }> = {};
  for (const ans of recentAnswers) {
    const chapter = questionChapterMap.get(ans.questionId);
    if (!chapter) continue;
    if (!chapterStats[chapter]) chapterStats[chapter] = { total: 0, correct: 0 };
    chapterStats[chapter].total++;
    if (ans.isCorrect) chapterStats[chapter].correct++;
  }

  const chapterAchievement = Object.entries(chapterStats)
    .map(([chapter, stat]) => ({
      chapter,
      total: stat.total,
      correct: stat.correct,
      rate: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  // --- 3. 배정 현황 집계 ---
  const [assignedCount, completedCount, overdueCount, inProgressCount] = await Promise.all([
    prisma.testAssignment.count({ where: { status: 'ASSIGNED' } }),
    prisma.testAssignment.count({ where: { status: 'COMPLETED' } }),
    prisma.testAssignment.count({ where: { status: 'OVERDUE' } }),
    prisma.testAssignment.count({ where: { status: 'IN_PROGRESS' } }),
  ]);

  const totalAssignments = assignedCount + completedCount + overdueCount + inProgressCount;
  const completionRate = totalAssignments > 0
    ? Math.round((completedCount / totalAssignments) * 100)
    : 0;

  // --- 4. 이번 주 핵심 지표 ---
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  const [weekAnswerTotal, weekAnswerWrong, weekAttemptsCompleted] = await Promise.all([
    prisma.answerLog.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.answerLog.count({ where: { createdAt: { gte: weekStart }, isCorrect: false } }),
    prisma.testAttempt.count({ where: { completedAt: { gte: weekStart } } }),
  ]);

  return NextResponse.json({
    data: {
      weeklyWrongRate,
      chapterAchievement,
      assignmentStats: {
        assigned: assignedCount,
        completed: completedCount,
        overdue: overdueCount,
        inProgress: inProgressCount,
        total: totalAssignments,
        completionRate,
      },
      weekSummary: {
        totalAnswers: weekAnswerTotal,
        wrongAnswers: weekAnswerWrong,
        wrongRate: weekAnswerTotal > 0 ? Math.round((weekAnswerWrong / weekAnswerTotal) * 100) : 0,
        completedAttempts: weekAttemptsCompleted,
      },
    },
  });
}
