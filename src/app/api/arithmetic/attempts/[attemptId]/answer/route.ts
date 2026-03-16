import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isResponse, notFound, badRequest } from '@/lib/api';
import { prisma } from '@/lib/db';
import { getComboMultiplier } from '@/lib/services/grading';

const LEVEL_POINTS: Record<string, number> = {
  easy: 10,
  medium: 20,
  hard: 30,
};

/** POST: 연산 연습 답변 제출 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const { attemptId } = await params;
  const body = await request.json();
  const { problemIndex, content, choices, selectedAnswer, correctAnswer, isCorrect, timeSpentSeconds } = body;

  const attempt = await prisma.arithmeticAttempt.findUnique({
    where: { id: attemptId },
  });

  if (!attempt || attempt.studentId !== user.id) {
    return notFound('연습 세션을 찾을 수 없습니다');
  }

  if (attempt.completedAt) {
    return badRequest('이미 완료된 연습입니다');
  }

  // 콤보 계산
  const prevAnswers = await prisma.arithmeticAnswer.findMany({
    where: { attemptId },
    orderBy: { createdAt: 'desc' },
  });
  let streak = 0;
  for (const a of prevAnswers) {
    if (a.isCorrect) streak++;
    else break;
  }
  const newCombo = isCorrect ? streak + 1 : 0;

  // 배점
  const basePoints = LEVEL_POINTS[attempt.level] ?? 10;
  const pointsEarned = isCorrect ? Math.round(basePoints * getComboMultiplier(newCombo)) : 0;

  await prisma.$transaction(async (tx) => {
    await tx.arithmeticAnswer.create({
      data: {
        attemptId,
        problemIndex,
        content: content || '',
        choices: choices || [],
        selectedAnswer: String(selectedAnswer),
        correctAnswer: String(correctAnswer),
        isCorrect,
        timeSpentSeconds: Math.max(0, Math.min(Math.round(Number(timeSpentSeconds) || 0), 3600)),
        comboCount: newCombo,
        pointsEarned,
      },
    });

    const safeTime = Math.max(0, Math.min(Math.round(Number(timeSpentSeconds) || 0), 3600));
    await tx.arithmeticAttempt.update({
      where: { id: attemptId },
      data: {
        score: { increment: pointsEarned },
        correctCount: isCorrect ? { increment: 1 } : undefined,
        comboMax: newCombo > attempt.comboMax ? newCombo : undefined,
        totalTimeSeconds: { increment: safeTime },
      },
    });
  });

  return NextResponse.json({
    data: { pointsEarned, comboCount: newCombo },
  });
}
