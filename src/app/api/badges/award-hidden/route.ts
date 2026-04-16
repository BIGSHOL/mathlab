import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, isResponse, badRequest } from '@/lib/api';

/**
 * 클라이언트 트리거로 수여되는 히든 뱃지.
 * 현재 지원: hidden_error (시스템 에러 발견)
 */
const ALLOWED_KEYS: Record<string, string> = {
  hidden_error: 'hidden_error',
};

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const body = await request.json().catch(() => ({}));
  const key = typeof body.key === 'string' ? body.key : null;

  if (!key || !ALLOWED_KEYS[key]) {
    return badRequest('유효하지 않은 뱃지 키');
  }

  // condition.type === key 인 뱃지 조회
  const badges = await prisma.badge.findMany();
  const target = badges.find((b) => {
    const cond = b.condition as { type?: string };
    return cond.type === key;
  });

  if (!target) {
    return NextResponse.json({ data: { awarded: false, reason: 'no-badge' } });
  }

  // 이미 보유 중이면 no-op
  const existing = await prisma.userBadge.findFirst({
    where: { userId: user.id, badgeId: target.id },
  });
  if (existing) {
    return NextResponse.json({ data: { awarded: false, reason: 'already-owned' } });
  }

  await prisma.userBadge.create({
    data: { userId: user.id, badgeId: target.id },
  });

  return NextResponse.json({
    data: { awarded: true, badgeId: target.id, badgeName: target.label },
  });
}
