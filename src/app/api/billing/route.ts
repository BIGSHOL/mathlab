import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOwner, isResponse } from '@/lib/api';
import { getPlanConfig } from '@/lib/billing/plans';
import { getTenantPlan, getMonthlyAnalysisCount, monthBounds } from '@/lib/billing/guard';
import { isLemonSqueezyConfigured } from '@/lib/billing/lemonsqueezy';

export const dynamic = 'force-dynamic';

/** GET /api/billing — 현재 테넌트 구독 상태 + 이번 달 사용량 (OWNER+). 미설정/행없음에도 free 기본. */
export async function GET() {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const tenantId = user.viewingTenantId ?? user.tenantId;
  const { nextMonthStart } = monthBounds();
  const resetAt = nextMonthStart.toISOString();
  const configured = isLemonSqueezyConfigured();

  // SUPER_ADMIN 무테넌트(view-as 안 함) — 단일 지점 없음
  if (!tenantId) {
    const free = getPlanConfig('free');
    return NextResponse.json({
      data: {
        plan: 'free',
        status: 'inactive',
        usage: { used: 0, limit: free.monthlyAnalyses, resetAt },
        features: { commentary: free.commentary, nearby: free.nearby },
        lemonSqueezyConfigured: configured,
        currentPeriodEnd: null,
        noTenant: true,
      },
    });
  }

  const sub = await prisma.tenantSubscription.findUnique({ where: { tenantId } });
  const plan = await getTenantPlan(tenantId); // 만료 강등 반영
  const cfg = getPlanConfig(plan);
  const used = await getMonthlyAnalysisCount(tenantId);
  const limit = Number.isFinite(cfg.monthlyAnalyses) ? cfg.monthlyAnalyses : null; // Infinity → null(무제한)

  return NextResponse.json({
    data: {
      plan,
      status: sub?.status ?? 'inactive',
      usage: { used, limit, resetAt },
      features: { commentary: cfg.commentary, nearby: cfg.nearby },
      lemonSqueezyConfigured: configured,
      currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
    },
  });
}
