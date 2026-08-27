/**
 * 구독 게이팅 헬퍼 (서버 전용).
 * - getTenantPlan: 유효 플랜 (행 없음/만료 → free)
 * - assertAnalysisGate: 분석 실행 통합 게이트 — 분석 주체는 선생님. 지점 풀에서 차감(학생 무관),
 *   풀이 비면 무료 월 한도로 폴백 (학생별 배정 불필요).
 * - assertAnalysisQuota / assertPlanFeature: NextResponse(403) 또는 null 반환
 *   → 라우트에서 `const gate = await assert...(); if (gate) return gate;` 패턴.
 * tenantId 없음(SUPER_ADMIN 무테넌트 등) → 면제(null).
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { poolUsableBalance, alreadyConsumed } from '@/lib/entitlements/service';
import { getPlanConfig, type PlanId, type PlanFeature } from './plans';

/** UTC 이번 달 / 다음 달 경계 */
export function monthBounds(now = new Date()) {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { monthStart, nextMonthStart };
}

/**
 * 유효 플랜 — 구독 행이 유일한 근거다. 행 없음 → free.
 * 만료(currentPeriodEnd 과거 && status≠active) → free.
 * env 스위치 하나로 전 지점을 일괄 승격하던 베타 floor 는 제거됐다(결제 없이 유료 기능이 열리던 경로).
 * 결제 없이 플랜을 올려야 하면 SUPER_ADMIN 이 /admin/tenants 에서 지점별로 명시 배정한다.
 */
export async function getTenantPlan(tenantId: string | null | undefined): Promise<PlanId> {
  if (!tenantId) return 'free';
  const sub = await prisma.tenantSubscription.findUnique({ where: { tenantId } });
  if (!sub) return 'free';
  const plan = getPlanConfig(sub.plan).id;
  if (plan === 'free') return 'free';
  const expired = !!sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() < Date.now();
  if (expired && sub.status !== 'active') return 'free';
  return plan;
}

/**
 * 이번 달 "무료 한도(quota)로 처리된 분석" 수 (테넌트 단위).
 * consumeExamAnalysisCredit 가 풀 차감이 없을 때 남기는 ledger reason='quota' 행을 집계 —
 * 유료 풀 차감(reason='consume')은 무료 한도를 잠식하지 않는다.
 */
export async function getMonthlyQuotaUsed(tenantId: string): Promise<number> {
  const { monthStart, nextMonthStart } = monthBounds();
  return prisma.entitlementLedger.count({
    where: {
      tenantId,
      feature: 'EXAM_ANALYSIS',
      reason: 'quota',
      createdAt: { gte: monthStart, lt: nextMonthStart },
    },
  });
}

const FEATURE_LABELS: Record<PlanFeature, string> = { commentary: 'AI 총평', nearby: '주변학교 비교' };

/**
 * 무료 월 한도 검사 (지점 풀에 유료 크레딧이 없을 때의 폴백).
 * 이번 달 'quota' 처리 분석 수가 플랜 한도 이상이면 차단. 초과 → 403, 통과 → null.
 */
export async function assertAnalysisQuota(tenantId: string | null | undefined): Promise<NextResponse | null> {
  if (!tenantId) return null;
  const plan = await getTenantPlan(tenantId);
  const limit = getPlanConfig(plan).monthlyAnalyses;
  if (!Number.isFinite(limit)) return null; // 무제한
  const used = await getMonthlyQuotaUsed(tenantId);
  if (used >= limit) {
    return NextResponse.json(
      { error: { code: 'QUOTA_EXCEEDED', message: `이번 달 무료 분석 한도(${limit}회)를 모두 사용했습니다. 기출분석 이용권을 충전하거나 플랜을 업그레이드하세요.` } },
      { status: 403 },
    );
  }
  return null;
}

/**
 * 분석 실행 통합 게이트 — 분석 주체는 지점 선생님(학생 연결은 선택).
 * 1) 재분석(이미 차감) → 통과.
 * 2) 지점 풀에 사용 가능 크레딧 ≥ 1 → 통과 (consume 가 풀에서 1 차감).
 * 3) 풀이 비면 → 무료 월 한도(플랜) 폴백.
 * quotaTenantId: 라우트의 user.viewingTenantId ?? user.tenantId (풀/한도 판정 테넌트).
 * 실패=NextResponse 403, 통과=null. 일시 오류는 fail-open(분석 흐름 보호).
 */
export async function assertAnalysisGate(
  examPaper: { id: string; tenantId: string; studentId: string | null },
  quotaTenantId: string | null | undefined,
): Promise<NextResponse | null> {
  const tenantId = examPaper.tenantId;
  try {
    if (await alreadyConsumed(examPaper.id)) return null; // 재분석 — 이미 차감
    if ((await poolUsableBalance(tenantId)) >= 1) return null; // 지점 풀에서 차감 예정
  } catch (e) {
    console.error('[gate] 풀 확인 실패 — fail-open:', e);
    return null;
  }
  return assertAnalysisQuota(quotaTenantId ?? tenantId); // 무료 월 한도 폴백
}

/** 기능 사용 가능 여부. 불가 → 403(FEATURE_LOCKED), 가능 → null. */
export async function assertPlanFeature(tenantId: string | null | undefined, feature: PlanFeature): Promise<NextResponse | null> {
  if (!tenantId) return null;
  const plan = await getTenantPlan(tenantId);
  if (getPlanConfig(plan)[feature]) return null;
  return NextResponse.json(
    { error: { code: 'FEATURE_LOCKED', message: `${FEATURE_LABELS[feature]} 기능은 상위 플랜에서 사용할 수 있습니다.` } },
    { status: 403 },
  );
}
