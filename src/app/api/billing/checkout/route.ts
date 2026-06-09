import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOwner, isResponse, badRequest } from '@/lib/api';
import { isPlanId, type PlanId } from '@/lib/billing/plans';
import { monthBounds } from '@/lib/billing/guard';

export const dynamic = 'force-dynamic';

/**
 * POST /api/billing/checkout — body {plan}. 토스(para-x 결제 허브) 구독 체크아웃 URL 반환. (OWNER+)
 * tenantId 는 서버에서 인증 사용자로부터 결정(클라가 보내지 않음).
 * 식별은 Phase 5 에서 서명 핸드오프로 교체 예정(현재는 dev: tenantId 직접 전달 → para-x ALLOW_DEV_IDENTITY 필요).
 */
export async function POST(request: NextRequest) {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const tenantId = user.viewingTenantId ?? user.tenantId;
  if (!tenantId) return badRequest('소속 지점이 없어 결제를 진행할 수 없습니다.');

  const body = await request.json().catch(() => ({}));
  if (!isPlanId(body?.plan) || body.plan === 'free') return badRequest('유효하지 않은 플랜입니다.');
  const plan: PlanId = body.plan;

  const base = process.env.NEXT_PUBLIC_PARAX_CHECKOUT_URL;
  if (!base) {
    // para-x 미설정: 선택적 데모 업그레이드(테스트용) — ALLOW_DEMO_UPGRADE=1
    if (process.env.ALLOW_DEMO_UPGRADE === '1') {
      const { nextMonthStart } = monthBounds();
      await prisma.tenantSubscription.upsert({
        where: { tenantId },
        create: { tenantId, plan, status: 'active', currentPeriodEnd: nextMonthStart },
        update: { plan, status: 'active', currentPeriodEnd: nextMonthStart },
      });
      return NextResponse.json({ data: { demo: true, upgraded: true, plan, message: '데모 모드: 플랜이 변경되었습니다.' } });
    }
    return NextResponse.json({ data: { demo: true, configured: false, message: '결제 URL이 설정되지 않았습니다 (NEXT_PUBLIC_PARAX_CHECKOUT_URL).' } });
  }

  const checkoutUrl = `${base}?product=sub-${plan}&type=subscription&tenantId=${encodeURIComponent(tenantId)}`;
  return NextResponse.json({ data: { checkoutUrl } });
}
