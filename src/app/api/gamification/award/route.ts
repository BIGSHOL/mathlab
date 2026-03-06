import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { awardPointsSchema } from '@/lib/schemas/gamification';
import { calculateLevel } from '@/lib/utils/xp';

// POST /api/gamification/award (internal use)
export async function POST(request: NextRequest) {
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

  // Create transaction and update profile
  await prisma.pointTransaction.create({
    data: { userId, amount, type: 'EARN', reason, referenceId },
  });

  const updatedProfile = await prisma.studentProfile.update({
    where: { userId },
    data: {
      totalXp: { increment: amount },
      lastActiveAt: new Date(),
    },
  });

  const newLevel = calculateLevel(updatedProfile.totalXp);
  if (newLevel !== updatedProfile.level) {
    await prisma.studentProfile.update({
      where: { userId },
      data: { level: newLevel },
    });
  }

  return NextResponse.json({
    data: {
      totalXp: updatedProfile.totalXp,
      level: newLevel,
      leveledUp: newLevel > previousLevel,
      previousLevel,
    },
  });
}
