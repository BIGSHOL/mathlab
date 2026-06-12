import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { grantCredits, isLicenseFeature } from '@/lib/entitlements/service';
import { isPlanId, PLANS } from '@/lib/billing/plans';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/parax — para-x 결제 허브의 "이용권 지급" 통지 수신 (무인증, 서명검증).
 * para-x(lib/mathlabGrant.js)가 헤더 x-parax-signature = HMAC-SHA256(rawBody, PARAX_SHARED_SECRET) hex 로 서명.
 * payload: { orderId, tenantId, buyerUserId, kind:'credits'|'subscription'|'subscription_canceled',
 *            feature, qty, planId, amount, periodEnd, currentPeriodEnd }
 * 멱등: EntitlementLedger.refOrderId. 비2xx 면 para-x 가 재시도(retry-grants 재발송).
 * 크레딧 유효기간(약관 제6조): 충전일로부터 1년 — grantCredits 가 lot(expiresAt) 기록, 응답에 expiresAt 포함.
 * 구독(kind:'subscription')은 최초 결제·월 갱신마다 들어오며 플랜 upsert + 월 크레딧 자동 충전
 * (PLANS[planId].monthlyCredits → grantCredits, refOrderId=`<orderId>:monthly-credits`)을 함께 수행
 * — 월 충전분도 각 충전일 기준 1년 만료가 동일 적용된다. 갱신마다 orderId 가 달라 매월 새로 지급되고,
 * 같은 주문 재전송은 ledger 유니크로 멱등. 크레딧 지급 실패 시 비2xx → para-x 재시도(플랜 upsert 는 멱등이라 재실행 무해).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.PARAX_SHARED_SECRET;
  if (!secret) {
    console.error('[Parax Webhook] PARAX_SHARED_SECRET 미설정');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('x-parax-signature') || '';
  if (!signature || !rawBody) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  // HMAC-SHA256 서명검증 (LS 웹훅과 동일 패턴 — 길이비교 후 timingSafeEqual)
  const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest();
  const sigBuf = Buffer.from(signature, 'hex');
  if (sigBuf.length !== hmac.length || !crypto.timingSafeEqual(sigBuf, hmac)) {
    return NextResponse.json({ error: '서명 불일치' }, { status: 401 });
  }

  try {
    const g = JSON.parse(rawBody);
    const orderId: string = g?.orderId;
    const tenantId: string = g?.tenantId;
    const kind: string = g?.kind;
    const buyerUserId: string | null = g?.buyerUserId ?? null;

    // orderId 는 지급 계열(credits/subscription)에만 존재 — 해지 통지(subscription_canceled)엔 없다
    if (!tenantId || !kind) {
      return NextResponse.json({ error: 'tenantId, kind 필요' }, { status: 400 });
    }
    if ((kind === 'credits' || kind === 'subscription') && !orderId) {
      return NextResponse.json({ error: 'orderId 필요' }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
    if (!tenant) return NextResponse.json({ error: '존재하지 않는 tenant' }, { status: 400 });

    if (kind === 'credits') {
      if (!isLicenseFeature(g?.feature)) {
        return NextResponse.json({ error: `알 수 없는 feature: ${g?.feature}` }, { status: 400 });
      }
      const qty = Number(g?.qty);
      if (!Number.isInteger(qty) || qty <= 0) {
        return NextResponse.json({ error: 'qty 가 올바르지 않습니다' }, { status: 400 });
      }
      const result = await grantCredits(tenantId, g.feature, qty, {
        refOrderId: String(orderId),
        userId: buyerUserId,
        amount: g?.amount != null ? Number(g.amount) : null,
      });
      return NextResponse.json({ received: true, ...result });
    }

    if (kind === 'subscription') {
      const planId: string = g?.planId;
      if (!isPlanId(planId) || planId === 'free') {
        return NextResponse.json({ error: `알 수 없는 plan: ${planId}` }, { status: 400 });
      }
      const periodEnd = g?.periodEnd ? new Date(g.periodEnd) : null;
      const fields = {
        plan: planId,
        status: 'active',
        tossBillingKey: g?.tossBillingKey ?? null,
        tossCustomerKey: g?.tossCustomerKey ?? null,
        tossSubscriptionId: g?.tossBillingKey ?? null,
        currentPeriodEnd: periodEnd,
      };
      await prisma.tenantSubscription.upsert({
        where: { tenantId },
        create: { tenantId, ...fields },
        update: fields,
      });

      // 구독 월 크레딧 자동 충전 (마케팅: basic 20 / pro 35 / enterprise 80 회) — 멱등(ledger refOrderId 유니크).
      // 여기서 throw 되면 외부 catch 가 500 반환 → para-x 가 같은 orderId 로 재시도하고,
      // 위 플랜 upsert 는 멱등이라 재실행돼도 무해하다 (부분 실패 수렴).
      const monthlyCredits = PLANS[planId].monthlyCredits;
      let credits: { qty: number; applied: boolean; expiresAt?: string } | null = null;
      if (monthlyCredits > 0) {
        const result = await grantCredits(tenantId, 'EXAM_ANALYSIS', monthlyCredits, {
          refOrderId: `${orderId}:monthly-credits`,
          userId: buyerUserId, // 월 갱신(charge-billing)엔 없음 → null
          amount: g?.amount != null ? Number(g.amount) : null,
        });
        credits = { qty: monthlyCredits, applied: result.applied, expiresAt: result.expiresAt };
      }
      return NextResponse.json({ received: true, plan: planId, credits });
    }

    if (kind === 'subscription_canceled') {
      // 기간말 해지 (para-x cancel-subscription / charge-billing 더닝 자동해지) — 플랜·기간은 유지,
      // status 만 cancelled(mathlab 내부 표기) 로. currentPeriodEnd 경과 후 getTenantPlan(resolveBasePlan)이
      // free 로 강등한다. 구독 행이 없으면 no-op (이미 free — 멱등).
      const periodEnd = g?.currentPeriodEnd ? new Date(g.currentPeriodEnd) : null;
      await prisma.tenantSubscription.updateMany({
        where: { tenantId },
        data: { status: 'cancelled', ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}) },
      });
      return NextResponse.json({ received: true, canceled: true });
    }

    return NextResponse.json({ error: `알 수 없는 kind: ${kind}` }, { status: 400 });
  } catch (e) {
    console.error('[Parax Webhook] 처리 오류:', e);
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 });
  }
}
