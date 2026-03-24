import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/api/auth';
import { isResponse } from '@/lib/api/helpers';
import { getLicenseUsageStats } from '@/lib/services/license';

export async function GET(request: NextRequest) {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const tenantId = user.tenantId || user.viewingTenantId;
  if (!tenantId) {
    return NextResponse.json(
      { error: { code: 'NO_TENANT', message: '테넌트 정보가 없습니다' } },
      { status: 400 }
    );
  }

  const daysParam = request.nextUrl.searchParams.get('days');
  const days = Math.min(Math.max(Number(daysParam) || 7, 1), 30);

  try {
    const result = await getLicenseUsageStats(tenantId, days);
    return NextResponse.json({ data: result });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: '사용 통계를 불러오지 못했습니다' } },
      { status: 500 }
    );
  }
}
