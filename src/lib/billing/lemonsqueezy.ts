/**
 * Lemon Squeezy 클라이언트 래퍼 (서버 전용).
 * 미설정(키 placeholder) 상태에서도 throw 없이 동작 — 골격/데모 모드 안전.
 */
import { lemonSqueezySetup, createCheckout, getSubscription } from '@lemonsqueezy/lemonsqueezy.js';
import { PLANS, PAID_PLAN_IDS, type PlanId } from './plans';

/** SDK 초기화 — serverless 매 호출 안전. 미설정 시 throw (호출 전 isLemonSqueezyConfigured 확인). */
export function configureLemonSqueezy() {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  if (!apiKey) throw new Error('LEMONSQUEEZY_API_KEY 환경변수가 설정되지 않았습니다.');
  lemonSqueezySetup({ apiKey, onError: (e) => console.error('[LemonSqueezy]', e.message) });
}

/** API_KEY + STORE_ID + WEBHOOK_SECRET 모두 존재해야 설정됨으로 간주 */
export function isLemonSqueezyConfigured(): boolean {
  return !!(process.env.LEMONSQUEEZY_API_KEY && process.env.LEMONSQUEEZY_STORE_ID && process.env.LEMONSQUEEZY_WEBHOOK_SECRET);
}

/** 플랜 → Variant ID (PLANS.lsVariantEnv 로부터 env 읽음, free 제외) */
export const PLAN_VARIANT_MAP: Record<string, number> = Object.fromEntries(
  PAID_PLAN_IDS.map((p) => {
    const envName = PLANS[p].lsVariantEnv;
    return [p, envName ? Number(process.env[envName] || 0) : 0];
  }),
);

/** Variant ID → 플랜 (매칭 없으면 null) */
export function variantToPlan(variantId: number): PlanId | null {
  if (!variantId) return null;
  for (const [plan, vid] of Object.entries(PLAN_VARIANT_MAP)) {
    if (vid && vid === variantId) return plan as PlanId;
  }
  return null;
}

export interface CheckoutResult {
  ok: boolean;
  checkoutUrl?: string;
  error?: string;
}

/**
 * 테넌트용 체크아웃 생성. 미설정/variant 누락 → { ok:false, error } (throw 안 함).
 * custom.tenant_id 는 checkout ↔ tenant 의 유일한 연결고리 (webhook의 meta.custom_data로 echo됨).
 */
export async function createTenantCheckout(tenantId: string, plan: PlanId, email?: string): Promise<CheckoutResult> {
  if (!isLemonSqueezyConfigured()) return { ok: false, error: '결제 시스템이 설정되지 않았습니다.' };
  const variantId = PLAN_VARIANT_MAP[plan];
  if (!variantId) return { ok: false, error: `${plan} 플랜의 Variant ID가 설정되지 않았습니다.` };

  configureLemonSqueezy();
  const storeId = process.env.LEMONSQUEEZY_STORE_ID!;
  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const { data, error } = await createCheckout(storeId, variantId, {
    checkoutData: {
      email: email || undefined,
      custom: { tenant_id: tenantId },
    },
    productOptions: {
      redirectUrl: `${appUrl}/billing?success=true`,
      receiptButtonText: '대시보드로 돌아가기',
      receiptThankYouNote: 'MathLab 구독해 주셔서 감사합니다!',
    },
  });
  if (error) {
    console.error('[LS createTenantCheckout]', error);
    return { ok: false, error: '체크아웃 생성에 실패했습니다.' };
  }
  return { ok: true, checkoutUrl: data?.data?.attributes?.url };
}

/** 고객 포털 URL (구독 변경/취소/결제수단). 미설정/실패 → null. */
export async function getPortalUrl(subscriptionId: string): Promise<string | null> {
  if (!isLemonSqueezyConfigured()) return null;
  configureLemonSqueezy();
  const { data, error } = await getSubscription(subscriptionId);
  if (error) {
    console.error('[LS getPortalUrl]', error);
    return null;
  }
  return data?.data?.attributes?.urls?.customer_portal ?? null;
}
