import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin, isResponse, hasRole } from '@/lib/api';
import { seedFeatureFlags } from '@/lib/utils/features';

/** GET /api/admin/features — Feature Flag 목록 (지점별 오버라이드 병합) */
export async function GET() {
  const user = await requireAdmin();
  if (isResponse(user)) return user;

  await seedFeatureFlags();

  // SUPER_ADMIN: 글로벌 플래그만 표시
  if (hasRole(user, 'SUPER_ADMIN') || !user.tenantId) {
    const flags = await prisma.featureFlag.findMany({
      where: { tenantId: null },
      orderBy: { key: 'asc' },
    });
    return NextResponse.json({
      data: flags.map((f) => ({ ...f, isOverride: false })),
    });
  }

  // 지점 관리자: 글로벌 기본값 + 지점 오버라이드 병합
  const [globalFlags, tenantFlags] = await Promise.all([
    prisma.featureFlag.findMany({ where: { tenantId: null }, orderBy: { key: 'asc' } }),
    prisma.featureFlag.findMany({ where: { tenantId: user.tenantId } }),
  ]);

  const tenantMap = new Map(tenantFlags.map((f) => [f.key, f]));

  const merged = globalFlags.map((g) => {
    const override = tenantMap.get(g.key);
    if (override) {
      return { ...override, label: g.label, isOverride: true };
    }
    return { ...g, isOverride: false };
  });

  return NextResponse.json({ data: merged });
}
