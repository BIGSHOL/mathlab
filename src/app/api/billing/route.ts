import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOwner, isResponse } from '@/lib/api';
import { getPlanConfig } from '@/lib/billing/plans';
import { getTenantPlan, getMonthlyAnalysisCount, monthBounds, isBetaAllPro } from '@/lib/billing/guard';
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
  // 키 미설정이어도 데모 업그레이드 허용 시 클라이언트가 [데모 업그레이드] 버튼 활성화 (게이팅 테스트용)
  const allowDemoUpgrade = process.env.ALLOW_DEMO_UPGRADE === '1';

  // SUPER_ADMIN 무테넌트(view-as 안 함) — 단일 지점 없음 → 게이팅 면제.
  // 서버 가드(assert*)도 tenantId 없으면 null(면제) 반환하므로, 클라이언트도 전 기능 해금 + 무제한으로
  // 맞춰 "서버는 허용하는데 UI만 잠기는" 불일치를 방지한다 (관리자 본인 작업 차단 방지).
  if (!tenantId) {
    return NextResponse.json({
      data: {
        plan: 'free',
        status: 'inactive',
        usage: { used: 0, limit: null, resetAt }, // 무제한
        features: { commentary: true, nearby: true }, // 전 기능 해금 (서버 면제와 일치)
        lemonSqueezyConfigured: configured,
        allowDemoUpgrade,
        beta: isBetaAllPro(),
        currentPeriodEnd: null,
        noTenant: true,
        exempt: true,
      },
    });
  }

  const sub = await prisma.tenantSubscription.findUnique({ where: { tenantId } });
  const plan = await getTenantPlan(tenantId); // 만료 강등 반영
  const cfg = getPlanConfig(plan);
  // 쿼터 대상(블랭크/템플릿) 분석만 집계 — 학생 이용권 차감 분석은 쿼터 면제라 사용량에 포함 안 함
  const used = await getMonthlyAnalysisCount(tenantId);
  const limit = Number.isFinite(cfg.monthlyAnalyses) ? cfg.monthlyAnalyses : null; // Infinity → null(무제한)

  return NextResponse.json({
    data: {
      plan,
      status: sub?.status ?? 'inactive',
      usage: { used, limit, resetAt },
      features: { commentary: cfg.commentary, nearby: cfg.nearby },
      lemonSqueezyConfigured: configured,
      allowDemoUpgrade,
      beta: isBetaAllPro(),
      currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
    },
  });
}
