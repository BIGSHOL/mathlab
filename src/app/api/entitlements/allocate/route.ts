import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, isResponse } from '@/lib/api';
import { prisma } from '@/lib/db';
import { allocateToStudent, isLicenseFeature } from '@/lib/entitlements/service';

export const dynamic = 'force-dynamic';

/** POST /api/entitlements/allocate — 지점 풀 → 학생 배정 (OWNER+). body: { userId, feature, qty } */
export async function POST(request: NextRequest) {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const tenantId = user.viewingTenantId ?? user.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: { code: 'NO_TENANT', message: '소속 지점이 없습니다.' } }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const userId: string = body?.userId;
  const feature = body?.feature;
  const qty = Number(body?.qty);

  if (!userId || !isLicenseFeature(feature)) {
    return NextResponse.json({ error: { code: 'BAD_INPUT', message: 'userId, feature 가 필요합니다.' } }, { status: 400 });
  }
  if (!Number.isInteger(qty) || qty <= 0) {
    return NextResponse.json({ error: { code: 'BAD_INPUT', message: '수량이 올바르지 않습니다.' } }, { status: 400 });
  }

  // 대상이 같은 지점의 학생인지 검증
  const student = await prisma.user.findFirst({
    where: { id: userId, tenantId, role: 'STUDENT', deletedAt: null },
    select: { id: true },
  });
  if (!student) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: '해당 지점의 학생을 찾을 수 없습니다.' } }, { status: 404 });
  }

  try {
    const result = await allocateToStudent(tenantId, userId, feature, qty);
    return NextResponse.json({ data: result });
  } catch (e) {
    if (e instanceof Error && e.message === 'INSUFFICIENT_POOL') {
      return NextResponse.json(
        { error: { code: 'INSUFFICIENT_POOL', message: '지점 이용권 풀 잔액이 부족합니다.' } },
        { status: 400 },
      );
    }
    console.error('[entitlements/allocate] 오류:', e);
    return NextResponse.json({ error: { code: 'INTERNAL', message: '배정 중 오류가 발생했습니다.' } }, { status: 500 });
  }
}
