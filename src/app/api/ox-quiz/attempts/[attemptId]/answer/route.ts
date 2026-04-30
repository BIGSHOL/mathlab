import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isResponse, notFound, badRequest, clamp } from '@/lib/api';
import { prisma } from '@/lib/db';
import { getComboMultiplier } from '@/lib/services/grading';
import { POINTS_BY_LEVEL } from '@/lib/services/ox-generator';
import type { OxLevel } from '@/lib/services/ox-generator';

/** POST: O/X 답변 1건 제출 (콤보·점수 계산, OxQuizAnswer insert) */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const { attemptId } = await params;
  const body = await request.json();
  const {
    problemIndex,
    statementId,
    content,
    selectedAnswer,
    correctAnswer,
    isCorrect,
    timeSpentSeconds,
  } = body;

  const attempt = await prisma.oxQuizAttempt.findUnique({
    where: { id: attemptId },
  });

  if (!attempt || attempt.studentId !== user.id) {
    return notFound('OX 응시 세션을 찾을 수 없습니다');
  }
  if (attempt.completedAt) {
    return badRequest('이미 완료된 응시입니다');
  }

  // O/X 답안 검증
  const safeSelected = String(selectedAnswer || '').toUpperCase();
  const safeCorrect = String(correctAnswer || '').toUpperCase();
  if (safeSelected !== 'O' && safeSelected !== 'X') {
    return badRequest('답은 O 또는 X여야 합니다');
  }
  if (safeCorrect !== 'O' && safeCorrect !== 'X') {
    return badRequest('정답은 O 또는 X여야 합니다');
  }

  const correctness = Boolean(isCorrect);

  // 콤보 계산 (이전 답안 중 가장 최근부터 연속 정답 수)
  const prevAnswers = await prisma.oxQuizAnswer.findMany({
    where: { attemptId },
    orderBy: { createdAt: 'desc' },
  });
  let streak = 0;
  for (const a of prevAnswers) {
    if (a.isCorrect) streak++;
    else break;
  }
  const newCombo = correctness ? streak + 1 : 0;

  // 점수: 난이도별 기본 점수 × 콤보 멀티플라이어
  const basePoints = POINTS_BY_LEVEL[attempt.level as OxLevel] ?? 10;
  const pointsEarned = correctness
    ? Math.round(basePoints * getComboMultiplier(newCombo))
    : 0;

  await prisma.$transaction(async (tx) => {
    await tx.oxQuizAnswer.create({
      data: {
        attemptId,
        problemIndex: Number(problemIndex) || 0,
        statementId: typeof statementId === 'string' ? statementId : null,
        content: String(content || ''),
        correctAnswer: safeCorrect,
        selectedAnswer: safeSelected,
        isCorrect: correctness,
        timeSpentSeconds: clamp(Math.round(Number(timeSpentSeconds) || 0), 0, 3600),
        comboCount: newCombo,
        pointsEarned,
      },
    });

    const safeTime = clamp(Math.round(Number(timeSpentSeconds) || 0), 0, 3600);
    await tx.oxQuizAttempt.update({
      where: { id: attemptId },
      data: {
        score: { increment: pointsEarned },
        correctCount: correctness ? { increment: 1 } : undefined,
        comboMax: newCombo > attempt.comboMax ? newCombo : undefined,
        totalTimeSeconds: { increment: safeTime },
      },
    });
  });

  return NextResponse.json({
    data: { pointsEarned, comboCount: newCombo },
  });
}
