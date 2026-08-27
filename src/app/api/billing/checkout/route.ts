import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, isResponse, badRequest } from '@/lib/api';
import { isPlanId, type PlanId } from '@/lib/billing/plans';
import { paraxCheckoutUrl } from '@/lib/parax/handoff';

export const dynamic = 'force-dynamic';

/**
 * POST /api/billing/checkout — body {plan}. 구독 체크아웃 URL 반환. (OWNER+)
 * tenantId 는 서버에서 인증 사용자로부터 결정(클라가 보내지 않음).
 * 구매자 식별은 서명 핸드오프 토큰(mintHandoffToken)으로 전달된다 — 클라이언트가 위조할 수 없다.
 */
export async function POST(request: NextRequest) {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const tenantId = user.viewingTenantId ?? user.tenantId;
  if (!tenantId) return badRequest('소속 지점이 없어 결제를 진행할 수 없습니다.');

  const body = await request.json().catch(() => ({}));
  if (!isPlanId(body?.plan) || body.plan === 'free') return badRequest('유효하지 않은 플랜입니다.');
  const plan: PlanId = body.plan;

  // 결제를 거치지 않고 플랜을 부여하는 경로는 두지 않는다 — 유료 플랜의 유일한 출처는
  // 결제 허브 웹훅(/api/webhooks/parax)과 SUPER_ADMIN 수동 배정(/api/admin/tenants) 뿐이다.
  if (!process.env.NEXT_PUBLIC_PARAX_CHECKOUT_URL) {
    console.error('[billing/checkout] NEXT_PUBLIC_PARAX_CHECKOUT_URL 미설정');
    return NextResponse.json(
      { error: { code: 'NOT_CONFIGURED', message: '지금은 결제를 진행할 수 없습니다. 잠시 후 다시 시도해 주세요.' } },
      { status: 503 },
    );
  }

  const checkoutUrl = paraxCheckoutUrl(`sub-${plan}`, { tenantId, userId: user.id, role: user.role });
  return NextResponse.json({ data: { checkoutUrl } });
}
