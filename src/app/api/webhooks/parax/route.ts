import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { grantCredits, isLicenseFeature } from '@/lib/entitlements/service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/parax — para-x 결제 허브의 "이용권 지급" 통지 수신 (무인증, 서명검증).
 * para-x(lib/mathlabGrant.js)가 헤더 x-parax-signature = HMAC-SHA256(rawBody, PARAX_SHARED_SECRET) hex 로 서명.
 * payload: { orderId, tenantId, buyerUserId, kind:'credits'|'subscription', feature, qty, planId, amount }
 * 멱등: EntitlementLedger.refOrderId. 비2xx 면 para-x 가 재시도.
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

    if (!orderId || !tenantId || !kind) {
      return NextResponse.json({ error: 'orderId, tenantId, kind 필요' }, { status: 400 });
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
      // Phase 4 골격: 토스 빌링 구독 반영 예정. 지금은 안전하게 수용만(로그).
      console.log('[Parax Webhook] subscription kind 수신(Phase 4 예정):', orderId, g?.planId);
      return NextResponse.json({ received: true, deferred: 'subscription handled in Phase 4' });
    }

    return NextResponse.json({ error: `알 수 없는 kind: ${kind}` }, { status: 400 });
  } catch (e) {
    console.error('[Parax Webhook] 처리 오류:', e);
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 });
  }
}
