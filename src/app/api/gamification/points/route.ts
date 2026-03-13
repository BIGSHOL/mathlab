import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { xpToNextLevel } from '@/lib/utils/xp';

// GET /api/gamification/points
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }, { status: 401 });
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: currentUser.id },
    select: { totalXp: true, level: true, currentStreak: true, longestStreak: true },
  });

  if (!profile) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '프로필을 찾을 수 없습니다' } },
      { status: 404 }
    );
  }

  const nextLevel = xpToNextLevel(profile.totalXp);

  return NextResponse.json({
    data: {
      totalXp: profile.totalXp,
      level: profile.level,
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      xpToNextLevel: nextLevel.remaining,
    },
  });
}
