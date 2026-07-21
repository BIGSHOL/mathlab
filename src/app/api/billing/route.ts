import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, hasRole } from '@/lib/api';
import { getPlanConfig } from '@/lib/billing/plans';
import { getTenantPlan, getMonthlyQuotaUsed, monthBounds, isBetaAllPro } from '@/lib/billing/guard';
import { poolUsableBalance } from '@/lib/entitlements/service';
import { isLemonSqueezyConfigured } from '@/lib/billing/lemonsqueezy';
import { getDemoContext, countDemoUsage } from '@/lib/demo/accounts';

export const dynamic = 'force-dynamic';

/**
 * GET /api/billing — 현재 테넌트 구독 상태 + 이번 달 사용량.
 * 플랜은 **지점(Tenant) 단위 단일 구독**이라 그 지점 강사 전원이 동일 플랜을 공유한다
 * (강사별 플랜/권한 배정은 존재하지 않음). 따라서 강사도 소속 지점의 plan/features/usage를
 * 읽을 수 있어야 클라이언트 게이트(SubscriptionProvider)가 서버 가드(assertPlanFeature)와 일치한다.
 * 과거 OWNER+ 전용이던 시절, 강사는 403 → 프로바이더가 FREE_FALLBACK으로 떨어져 Pro 지점인데도
 * AI 총평·주변학교 비교가 잠기는 오잠금이 있었다 (서버는 허용하는데 UI만 잠김).
 *
 * 다만 **결제 관련 필드는 여전히 OWNER+ 전용** — 결제 실행(checkout/portal)은 requireOwner로 별도 차단.
 */
export async function GET() {
  const user = await requireTeacher();
  if (isResponse(user)) return user;
  const demoCtx = await getDemoContext(user);
  // 결제 정보 노출/관리 권한 (구독·결제는 지점 관리자 전용). 데모 계정은 체험 업그레이드 UI가 필요해 포함.
  const canManageBilling = hasRole(user, 'OWNER') || demoCtx.isDemo;

  const tenantId = user.viewingTenantId ?? user.tenantId;
  const { nextMonthStart } = monthBounds();
  const resetAt = nextMonthStart.toISOString();
  // 결제 필드는 비-OWNER에게 미노출 (undefined → 프로바이더가 false로 취급)
  const configured = canManageBilling ? isLemonSqueezyConfigured() : undefined;
  // 키 미설정이어도 데모 업그레이드 허용 시 클라이언트가 [데모 업그레이드] 버튼 활성화 (게이팅 테스트용)
  const allowDemoUpgrade = canManageBilling ? process.env.ALLOW_DEMO_UPGRADE === '1' : undefined;

  // SUPER_ADMIN 무테넌트(view-as 안 함) — 단일 지점 없음 → 게이팅 면제.
  // 서버 가드(assert*)도 tenantId 없으면 null(면제) 반환하므로, 클라이언트도 전 기능 해금 + 무제한으로
  // 맞춰 "서버는 허용하는데 UI만 잠기는" 불일치를 방지한다 (관리자 본인 작업 차단 방지).
  if (!tenantId) {
    return NextResponse.json({
      data: {
        plan: 'free',
        status: 'inactive',
        usage: { used: 0, limit: null, resetAt, poolBalance: 0 }, // 무제한
        features: { commentary: true, nearby: true }, // 전 기능 해금 (서버 면제와 일치)
        lemonSqueezyConfigured: configured,
        allowDemoUpgrade,
        beta: isBetaAllPro(),
        currentPeriodEnd: null,
        noTenant: true,
        exempt: true,
        demo: null,
      },
    });
  }

  const sub = await prisma.tenantSubscription.findUnique({ where: { tenantId } });
  const plan = await getTenantPlan(tenantId); // 만료 강등 반영
  const cfg = getPlanConfig(plan);
  // used = 이번 달 "무료 한도(quota)로 처리된" 분석 수. 지점 풀(이용권)에서 차감된 분석은 미포함.
  const used = await getMonthlyQuotaUsed(tenantId);
  const poolBalance = await poolUsableBalance(tenantId, 'EXAM_ANALYSIS'); // 이용권 잔여(만료 제외)
  const limit = Number.isFinite(cfg.monthlyAnalyses) ? cfg.monthlyAnalyses : null; // Infinity → null(무제한)

  // 데모 계정: 잔여 체험 횟수 + 계정별 권한을 클라이언트에 노출 → 사전 차단·버튼 비활성·안내에 사용.
  let demo: {
    isDemo: true; limit: number; used: number; remaining: number;
    perms: { analyze: boolean; commentary: boolean; blog: boolean };
  } | null = null;
  if (demoCtx.isDemo) {
    const demoUsed = await countDemoUsage(user.id);
    demo = {
      isDemo: true,
      limit: demoCtx.limit,
      used: demoUsed,
      remaining: Math.max(0, demoCtx.limit - demoUsed),
      perms: demoCtx.perms,
    };
  }

  return NextResponse.json({
    data: {
      plan,
      status: sub?.status ?? 'inactive',
      usage: { used, limit, resetAt, poolBalance },
      // 데모 계정은 계정별 '총평' 권한을 반영(클라이언트 UI 잠금/해제). 그 외는 플랜 기준.
      features: {
        commentary: demoCtx.isDemo ? demoCtx.perms.commentary : cfg.commentary,
        nearby: cfg.nearby,
      },
      lemonSqueezyConfigured: configured,
      allowDemoUpgrade,
      beta: isBetaAllPro(),
      currentPeriodEnd: canManageBilling ? (sub?.currentPeriodEnd?.toISOString() ?? null) : undefined,
      demo,
    },
  });
}
