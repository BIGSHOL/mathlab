import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOwner, isResponse, badRequest, serverError } from '@/lib/api';
import { isPlanId, type PlanId } from '@/lib/billing/plans';
import { createTenantCheckout, isLemonSqueezyConfigured } from '@/lib/billing/lemonsqueezy';
import { monthBounds } from '@/lib/billing/guard';

export const dynamic = 'force-dynamic';

/** POST /api/billing/checkout — body {plan}. 설정 시 LS 체크아웃 URL, 미설정 시 데모 응답. (OWNER+) */
export async function POST(request: NextRequest) {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const tenantId = user.viewingTenantId ?? user.tenantId;
  if (!tenantId) return badRequest('소속 지점이 없어 결제를 진행할 수 없습니다.');

  const body = await request.json().catch(() => ({}));
  if (!isPlanId(body?.plan) || body.plan === 'free') return badRequest('유효하지 않은 플랜입니다.');
  const plan: PlanId = body.plan;

  if (!isLemonSqueezyConfigured()) {
    // 미설정: 선택적 데모 업그레이드(테스트용) — ALLOW_DEMO_UPGRADE=1
    if (process.env.ALLOW_DEMO_UPGRADE === '1') {
      const { nextMonthStart } = monthBounds();
      await prisma.tenantSubscription.upsert({
        where: { tenantId },
        create: { tenantId, plan, status: 'active', currentPeriodEnd: nextMonthStart },
        update: { plan, status: 'active', currentPeriodEnd: nextMonthStart },
      });
      return NextResponse.json({ data: { demo: true, upgraded: true, plan, message: '데모 모드: 플랜이 변경되었습니다.' } });
    }
    return NextResponse.json({ data: { demo: true, configured: false, message: '결제가 아직 설정되지 않았습니다 (데모 모드).' } });
  }

  // AuthUser엔 email이 없음(NextAuth email 슬롯=username) → 실제 email은 DB에서
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { email: true } });
  const result = await createTenantCheckout(tenantId, plan, dbUser?.email ?? undefined);
  if (!result.ok || !result.checkoutUrl) return serverError(result.error ?? '체크아웃 생성에 실패했습니다.');
  return NextResponse.json({ data: { checkoutUrl: result.checkoutUrl } });
}
