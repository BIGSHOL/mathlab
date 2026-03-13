import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { calculateLevel } from '@/lib/utils/xp';

/** POST: 연산 연습 완료 → XP 부여 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
      { status: 401 }
    );
  }

  const { attemptId } = await params;

  const attempt = await prisma.arithmeticAttempt.findUnique({
    where: { id: attemptId },
    include: { answers: { select: { pointsEarned: true } } },
  });

  if (!attempt || attempt.studentId !== currentUser.id) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '연습 세션을 찾을 수 없습니다' } },
      { status: 404 }
    );
  }

  if (attempt.completedAt) {
    return NextResponse.json(
      { error: { code: 'ALREADY_COMPLETED', message: '이미 완료된 연습입니다' } },
      { status: 400 }
    );
  }

  const totalPoints = attempt.answers.reduce((sum, a) => sum + a.pointsEarned, 0);
  const xpEarned = Math.max(1, Math.floor(totalPoints / 2));

  let leveledUp = false;

  await prisma.$transaction(async (tx) => {
    await tx.arithmeticAttempt.update({
      where: { id: attemptId },
      data: {
        completedAt: new Date(),
        score: totalPoints,
        xpEarned,
      },
    });

    const profile = await tx.studentProfile.findUnique({
      where: { userId: currentUser!.id },
      select: { totalXp: true, level: true },
    });

    if (profile) {
      const newTotalXp = profile.totalXp + xpEarned;
      const newLevel = calculateLevel(newTotalXp);
      leveledUp = newLevel > profile.level;

      await tx.studentProfile.update({
        where: { userId: currentUser!.id },
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
          userId: currentUser!.id,
          amount: xpEarned,
          type: 'EARN',
          reason: '연산 연습 완료',
          referenceId: attemptId,
        },
      });
    }
  });

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
