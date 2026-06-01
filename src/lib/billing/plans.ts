/**
 * 구독 플랜 config — 한도/기능/가격 정책의 단일 진실 소스.
 * 티어 숫자·기능 토글은 여기 한 곳만 수정하면 게이팅·UI·API 전체에 반영된다.
 */

export type PlanId = 'free' | 'pro' | 'enterprise';
export type PlanFeature = 'commentary' | 'nearby';

export interface PlanConfig {
  id: PlanId;
  label: string;
  monthlyAnalyses: number; // Infinity = 무제한
  commentary: boolean; // AI 총평
  nearby: boolean; // 주변학교·연도 비교
  lsVariantEnv: string | null; // 이 플랜의 Lemon Squeezy Variant ID 환경변수명 (free = null)
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: { id: 'free', label: '무료', monthlyAnalyses: 3, commentary: false, nearby: false, lsVariantEnv: null },
  pro: { id: 'pro', label: 'Pro', monthlyAnalyses: 50, commentary: true, nearby: true, lsVariantEnv: 'LEMONSQUEEZY_VARIANT_PRO' },
  enterprise: { id: 'enterprise', label: 'Enterprise', monthlyAnalyses: Infinity, commentary: true, nearby: true, lsVariantEnv: 'LEMONSQUEEZY_VARIANT_ENTERPRISE' },
};

export const PLAN_IDS = Object.keys(PLANS) as PlanId[];
export const PAID_PLAN_IDS = PLAN_IDS.filter((p) => p !== 'free');

export function isPlanId(x: unknown): x is PlanId {
  return typeof x === 'string' && x in PLANS;
}

/** 알 수 없는 값이면 free로 폴백 (절대 throw 안 함) */
export function getPlanConfig(plan: string | null | undefined): PlanConfig {
  return plan && plan in PLANS ? PLANS[plan as PlanId] : PLANS.free;
}
