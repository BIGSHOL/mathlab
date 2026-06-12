/**
 * para-x 구독 웹훅 end-to-end 검증 (dev DB, 전용 테스트 테넌트 자체 정리).
 *
 * 시나리오:
 *   0. 서명 불일치 401 / 미지원 planId 400 / free planId 400
 *   1. 최초 구독 결제(basic) → 플랜 upsert + 월 크레딧 20 자동 충전(lot 만료일 +1년)
 *   2. 같은 주문 재전송(retry-grants 재발송) → 멱등 (중복 충전 없음, 플랜 upsert 무해)
 *   3. 월 갱신(새 orderId) → 기간 연장 + 크레딧 20 추가 충전
 *   4. 플랜별 수량 매핑 (basic 20 / pro 35 / enterprise 80) — para-x 카탈로그와 정합
 *   5. subscription_canceled → status 만 canceled, 기간말까지 플랜 유지
 *   6. 기간 경과 후 free 강등 (getTenantPlan)
 *   7. kind:'credits' 기존 경로 회귀 확인
 *
 * 실행: npx tsx scripts/verify-parax-subscription-webhook.ts
 */
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/db';
import { POST } from '../src/app/api/webhooks/parax/route';
import { getTenantPlan } from '../src/lib/billing/guard';
import { PLANS } from '../src/lib/billing/plans';

// 웹훅/플랜 판정이 읽는 env — 호출 시점에 읽으므로 import 이후 설정해도 적용됨
process.env.PARAX_SHARED_SECRET = process.env.PARAX_SHARED_SECRET || 'test-parax-secret';
process.env.BETA_ALL_PRO = '0'; // 베타 floor 가 플랜 판정을 가리지 않게

const SLUG = 'test-parax-sub-webhook';
let pass = 0, fail = 0;

function check(name: string, ok: boolean, detail?: string) {
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
}

function signedRequest(payload: unknown, opts: { badSignature?: boolean } = {}) {
  const raw = JSON.stringify(payload);
  const sig = opts.badSignature
    ? '00'.repeat(32)
    : crypto.createHmac('sha256', process.env.PARAX_SHARED_SECRET!).update(raw).digest('hex');
  return new NextRequest('http://localhost/api/webhooks/parax', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-parax-signature': sig },
    body: raw,
    // @ts-expect-error Node fetch 는 body 있는 요청에 duplex 옵션을 요구
    duplex: 'half',
  });
}

async function call(payload: unknown, opts: { badSignature?: boolean } = {}) {
  const res = await POST(signedRequest(payload, opts));
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json } as { status: number; json: Record<string, unknown> };
}

const isoIn = (days: number) => new Date(Date.now() + days * 86400_000).toISOString();
const nearOneYear = (iso?: string) => {
  if (!iso) return false;
  const expect = new Date(); expect.setFullYear(expect.getFullYear() + 1);
  return Math.abs(new Date(iso).getTime() - expect.getTime()) < 60_000;
};

async function poolBalance(tenantId: string) {
  const agg = await prisma.entitlementCreditLot.aggregate({
    where: { tenantId, feature: 'EXAM_ANALYSIS', userId: null, remaining: { gt: 0 }, expiresAt: { gt: new Date() } },
    _sum: { remaining: true },
  });
  return agg._sum.remaining ?? 0;
}

async function cleanup() {
  // Tenant cascade 로 subscription/entitlement/lot/ledger 까지 정리
  await prisma.tenant.deleteMany({ where: { slug: SLUG } });
}

async function main() {
  await cleanup(); // 이전 크래시 잔재 정리
  const tenant = await prisma.tenant.create({ data: { slug: SLUG, name: '구독 웹훅 테스트 지점' } });
  const T = tenant.id;

  try {
    console.log('0. 입력 검증');
    const bad = await call({ orderId: 'test-sub-X', tenantId: T, kind: 'subscription', planId: 'basic' }, { badSignature: true });
    check('서명 불일치 → 401', bad.status === 401, `status=${bad.status}`);

    const unknownPlan = await call({ orderId: 'test-sub-X', tenantId: T, kind: 'subscription', planId: 'gold' });
    check('미지원 planId → 400', unknownPlan.status === 400, `status=${unknownPlan.status}`);

    const freePlan = await call({ orderId: 'test-sub-X', tenantId: T, kind: 'subscription', planId: 'free' });
    check('free planId → 400', freePlan.status === 400, `status=${freePlan.status}`);

    console.log('\n1. 최초 구독 결제 (basic) — para-x confirm-payment 통지');
    const r1 = await call({
      orderId: 'test-sub-O1', tenantId: T, buyerUserId: null, kind: 'subscription',
      planId: 'basic', amount: 80000, tossBillingKey: 'bk-test', tossCustomerKey: 'ck-test', periodEnd: isoIn(30),
    });
    const credits1 = r1.json.credits as { qty: number; applied: boolean; expiresAt?: string } | null;
    check('200 + 크레딧 20 지급 응답', r1.status === 200 && credits1?.qty === 20 && credits1?.applied === true,
      `status=${r1.status}, credits=${JSON.stringify(credits1)}`);
    check('크레딧 만료일 = 충전일 + 1년', nearOneYear(credits1?.expiresAt), `expiresAt=${credits1?.expiresAt}`);

    const sub1 = await prisma.tenantSubscription.findUnique({ where: { tenantId: T } });
    check('TenantSubscription: plan=basic, status=active, periodEnd 기록',
      sub1?.plan === 'basic' && sub1?.status === 'active' && !!sub1?.currentPeriodEnd,
      JSON.stringify({ plan: sub1?.plan, status: sub1?.status }));
    check('풀 잔액 20 (lot 기준)', (await poolBalance(T)) === 20, `balance=${await poolBalance(T)}`);
    const ledger1 = await prisma.entitlementLedger.findUnique({ where: { refOrderId: 'test-sub-O1:monthly-credits' } });
    check('원장 기록 refOrderId=<orderId>:monthly-credits', ledger1?.delta === 20 && ledger1?.amount === 80000,
      JSON.stringify({ delta: ledger1?.delta, amount: ledger1?.amount }));
    check('getTenantPlan = basic', (await getTenantPlan(T)) === 'basic', `plan=${await getTenantPlan(T)}`);

    console.log('\n2. 같은 주문 재전송 (retry-grants 재발송) — 멱등');
    const r2 = await call({
      orderId: 'test-sub-O1', tenantId: T, kind: 'subscription',
      planId: 'basic', amount: 80000, tossBillingKey: 'bk-test', tossCustomerKey: 'ck-test', periodEnd: isoIn(30),
    });
    const credits2 = r2.json.credits as { applied: boolean } | null;
    const lotCount2 = await prisma.entitlementCreditLot.count({ where: { tenantId: T, feature: 'EXAM_ANALYSIS' } });
    check('200 + applied=false (중복 충전 없음)', r2.status === 200 && credits2?.applied === false,
      `status=${r2.status}, credits=${JSON.stringify(credits2)}`);
    check('lot 1개 유지 · 잔액 20 · 플랜 upsert 무해(active 유지)',
      lotCount2 === 1 && (await poolBalance(T)) === 20
        && (await prisma.tenantSubscription.findUnique({ where: { tenantId: T } }))?.status === 'active',
      `lots=${lotCount2}, balance=${await poolBalance(T)}`);

    console.log('\n3. 월 갱신 (charge-billing — 새 orderId, periodEnd 연장)');
    const r3 = await call({
      orderId: 'test-sub-O2', tenantId: T, kind: 'subscription',
      planId: 'basic', amount: 80000, tossBillingKey: 'bk-test', tossCustomerKey: 'ck-test', periodEnd: isoIn(60),
    });
    const sub3 = await prisma.tenantSubscription.findUnique({ where: { tenantId: T } });
    const credits3 = r3.json.credits as { qty: number; applied: boolean } | null;
    check('200 + 크레딧 20 추가 충전', r3.status === 200 && credits3?.applied === true && (await poolBalance(T)) === 40,
      `status=${r3.status}, balance=${await poolBalance(T)}`);
    check('currentPeriodEnd 연장 반영',
      !!sub3?.currentPeriodEnd && Math.abs(sub3.currentPeriodEnd.getTime() - new Date(isoIn(60)).getTime()) < 60_000,
      `periodEnd=${sub3?.currentPeriodEnd?.toISOString()}`);

    console.log('\n4. 플랜별 수량 매핑 (para-x 카탈로그 정합)');
    check('PLANS 월 크레딧 = basic 20 / pro 35 / enterprise 80',
      PLANS.basic.monthlyCredits === 20 && PLANS.pro.monthlyCredits === 35 && PLANS.enterprise.monthlyCredits === 80);
    const rPro = await call({ orderId: 'test-sub-O3', tenantId: T, kind: 'subscription', planId: 'pro', amount: 133000, periodEnd: isoIn(60) });
    const rEnt = await call({ orderId: 'test-sub-O4', tenantId: T, kind: 'subscription', planId: 'enterprise', amount: 280000, periodEnd: isoIn(60) });
    check('pro 갱신 → 35 지급', rPro.status === 200 && (rPro.json.credits as { qty: number })?.qty === 35);
    check('enterprise 갱신 → 80 지급 (누적 잔액 20+20+35+80=155)',
      rEnt.status === 200 && (rEnt.json.credits as { qty: number })?.qty === 80 && (await poolBalance(T)) === 155,
      `balance=${await poolBalance(T)}`);

    console.log('\n5. 구독 해지 통지 (기간말 해지 — 실제 payload 처럼 orderId 없음)');
    const r5 = await call({ kind: 'subscription_canceled', tenantId: T, planId: 'enterprise', reason: 'user_request', canceledAt: new Date().toISOString(), currentPeriodEnd: isoIn(60) });
    const sub5 = await prisma.tenantSubscription.findUnique({ where: { tenantId: T } });
    check('200 + status=cancelled (플랜·기간 유지)', r5.status === 200 && sub5?.status === 'cancelled' && sub5?.plan === 'enterprise',
      JSON.stringify({ status: sub5?.status, plan: sub5?.plan }));
    check('기간말 전엔 플랜 유지 (getTenantPlan=enterprise)', (await getTenantPlan(T)) === 'enterprise', `plan=${await getTenantPlan(T)}`);

    console.log('\n6. 기간 경과 후 free 강등');
    await prisma.tenantSubscription.update({ where: { tenantId: T }, data: { currentPeriodEnd: new Date(Date.now() - 86400_000) } });
    check('periodEnd 경과 + canceled → getTenantPlan=free', (await getTenantPlan(T)) === 'free', `plan=${await getTenantPlan(T)}`);

    console.log('\n7. kind:credits 기존 경로 회귀');
    const r7 = await call({ orderId: 'test-sub-O5', tenantId: T, buyerUserId: null, kind: 'credits', feature: 'EXAM_ANALYSIS', qty: 10, amount: 80000 });
    check('일회성 크레딧 충전 정상 (잔액 155+10=165)', r7.status === 200 && (await poolBalance(T)) === 165,
      `status=${r7.status}, balance=${await poolBalance(T)}`);

    console.log(`\n결과: ${pass} 통과 / ${fail} 실패`);
    if (fail > 0) process.exitCode = 1;
  } finally {
    await cleanup();
    console.log('테스트 데이터 정리 완료');
  }
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
