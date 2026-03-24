import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { isResponse } from '@/lib/api/helpers';
import { badRequest, forbidden, notFound } from '@/lib/api/errors';
import { prisma } from '@/lib/db';

/** GET /api/me/representative-badge — 현재 대표 배지 조회 */
export async function GET() {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    select: {
      representativeBadgeId: true,
      representativeBadge: { select: { id: true, icon: true, label: true } },
    },
  });

  if (!profile?.representativeBadge) {
    return NextResponse.json({ data: null });
  }

  return NextResponse.json({
    data: {
      badgeId: profile.representativeBadge.id,
      badgeIcon: profile.representativeBadge.icon,
      badgeLabel: profile.representativeBadge.label,
    },
  });
}

/** PUT /api/me/representative-badge — 대표 배지 설정 */
export async function PUT(request: Request) {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  if (user.role !== 'STUDENT') {
    return forbidden('학생만 대표 배지를 설정할 수 있습니다');
  }

  let body: { badgeId?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest('요청 본문이 올바르지 않습니다');
  }

  const { badgeId } = body;
  if (!badgeId || typeof badgeId !== 'string') {
    return badRequest('badgeId가 필요합니다');
  }

  // 해당 배지를 실제 획득했는지 확인
  const userBadge = await prisma.userBadge.findUnique({
    where: { userId_badgeId: { userId: user.id, badgeId } },
  });

  if (!userBadge) {
    return notFound('획득하지 않은 배지는 대표 배지로 설정할 수 없습니다');
  }

  await prisma.studentProfile.upsert({
    where: { userId: user.id },
    update: { representativeBadgeId: badgeId },
    create: { userId: user.id, representativeBadgeId: badgeId },
  });

  const badge = await prisma.badge.findUnique({
    where: { id: badgeId },
    select: { id: true, icon: true, label: true },
  });

  return NextResponse.json({
    data: {
      badgeId: badge!.id,
      badgeIcon: badge!.icon,
      badgeLabel: badge!.label,
    },
  });
}

/** DELETE /api/me/representative-badge — 대표 배지 해제 */
export async function DELETE() {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  if (user.role !== 'STUDENT') {
    return forbidden('학생만 대표 배지를 관리할 수 있습니다');
  }

  await prisma.studentProfile.updateMany({
    where: { userId: user.id },
    data: { representativeBadgeId: null },
  });

  return NextResponse.json({ data: null });
}
