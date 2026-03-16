import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isResponse, badRequest } from '@/lib/api';
import { prisma } from '@/lib/db';
import { awardXp } from '@/lib/utils/xp';

/** POST /api/learning/revenge-complete — 복수전 완료 처리 */
export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const body = await request.json();
  const { answers, chapter } = body;
  // answers: [{questionId, selectedAnswer, isCorrect}]

  if (!Array.isArray(answers) || answers.length === 0) {
    return badRequest('답안이 필요합니다');
  }

  const correctCount = answers.filter((a: { isCorrect: boolean }) => a.isCorrect).length;
  const totalCount = answers.length;
  const accuracy = Math.round((correctCount / totalCount) * 100);

  // XP: 정답 1개당 3XP (복수전 보너스)
  const xp = correctCount * 3;
  let leveledUp = false;

  if (xp > 0) {
    const before = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { level: true },
    });

    await prisma.$transaction(async (tx) => {
      await awardXp(tx, user.id, xp, 'REVENGE', chapter);
    });

    const after = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { level: true },
    });
    if (before && after && after.level > before.level) leveledUp = true;
  }

  return NextResponse.json({
    data: {
      correctCount,
      totalCount,
      accuracy,
      xpEarned: xp,
      leveledUp,
    },
  });
}
