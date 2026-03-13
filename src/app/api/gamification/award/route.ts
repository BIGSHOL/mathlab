import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { awardPointsSchema } from '@/lib/schemas/gamification';
import { calculateLevel } from '@/lib/utils/xp';

export const dynamic = 'force-dynamic';

// POST /api/gamification/award
export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
      { status: 401 }
    );
  }

  const body = await request.json();
  const parsed = awardPointsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '입력값이 올바르지 않습니다' } },
      { status: 400 }
    );
  }

  const { userId, amount, reason, referenceId } = parsed.data;

  const profile = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!profile) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '학생 프로필을 찾을 수 없습니다' } },
      { status: 404 }
    );
  }

  const previousLevel = profile.level;

  // Create transaction and update profile (atomic)
  const updatedProfile = await prisma.$transaction(async (tx) => {
    await tx.pointTransaction.create({
      data: { userId, amount, type: 'EARN', reason, referenceId },
    });

    const profile = await tx.studentProfile.update({
      where: { userId },
      data: {
        totalXp: { increment: amount },
        lastActiveAt: new Date(),
      },
    });

    const newLevel = calculateLevel(profile.totalXp);
    if (newLevel !== profile.level) {
      return tx.studentProfile.update({
        where: { userId },
        data: { level: newLevel },
      });
    }

    return profile;
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
