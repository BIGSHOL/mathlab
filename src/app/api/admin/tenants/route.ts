import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin, isResponse, badRequest } from '@/lib/api';
import { getPlanConfig, isPlanId } from '@/lib/billing/plans';
import { isBetaAllPro } from '@/lib/billing/guard';

/**
 * 지점(Tenant) 관리 — 기출분석 전용 앱용 간소화 버전.
 * 기본 CRUD + 지점별 구독(플랜) 조회/배정.
 */

// GET — 지점 목록 + 사용자 수 + 구독 플랜/상태
export async function GET() {
  const auth = await requireSuperAdmin();
  if (isResponse(auth)) return auth;

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true, slug: true, name: true, logo: true, isActive: true, createdAt: true,
      _count: { select: { users: true } },
      subscription: { select: { plan: true, status: true, currentPeriodEnd: true, lsSubscriptionId: true } },
    },
  });
  return NextResponse.json({
    data: tenants.map((t) => {
      const sub = t.subscription;
      // 저장된(실제 배정) 플랜 — 베타 floor 적용 전. 행 없으면 free.
      const storedPlan = getPlanConfig(sub?.plan).id;
      return {
        id: t.id, slug: t.slug, name: t.name, logo: t.logo,
        isActive: t.isActive, createdAt: t.createdAt, userCount: t._count.users,
        plan: storedPlan,
        subStatus: sub?.status ?? null,
        currentPeriodEnd: sub?.currentPeriodEnd ?? null,
        managedByLs: !!sub?.lsSubscriptionId, // LS 결제로 생성된 구독이면 수동 변경 주의
      };
    }),
    meta: { betaAllPro: isBetaAllPro() }, // 베타면 전 지점 최소 Pro로 동작 중
  });
}

// POST — 지점 생성
export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (isResponse(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? '').trim();
  const slug = String(body?.slug ?? '').trim().toLowerCase();
  if (!name || !slug) return badRequest('지점명(name)과 slug는 필수입니다');
  if (!/^[a-z0-9-]+$/.test(slug)) return badRequest('slug는 영소문자/숫자/하이픈만 가능합니다');
  if (await prisma.tenant.findUnique({ where: { slug } })) return badRequest('이미 존재하는 slug입니다');

  const t = await prisma.tenant.create({ data: { name, slug, logo: body?.logo || null } });
  return NextResponse.json({ data: t });
}

// PATCH — 지점 수정 (name / logo / isActive / plan 배정)
export async function PATCH(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (isResponse(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? '');
  if (!id) return badRequest('id는 필수입니다');

  // 구독 플랜 수동 배정 (SUPER_ADMIN) — TenantSubscription upsert.
  // free면 status=inactive, 유료면 active + 만료 없음(currentPeriodEnd=null). LS 결제 구독과 별개의 수동 배정.
  if (body.plan !== undefined) {
    if (!isPlanId(body.plan)) return badRequest('유효한 플랜이 아닙니다 (free|basic|pro|enterprise)');
    const plan = body.plan as string;
    const isFree = plan === 'free';
    await prisma.tenantSubscription.upsert({
      where: { tenantId: id },
      create: {
        tenantId: id,
        plan,
        status: isFree ? 'inactive' : 'active',
        currentPeriodEnd: null,
      },
      update: {
        plan,
        status: isFree ? 'inactive' : 'active',
        currentPeriodEnd: null,
      },
    });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.name === 'string') data.name = body.name.trim();
  if (typeof body.logo === 'string' || body.logo === null) data.logo = body.logo || null;
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

  // tenant 자체 필드 변경이 있을 때만 update (plan만 바꾼 경우 skip)
  const t = Object.keys(data).length > 0
    ? await prisma.tenant.update({ where: { id }, data })
    : await prisma.tenant.findUnique({ where: { id } });
  return NextResponse.json({ data: t });
}
