import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isResponse, notFound, badRequest } from '@/lib/api';
import { prisma } from '@/lib/db';
import { calculateLevel } from '@/lib/utils/xp';
import { checkAndAwardBadges } from '@/lib/services/badge-checker';

/** POST: O/X 응시 완료 → 점수 집계 + XP 부여 + PointTransaction */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const { attemptId } = await params;

  const attempt = await prisma.oxQuizAttempt.findUnique({
    where: { id: attemptId },
    include: { answers: { select: { pointsEarned: true } } },
  });

  if (!attempt || attempt.studentId !== user.id) {
    return notFound('OX 응시 세션을 찾을 수 없습니다');
  }
  if (attempt.completedAt) {
    return badRequest('이미 완료된 응시입니다');
  }

  const totalPoints = attempt.answers.reduce((sum, a) => sum + a.pointsEarned, 0);
  const xpEarned = Math.max(1, Math.floor(totalPoints / 2));

  let leveledUp = false;

  await prisma.$transaction(async (tx) => {
    await tx.oxQuizAttempt.update({
      where: { id: attemptId },
      data: {
        completedAt: new Date(),
        score: totalPoints,
        xpEarned,
      },
    });

    const profile = await tx.studentProfile.findUnique({
      where: { userId: user.id },
      select: { totalXp: true, level: true },
    });

    if (profile) {
      const newTotalXp = profile.totalXp + xpEarned;
      const newLevel = calculateLevel(newTotalXp);
      leveledUp = newLevel > profile.level;

      await tx.studentProfile.update({
        where: { userId: user.id },
        data: {
          totalXp: newTotalXp,
          level: newLevel,
          lastActiveAt: new Date(),
        },
      });
    }

    if (xpEarned > 0) {
      await tx.pointTransaction.create({
        data: {
          userId: user.id,
          amount: xpEarned,
          type: 'EARN',
          reason: 'O/X 퀴즈 완료',
          referenceId: attemptId,
        },
      });
    }
  });

  // 배지 체크 (fire-and-forget)
  checkAndAwardBadges(user.id).catch((e) => console.error('[badge-check-ox]', e));

  return NextResponse.json({
    data: {
      score: totalPoints,
      correctCount: attempt.correctCount,
      problemCount: attempt.problemCount,
      xpEarned,
      comboMax: attempt.comboMax,
      totalTimeSeconds: attempt.totalTimeSeconds,
      leveledUp,
    },
  });
}
