import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { variantToPlan } from '@/lib/billing/lemonsqueezy';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/lemonsqueezy — LS 구독 이벤트 수신 (무인증, 서명검증).
 * meta.custom_data.tenant_id 로 테넌트 연결(체크아웃에서 넣은 값이 echo됨).
 * created=upsert(멱등), 나머지=updateMany(행 없으면 무해 no-op). LS는 비2xx 시 재시도.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[LS Webhook] LEMONSQUEEZY_WEBHOOK_SECRET 미설정');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('x-signature') || '';
  if (!signature || !rawBody) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  // HMAC-SHA256 서명검증 — 디코드된 버퍼 길이부터 비교(길이 다르면 timingSafeEqual이 throw하므로 단락).
  // 잘못된 hex(64자여도 비-hex 문자 포함)는 짧은 버퍼로 디코드되므로 버퍼 길이 비교가 안전.
  const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest(); // Buffer(32)
  const sigBuf = Buffer.from(signature, 'hex');
  if (sigBuf.length !== hmac.length || !crypto.timingSafeEqual(sigBuf, hmac)) {
    return NextResponse.json({ error: '서명 불일치' }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody);
    const eventName: string = payload.meta?.event_name;
    const tenantId: string | null = payload.meta?.custom_data?.tenant_id || null;
    const attrs = payload.data?.attributes ?? {};
    const subscriptionId = String(payload.data?.id || '');
    const variantId = Number(attrs.variant_id || 0);
    // created 외 이벤트는 custom_data가 없을 수 있음 → lsSubscriptionId로 해소
    const resolveWhere = tenantId ? { tenantId } : { lsSubscriptionId: subscriptionId };

    switch (eventName) {
      case 'subscription_created': {
        if (!tenantId) return NextResponse.json({ error: 'Missing tenant_id' }, { status: 400 });
        const plan = variantToPlan(variantId) ?? 'free';
        const fields = {
          plan,
          status: String(attrs.status || 'active'),
          lsCustomerId: String(attrs.customer_id || '') || null,
          lsSubscriptionId: subscriptionId || null,
          lsVariantId: variantId || null,
          currentPeriodEnd: attrs.renews_at ? new Date(attrs.renews_at) : null,
        };
        await prisma.tenantSubscription.upsert({ where: { tenantId }, create: { tenantId, ...fields }, update: fields });
        break;
      }
      case 'subscription_updated': {
        const sub = await prisma.tenantSubscription.findFirst({ where: resolveWhere });
        if (!sub) break;
        const data: { status?: string; plan?: string; lsVariantId?: number; currentPeriodEnd?: Date } = {
          status: String(attrs.status || sub.status),
        };
        if (variantId && sub.lsVariantId !== variantId) {
          data.plan = variantToPlan(variantId) ?? sub.plan;
          data.lsVariantId = variantId;
        }
        if (attrs.renews_at) data.currentPeriodEnd = new Date(attrs.renews_at);
        await prisma.tenantSubscription.update({ where: { id: sub.id }, data });
        break;
      }
      case 'subscription_cancelled': // 기간 종료까지 접근 유지
        await prisma.tenantSubscription.updateMany({ where: resolveWhere, data: { status: 'cancelled' } });
        break;
      case 'subscription_expired': // free 강등
        await prisma.tenantSubscription.updateMany({ where: resolveWhere, data: { plan: 'free', status: 'expired', lsVariantId: null } });
        break;
      case 'subscription_payment_success': { // 갱신 → 연장 + active
        const data: { status: string; currentPeriodEnd?: Date } = { status: 'active' };
        if (attrs.renews_at) data.currentPeriodEnd = new Date(attrs.renews_at);
        await prisma.tenantSubscription.updateMany({ where: resolveWhere, data });
        break;
      }
      case 'subscription_payment_failed':
        await prisma.tenantSubscription.updateMany({ where: resolveWhere, data: { status: 'past_due' } });
        break;
      default:
        console.log('[LS Webhook] 미처리 이벤트:', eventName);
    }
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error('[LS Webhook] 처리 오류:', e);
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 });
  }
}
