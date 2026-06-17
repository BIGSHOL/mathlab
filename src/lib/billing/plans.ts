/**
 * 구독 플랜 config — 한도/기능/가격 정책의 단일 진실 소스.
 * 티어 숫자·기능 토글은 여기 한 곳만 수정하면 게이팅·UI·API 전체에 반영된다.
 * ⚠️ 유료 플랜 구성(planId·월 크레딧·가격)은 para-x 상품 카탈로그(D:\para-x\lib\products.js)와
 *    정합 필수 — basic 월 20회 / pro 월 35회 / enterprise 월 80회.
 */

export type PlanId = 'free' | 'basic' | 'pro' | 'enterprise';
export type PlanFeature = 'commentary' | 'nearby';

export interface PlanConfig {
  id: PlanId;
  label: string;
  monthlyAnalyses: number; // 월 분석 쿼터 — 블랭크/템플릿(크레딧 미차감) 분석 전용 남용 가드 (Infinity = 무제한). 크레딧 차감 분석은 쿼터 면제(assertAnalysisGate)
  monthlyCredits: number; // 구독 갱신마다 자동 충전되는 EXAM_ANALYSIS 크레딧 (para-x 웹훅이 지급). 당월 결제주기까지만 유효 — 익월 이월 없음(reset)
  commentary: boolean; // AI 총평
  nearby: boolean; // 주변학교·연도 비교
  lsVariantEnv: string | null; // (레거시 LS) Lemon Squeezy Variant ID 환경변수명 — para-x 플랜은 null
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: { id: 'free', label: '무료', monthlyAnalyses: 3, monthlyCredits: 0, commentary: false, nearby: false, lsVariantEnv: null },
  basic: { id: 'basic', label: 'Basic', monthlyAnalyses: 20, monthlyCredits: 20, commentary: true, nearby: true, lsVariantEnv: null },
  pro: { id: 'pro', label: 'Pro', monthlyAnalyses: 35, monthlyCredits: 35, commentary: true, nearby: true, lsVariantEnv: 'LEMONSQUEEZY_VARIANT_PRO' },
  enterprise: { id: 'enterprise', label: 'Enterprise', monthlyAnalyses: 80, monthlyCredits: 80, commentary: true, nearby: true, lsVariantEnv: 'LEMONSQUEEZY_VARIANT_ENTERPRISE' },
};

export const PLAN_IDS = Object.keys(PLANS) as PlanId[];
export const PAID_PLAN_IDS = PLAN_IDS.filter((p) => p !== 'free');

/** 플랜 등급 비교용 랭크 (베타 floor 등에서 사용) */
export const PLAN_RANK: Record<PlanId, number> = { free: 0, basic: 1, pro: 2, enterprise: 3 };

/**
 * 베타 기간 전 테넌트에 보장하는 최소 플랜.
 * 서버 env `BETA_ALL_PRO=1`일 때 모든 테넌트가 최소 이 플랜으로 승격된다(실제 상위 플랜은 유지).
 */
export const BETA_PLAN: PlanId = 'pro';

export function isPlanId(x: unknown): x is PlanId {
  return typeof x === 'string' && x in PLANS;
}

/** 알 수 없는 값이면 free로 폴백 (절대 throw 안 함) */
export function getPlanConfig(plan: string | null | undefined): PlanConfig {
  return plan && plan in PLANS ? PLANS[plan as PlanId] : PLANS.free;
}
