import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isResponse, notFound, badRequest, serverError, clamp } from '@/lib/api';
import { prisma } from '@/lib/db';
import { getComboMultiplier } from '@/lib/services/grading';
import { POINTS_BY_LEVEL } from '@/lib/services/ox-generator';
import type { OxLevel } from '@/lib/services/ox-generator';
import { z } from 'zod';

const answerBodySchema = z.object({
  problemIndex: z.number().int().min(0).optional(),
  statementId: z.string().nullable().optional(),
  content: z.string().optional(),
  selectedAnswer: z.string(),
  correctAnswer: z.string(),
  isCorrect: z.boolean(),
  timeSpentSeconds: z.number().int().min(0).max(3600).optional(),
});

/** POST: O/X 답변 1건 제출 (콤보·점수 계산, OxQuizAnswer insert) */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const { attemptId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('JSON 파싱에 실패했습니다');
  }

  const parsed = answerBodySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('입력값이 올바르지 않습니다', parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    })));
  }

  const {
    problemIndex,
    statementId,
    content,
    selectedAnswer,
    correctAnswer,
    isCorrect,
    timeSpentSeconds,
  } = parsed.data;

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
  const safeSelected = selectedAnswer.toUpperCase();
  const safeCorrect = correctAnswer.toUpperCase();
  if (safeSelected !== 'O' && safeSelected !== 'X') {
    return badRequest('답은 O 또는 X여야 합니다');
  }
  if (safeCorrect !== 'O' && safeCorrect !== 'X') {
    return badRequest('정답은 O 또는 X여야 합니다');
  }

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
  const newCombo = isCorrect ? streak + 1 : 0;

  // 점수: 난이도별 기본 점수 × 콤보 멀티플라이어
  const basePoints = POINTS_BY_LEVEL[attempt.level as OxLevel] ?? 10;
  const pointsEarned = isCorrect
    ? Math.round(basePoints * getComboMultiplier(newCombo))
    : 0;

  const safeTime = clamp(timeSpentSeconds ?? 0, 0, 3600);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.oxQuizAnswer.create({
        data: {
          attemptId,
          problemIndex: problemIndex ?? 0,
          statementId: statementId ?? null,
          content: content ?? '',
          correctAnswer: safeCorrect,
          selectedAnswer: safeSelected,
          isCorrect,
          timeSpentSeconds: safeTime,
          comboCount: newCombo,
          pointsEarned,
        },
      });

      await tx.oxQuizAttempt.update({
        where: { id: attemptId },
        data: {
          score: { increment: pointsEarned },
          correctCount: isCorrect ? { increment: 1 } : undefined,
          comboMax: newCombo > attempt.comboMax ? newCombo : undefined,
          totalTimeSeconds: { increment: safeTime },
        },
      });
    });
  } catch (e) {
    console.error('[ox-quiz answer POST]', e);
    return serverError('답안 저장에 실패했습니다');
  }

  return NextResponse.json({
    data: { pointsEarned, comboCount: newCombo },
  });
}
