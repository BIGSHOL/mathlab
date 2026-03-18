import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuthViewAs, isResponse, validateBody, notFound } from '@/lib/api';
import { awardPointsSchema } from '@/lib/schemas/gamification';
import { calculateLevel } from '@/lib/utils/xp';

export const dynamic = 'force-dynamic';

// POST /api/gamification/award
export async function POST(request: NextRequest) {
  const user = await requireAuthViewAs(request);
  if (isResponse(user)) return user;

  const parsed = await validateBody(request, awardPointsSchema);
  if (isResponse(parsed)) return parsed;

  const { userId, amount, reason, referenceId } = parsed;

  const profile = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!profile) {
    return notFound('학생 프로필을 찾을 수 없습니다');
  }

  const previousLevel = profile.level;

  // Create transaction and update profile (atomic)
  const updatedProfile = await prisma.$transaction(async (tx) => {
    await tx.pointTransaction.create({
      data: { userId, amount, type: 'EARN', reason, referenceId },
    });

    const txProfile = await tx.studentProfile.update({
      where: { userId },
      data: {
        totalXp: { increment: amount },
        lastActiveAt: new Date(),
      },
    });

    const newLevel = calculateLevel(txProfile.totalXp);
    if (newLevel !== txProfile.level) {
      return tx.studentProfile.update({
        where: { userId },
        data: { level: newLevel },
      });
    }

    return txProfile;
  });

  const newLevel = calculateLevel(updatedProfile.totalXp);

  return NextResponse.json({
    data: {
      totalXp: updatedProfile.totalXp,
      level: newLevel,
      leveledUp: newLevel > previousLevel,
      previousLevel,
    },
  });
}
