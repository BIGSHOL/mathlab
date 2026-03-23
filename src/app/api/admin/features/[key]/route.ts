import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin, isResponse, notFound, badRequest, hasRole } from '@/lib/api';

/** PATCH /api/admin/features/:key — Feature Flag 토글 (지점별 오버라이드 지원) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;

  const { key } = await params;
  const body = await request.json();
  if (typeof body.enabled !== 'boolean') {
    return badRequest('enabled (boolean) 필드가 필요합니다');
  }

  // SUPER_ADMIN 또는 tenantId 없는 사용자: 글로벌 플래그 토글
  if (hasRole(user, 'SUPER_ADMIN') || !user.tenantId) {
    const flag = await prisma.featureFlag.findFirst({ where: { key, tenantId: null } });
    if (!flag) return notFound('기능 플래그를 찾을 수 없습니다');

    const updated = await prisma.featureFlag.update({
      where: { id: flag.id },
      data: { enabled: body.enabled },
    });
    return NextResponse.json({ data: updated });
  }

  // 지점 관리자: 지점 전용 오버라이드 생성/업데이트
  const tenantFlag = await prisma.featureFlag.findFirst({
    where: { key, tenantId: user.tenantId },
  });

  if (tenantFlag) {
    const updated = await prisma.featureFlag.update({
      where: { id: tenantFlag.id },
      data: { enabled: body.enabled },
    });
    return NextResponse.json({ data: updated });
  }

  // 지점 전용 레코드가 없으면 → 글로벌에서 label 가져와서 새로 생성
  const globalFlag = await prisma.featureFlag.findFirst({ where: { key, tenantId: null } });
  if (!globalFlag) return notFound('기능 플래그를 찾을 수 없습니다');

  const created = await prisma.featureFlag.create({
    data: {
      key,
      label: globalFlag.label,
      enabled: body.enabled,
      tenantId: user.tenantId,
    },
  });
  return NextResponse.json({ data: created });
}
