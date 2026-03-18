import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuthViewAs, isResponse } from '@/lib/api';
import { isFeatureEnabled } from '@/lib/utils/features';

/** GET /api/daily-question/today — 오늘의 한 문제 + 통계 */
export async function GET(request: NextRequest) {
  const user = await requireAuthViewAs(request);
  if (isResponse(user)) return user;

  if (!(await isFeatureEnabled('daily_question'))) {
    return NextResponse.json({ data: null });
  }

  // KST 오늘 날짜
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const todayStr = kst.toISOString().slice(0, 10);
  const todayDate = new Date(todayStr + 'T00:00:00.000Z');

  // 오늘의 문제 찾기 (없으면 자동 선정)
  let daily = await prisma.dailyQuestion.findUnique({
    where: { date: todayDate },
    include: {
      question: {
        select: { id: true, content: true, choices: true, answer: true, explanation: true, difficulty: true },
      },
      attempts: { select: { isCorrect: true } },
    },
  });

  if (!daily) {
    // 최근 30일간 사용되지 않은 객관식 문제 중 랜덤 선택
    const recentIds = await prisma.dailyQuestion.findMany({
      where: { date: { gte: new Date(Date.now() - 30 * 86400000) } },
      select: { questionId: true },
    });
    const excludeIds = recentIds.map((r) => r.questionId);

    // 학생 학년에 맞는 bookCode 필터
    // 초등: E3-1, E4-2 등 / 중등: 1-1, 2-2 등
    const gradeFilter: Record<string, unknown> = {};
    if (user.grade) {
      if (user.grade <= 6) {
        gradeFilter.bookCode = { startsWith: `E${user.grade}-` };
      } else if (user.grade <= 9) {
        gradeFilter.bookCode = { startsWith: `${user.grade - 6}-` };
      }
    }

    const candidates = await prisma.question.findMany({
      where: {
        type: 'MULTIPLE_CHOICE',
        ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
        ...gradeFilter,
      },
      select: { id: true },
      take: 50,
    });

    if (candidates.length === 0) {
      return NextResponse.json({ data: null });
    }

    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    daily = await prisma.dailyQuestion.create({
      data: { questionId: picked.id, date: todayDate },
      include: {
        question: {
          select: { id: true, content: true, choices: true, answer: true, explanation: true, difficulty: true },
        },
        attempts: { select: { isCorrect: true } },
      },
    });
  }

  // 사용자 이미 풀었는지
  const myAttempt = await prisma.dailyQuestionAttempt.findUnique({
    where: { dailyQuestionId_studentId: { dailyQuestionId: daily.id, studentId: user.id } },
  });

  const totalAttempts = daily.attempts.length;
  const correctCount = daily.attempts.filter((a) => a.isCorrect).length;

  return NextResponse.json({
    data: {
      id: daily.id,
      date: todayStr,
      question: daily.question,
      stats: {
        totalAttempts,
        correctCount,
        correctRate: totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0,
      },
      myAttempt: myAttempt
        ? { selectedAnswer: myAttempt.selectedAnswer, isCorrect: myAttempt.isCorrect }
        : null,
    },
  });
}
