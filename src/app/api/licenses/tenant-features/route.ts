import { NextResponse } from 'next/server';
import { requireAuth, isResponse } from '@/lib/api';
import { prisma } from '@/lib/db';

/** GET: 현재 지점의 활성 이용권 기능 목록 반환 (사이드바 필터용) */
export async function GET() {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const effectiveTenantId = user.viewingTenantId ?? user.tenantId;
  if (!effectiveTenantId) {
    return NextResponse.json({ data: [] });
  }

  const licenses = await prisma.tenantLicense.findMany({
    where: { tenantId: effectiveTenantId, isActive: true },
    select: { feature: true },
  });

  const features = licenses.map((l) => l.feature);
  return NextResponse.json({ data: features });
}
