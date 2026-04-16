import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuthViewAs, isResponse, notFound } from '@/lib/api';
import { xpToNextLevel } from '@/lib/utils/xp';

// GET /api/gamification/points
export async function GET(request: NextRequest) {
  const user = await requireAuthViewAs(request);
  if (isResponse(user)) return user;

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    select: {
      totalXp: true,
      level: true,
      currentStreak: true,
      longestStreak: true,
      streakFreezeCount: true,
      lastActiveAt: true,
    },
  });

  if (!profile) {
    return notFound('프로필을 찾을 수 없습니다');
  }

  const nextLevel = xpToNextLevel(profile.totalXp);

  const hoursSinceLastActive = profile.lastActiveAt
    ? Math.floor((Date.now() - profile.lastActiveAt.getTime()) / 3600000)
    : 999;

  return NextResponse.json({
    data: {
      totalXp: profile.totalXp,
      level: profile.level,
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      streakFreezeCount: profile.streakFreezeCount,
      hoursSinceLastActive,
      xpToNextLevel: nextLevel.remaining,
    },
  });
}
