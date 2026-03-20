import { NextRequest, NextResponse } from 'next/server';
import { requireAuthViewAs, isResponse } from '@/lib/api';
import { prisma } from '@/lib/db';
import { checkAndAwardBadges } from '@/lib/services/badge-checker';

/** POST /api/badges/check — 배지 조건 일괄 체크 → 신규 배지 반환 */
export async function POST(request: NextRequest) {
  const user = await requireAuthViewAs(request);
  if (isResponse(user)) return user;
  const newBadgeIds = await checkAndAwardBadges(user.id);

  if (newBadgeIds.length === 0) {
    return NextResponse.json({ data: { newBadges: [] } });
  }

  const newBadges = await prisma.badge.findMany({
    where: { id: { in: newBadgeIds } },
  });

  return NextResponse.json({ data: { newBadges } });
}
