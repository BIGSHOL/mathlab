/**
 * 구독 게이팅 헬퍼 (서버 전용).
 * - getTenantPlan: 유효 플랜 (행 없음/만료 → free)
 * - assertAnalysisGate: 분석 실행 통합 게이트 — 학생 시험지=크레딧, 블랭크=월 쿼터 (둘 중 하나만)
 * - assertAnalysisQuota / assertPlanFeature: NextResponse(403) 또는 null 반환
 *   → 라우트에서 `const gate = await assert...(); if (gate) return gate;` 패턴.
 * tenantId 없음(SUPER_ADMIN 무테넌트 등) → 면제(null).
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { assertExamAnalysisCredit } from '@/lib/entitlements/service';
import { getPlanConfig, PLAN_RANK, BETA_PLAN, type PlanId, type PlanFeature } from './plans';

/** 베타 기간 여부 (서버 env). true면 전 테넌트 최소 BETA_PLAN으로 승격. */
export function isBetaAllPro(): boolean {
  return process.env.BETA_ALL_PRO === '1';
}

/** UTC 이번 달 / 다음 달 경계 */
export function monthBounds(now = new Date()) {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { monthStart, nextMonthStart };
}

/**
 * 유효 플랜. 행 없음 → free. 만료(currentPeriodEnd 과거 && status≠active) → free.
 * 베타(BETA_ALL_PRO=1): 산출된 플랜이 BETA_PLAN보다 낮으면 BETA_PLAN으로 승격(상위 플랜은 유지 — floor).
 */
export async function getTenantPlan(tenantId: string | null | undefined): Promise<PlanId> {
  const base = await resolveBasePlan(tenantId);
  if (isBetaAllPro() && PLAN_RANK[base] < PLAN_RANK[BETA_PLAN]) return BETA_PLAN;
  return base;
}

/** 베타 보정 전 실제(구독 기반) 플랜. */
async function resolveBasePlan(tenantId: string | null | undefined): Promise<PlanId> {
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
 * 이번 달 완료 분석 수 (테넌트 단위) — 쿼터 대상인 블랭크/템플릿 분석만 집계.
 * 학생 연결 시험지(studentId 있음)는 크레딧으로 게이팅되므로 월 쿼터에서 제외 —
 * 크레딧 분석이 블랭크 한도를 잠식하지 않는다.
 * excludeExamPaperId: 재분석 시 현재 시험지 제외.
 */
export async function getMonthlyAnalysisCount(tenantId: string, excludeExamPaperId?: string): Promise<number> {
  const { monthStart, nextMonthStart } = monthBounds();
  return prisma.examAnalysis.count({
    where: {
      examPaper: {
        tenantId,
        studentId: null,
        status: 'COMPLETED',
        ...(excludeExamPaperId ? { id: { not: excludeExamPaperId } } : {}),
      },
      createdAt: { gte: monthStart, lt: nextMonthStart },
    },
  });
}

const FEATURE_LABELS: Record<PlanFeature, string> = { commentary: 'AI 총평', nearby: '주변학교 비교' };

/**
 * 월 분석 한도 검사 — 블랭크/템플릿 분석 전용 (Gemini 비용 남용 가드).
 * 학생 이용권(크레딧)을 차감하는 분석에는 적용하지 않는다 → assertAnalysisGate 사용.
 * 초과 → 403(QUOTA_EXCEEDED), 통과 → null.
 */
export async function assertAnalysisQuota(tenantId: string | null | undefined, excludeExamPaperId?: string): Promise<NextResponse | null> {
  if (!tenantId) return null;
  const plan = await getTenantPlan(tenantId);
  const limit = getPlanConfig(plan).monthlyAnalyses;
  if (!Number.isFinite(limit)) return null; // 무제한
  const used = await getMonthlyAnalysisCount(tenantId, excludeExamPaperId);
  if (used >= limit) {
    return NextResponse.json(
      { error: { code: 'QUOTA_EXCEEDED', message: `이번 달 분석 한도(${limit}회)를 모두 사용했습니다. 플랜을 업그레이드하면 더 분석할 수 있습니다. 학생 이용권으로 진행하는 분석은 이 한도에 포함되지 않습니다.` } },
      { status: 403 },
    );
  }
  return null;
}

/**
 * 분석 실행 통합 게이트 — 시험지당 정확히 하나의 게이트만 적용 (AND 게이트 아님):
 * - 학생 연결 시험지(studentId 있음, 크레딧 차감) → 학생 이용권 게이트만. 월 쿼터 면제 —
 *   구매한 크레딧(일회성 팩·이월분 포함)을 플랜 쿼터가 막지 않는다.
 * - 블랭크/템플릿(studentId 없음, 크레딧 미차감) → 플랜 월 쿼터만 (Gemini 비용 남용 가드).
 * quotaTenantId: 쿼터 판정용 테넌트 (라우트에서 user.viewingTenantId ?? user.tenantId).
 * 실패=NextResponse 403, 통과=null.
 */
export async function assertAnalysisGate(
  examPaper: { id: string; tenantId: string; studentId: string | null },
  quotaTenantId: string | null | undefined,
): Promise<NextResponse | null> {
  if (examPaper.studentId) return assertExamAnalysisCredit(examPaper);
  return assertAnalysisQuota(quotaTenantId, examPaper.id);
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
