import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOwner, isResponse, notFound, serverError } from '@/lib/api';
import { isLemonSqueezyConfigured, getPortalUrl } from '@/lib/billing/lemonsqueezy';

export const dynamic = 'force-dynamic';

/** GET /api/billing/portal — LS 고객 포털 URL (구독 변경/취소/결제수단). (OWNER+) */
export async function GET() {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const tenantId = user.viewingTenantId ?? user.tenantId;
  if (!tenantId) return notFound('소속 지점이 없습니다.');

  if (!isLemonSqueezyConfigured()) {
    return NextResponse.json({ error: { code: 'NOT_CONFIGURED', message: '결제 시스템이 설정되지 않았습니다.' } }, { status: 503 });
  }

  const sub = await prisma.tenantSubscription.findUnique({ where: { tenantId } });
  if (!sub?.lsSubscriptionId) return notFound('활성 구독이 없습니다.');

  const url = await getPortalUrl(sub.lsSubscriptionId);
  if (!url) return serverError('포털 URL을 가져올 수 없습니다.');
  return NextResponse.json({ data: { portalUrl: url } });
}
