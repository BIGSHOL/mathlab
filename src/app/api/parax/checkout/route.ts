import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, isResponse } from '@/lib/api';
import { paraxCheckoutUrl } from '@/lib/parax/handoff';

export const dynamic = 'force-dynamic';

/**
 * GET /api/parax/checkout?product=<id> — 로그인 원장을 para-x 결제로 안전 인계.
 * 서명 토큰을 발급해 para-x 체크아웃으로 302 리다이렉트. (이용권 구매·구독 공용 진입점, OWNER+)
 */
export async function GET(request: NextRequest) {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const tenantId = user.viewingTenantId ?? user.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: { code: 'NO_TENANT', message: '소속 지점이 없습니다.' } }, { status: 400 });
  }
  const product = new URL(request.url).searchParams.get('product');
  if (!product) {
    return NextResponse.json({ error: { code: 'BAD_INPUT', message: 'product 가 필요합니다.' } }, { status: 400 });
  }

  let url: string;
  try {
    url = paraxCheckoutUrl(product, { tenantId, userId: user.id, role: user.role });
  } catch (e) {
    return NextResponse.json({ error: { code: 'CONFIG', message: (e as Error).message } }, { status: 500 });
  }
  return NextResponse.redirect(url, 302);
}
