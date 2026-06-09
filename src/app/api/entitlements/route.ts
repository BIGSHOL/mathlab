import { NextResponse } from 'next/server';
import { requireOwner, isResponse } from '@/lib/api';
import { getEntitlementOverview } from '@/lib/entitlements/service';

export const dynamic = 'force-dynamic';

/** GET /api/entitlements — 본인 지점 이용권 풀 + 학생별 배정 현황 (OWNER+) */
export async function GET() {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const tenantId = user.viewingTenantId ?? user.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: { code: 'NO_TENANT', message: '소속 지점이 없습니다.' } }, { status: 400 });
  }

  const data = await getEntitlementOverview(tenantId);
  return NextResponse.json({ data });
}
