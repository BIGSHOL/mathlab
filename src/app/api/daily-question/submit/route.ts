import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuthViewAs, isResponse, badRequest } from '@/lib/api';
import { isFeatureEnabled } from '@/lib/utils/features';
import { awardXp } from '@/lib/utils/xp';

/** POST /api/daily-question/submit — 답안 제출 */
export async function POST(request: NextRequest) {
  const user = await requireAuthViewAs(request);
  if (isResponse(user)) return user;

  if (!(await isFeatureEnabled('daily_question'))) {
    return badRequest('비활성화된 기능입니다');
  }

  const body = await request.json();
  const { dailyQuestionId, selectedAnswer } = body;
  if (!dailyQuestionId || !selectedAnswer) return badRequest('필수 파라미터 누락');

  // 이미 답했는지 확인
  const existing = await prisma.dailyQuestionAttempt.findUnique({
    where: { dailyQuestionId_studentId: { dailyQuestionId, studentId: user.id } },
  });
  if (existing) return badRequest('이미 답변하셨습니다');

  // 정답 확인
  const daily = await prisma.dailyQuestion.findUnique({
    where: { id: dailyQuestionId },
    include: { question: { select: { answer: true } } },
  });
  if (!daily) return badRequest('오늘의 문제를 찾을 수 없습니다');

  const isCorrect = selectedAnswer === daily.question.answer;

  // 저장 + XP 부여 (참여만으로 5 XP)
  await prisma.$transaction(async (tx) => {
    await tx.dailyQuestionAttempt.create({
      data: { dailyQuestionId, studentId: user.id, selectedAnswer, isCorrect },
    });

    await awardXp(tx, user.id, 5, 'DAILY_QUESTION', dailyQuestionId);
  });

  // 업데이트된 통계
  const attempts = await prisma.dailyQuestionAttempt.findMany({
    where: { dailyQuestionId },
    select: { isCorrect: true },
  });

  const totalAttempts = attempts.length;
  const correctCount = attempts.filter((a) => a.isCorrect).length;

  return NextResponse.json({
    data: {
      isCorrect,
      xpEarned: 5,
      stats: {
        totalAttempts,
        correctCount,
        correctRate: totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0,
      },
    },
  });
}
