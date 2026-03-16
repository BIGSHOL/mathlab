import { NextResponse } from 'next/server';
import { requireAuth, isResponse } from '@/lib/api';
import { prisma } from '@/lib/db';
import { seedBadges } from '@/lib/services/badge-checker';

/** GET /api/badges — 전체 배지 + 사용자 획득 여부 */
export async function GET() {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  await seedBadges();

  const badges = await prisma.badge.findMany({ orderBy: { sortOrder: 'asc' } });
  const userBadges = await prisma.userBadge.findMany({
    where: { userId: user.id },
    select: { badgeId: true, earnedAt: true },
  });

  const earnedMap = new Map(userBadges.map((ub) => [ub.badgeId, ub.earnedAt]));

  const data = badges.map((b) => ({
    ...b,
    earned: earnedMap.has(b.id),
    earnedAt: earnedMap.get(b.id) ?? null,
  }));

  return NextResponse.json({ data });
}
