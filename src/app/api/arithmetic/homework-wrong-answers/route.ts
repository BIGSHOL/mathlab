import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, isResponse, badRequest } from '@/lib/api';
import { prisma } from '@/lib/db';
import { CATEGORY_LABELS } from '@/lib/services/arithmetic-generator';

/** GET: 연산 숙제 오답 조회 */
export async function GET(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');
  const period = searchParams.get('period') ?? 'all'; // 7d, 30d, 90d, all

  if (!studentId) {
    return badRequest('studentId가 필요합니다');
  }

  // 기간 필터 계산
  const completedAtFilter: { not: null; gte?: Date } = { not: null };
  if (period !== 'all') {
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);
    completedAtFilter.gte = since;
  }

  const attempts = await prisma.arithmeticAttempt.findMany({
    where: {
      studentId,
      homeworkPlanId: { not: null },
      completedAt: completedAtFilter,
    },
    select: {
      id: true,
      category: true,
      level: true,
      correctCount: true,
      problemCount: true,
      totalTimeSeconds: true,
      completedAt: true,
      homeworkDayIndex: true,
      homeworkPlan: {
        select: { id: true, title: true },
      },
      answers: {
        where: { isCorrect: false },
        orderBy: { problemIndex: 'asc' },
        select: {
          problemIndex: true,
          content: true,
          selectedAnswer: true,
          correctAnswer: true,
          timeSpentSeconds: true,
        },
      },
    },
    orderBy: { completedAt: 'desc' },
  });

  // 오답이 있는 시도만 필터
  const withWrongAnswers = attempts.filter((a) => a.answers.length > 0);

  // 카테고리별 오답 통계
  const categoryStats: Record<string, { total: number; wrong: number }> = {};
  for (const attempt of attempts) {
    const cat = attempt.category;
    if (!categoryStats[cat]) categoryStats[cat] = { total: 0, wrong: 0 };
    categoryStats[cat].total += attempt.problemCount;
    categoryStats[cat].wrong += attempt.answers.length;
  }

  const categorySummary = Object.entries(categoryStats)
    .map(([category, stats]) => ({
      category,
      categoryLabel: CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] ?? category,
      totalProblems: stats.total,
      wrongCount: stats.wrong,
      accuracy: stats.total > 0 ? Math.round(((stats.total - stats.wrong) / stats.total) * 100) : 100,
    }))
    .sort((a, b) => b.wrongCount - a.wrongCount);

  return NextResponse.json({
    data: {
      totalWrong: withWrongAnswers.reduce((sum, a) => sum + a.answers.length, 0),
      categorySummary,
      attempts: withWrongAnswers.map((a) => ({
        id: a.id,
        category: a.category,
        categoryLabel: CATEGORY_LABELS[a.category as keyof typeof CATEGORY_LABELS] ?? a.category,
        level: a.level,
        correctCount: a.correctCount,
        problemCount: a.problemCount,
        totalTimeSeconds: a.totalTimeSeconds,
        completedAt: a.completedAt,
        homeworkDayIndex: a.homeworkDayIndex,
        planTitle: a.homeworkPlan?.title ?? '',
        wrongAnswers: a.answers,
      })),
    },
  });
}
