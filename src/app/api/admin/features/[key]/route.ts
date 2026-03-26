import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOwner, isResponse, notFound, badRequest } from '@/lib/api';

/** PATCH /api/admin/features/:key — Feature Flag 토글 (지점별 오버라이드 지원) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const { key } = await params;
  const body = await request.json();
  if (typeof body.enabled !== 'boolean') {
    return badRequest('enabled (boolean) 필드가 필요합니다');
  }

  // SUPER_ADMIN은 쿼리 파라미터로 지점 지정 가능
  const queryTenantId = request.nextUrl.searchParams.get('tenantId');
  const effectiveTenantId = (user.role === 'SUPER_ADMIN' && queryTenantId)
    ? queryTenantId
    : (user.tenantId || user.viewingTenantId);

  // 글로벌 플래그 토글 (SA, 지점장 뷰 아닐 때)
  if (!effectiveTenantId) {
    const flag = await prisma.featureFlag.findFirst({ where: { key, tenantId: null } });
    if (!flag) return notFound('기능 플래그를 찾을 수 없습니다');

    const updated = await prisma.featureFlag.update({
      where: { id: flag.id },
      data: { enabled: body.enabled },
    });
    return NextResponse.json({ data: updated });
  }

  // 지점 관리자 (또는 SA 지점장 뷰): 지점 전용 오버라이드 생성/업데이트
  const tenantFlag = await prisma.featureFlag.findFirst({
    where: { key, tenantId: effectiveTenantId },
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
      tenantId: effectiveTenantId,
    },
  });
  return NextResponse.json({ data: created });
}

/** DELETE /api/admin/features/:key — 지점 오버라이드 삭제 (글로벌 기본값으로 되돌리기) */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const { key } = await params;
  const queryTenantId = request.nextUrl.searchParams.get('tenantId');
  const effectiveTenantId = (user.role === 'SUPER_ADMIN' && queryTenantId)
    ? queryTenantId
    : (user.tenantId || user.viewingTenantId);

  if (!effectiveTenantId) {
    return badRequest('글로벌 플래그는 삭제할 수 없습니다');
  }

  const tenantFlag = await prisma.featureFlag.findFirst({
    where: { key, tenantId: effectiveTenantId },
  });

  if (!tenantFlag) {
    return notFound('지점 오버라이드가 없습니다');
  }

  await prisma.featureFlag.delete({ where: { id: tenantFlag.id } });

  return NextResponse.json({ data: { key, reset: true } });
}
