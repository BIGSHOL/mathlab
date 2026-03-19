import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin, isResponse } from '@/lib/api';

/**
 * GET /api/admin/tenants/[id] — 지점 상세 (SUPER_ADMIN 전용)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const { id } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          users: { where: { deletedAt: null } },
          classrooms: true,
        },
      },
    },
  });

  if (!tenant) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '지점을 찾을 수 없습니다' } },
      { status: 404 }
    );
  }

  // 역할별 사용자 수
  const roleCounts = await prisma.user.groupBy({
    by: ['role'],
    where: { tenantId: id, deletedAt: null },
    _count: true,
  });

  return NextResponse.json({
    data: {
      ...tenant,
      roleCounts: roleCounts.reduce(
        (acc, r) => ({ ...acc, [r.role]: r._count }),
        {} as Record<string, number>
      ),
    },
  });
}

/**
 * PATCH /api/admin/tenants/[id] — 지점 수정 (SUPER_ADMIN 전용)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const { id } = await params;
  const body = await request.json();
  const { name, logo, isActive, settings } = body;

  const tenant = await prisma.tenant.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(logo !== undefined && { logo }),
      ...(isActive !== undefined && { isActive }),
      ...(settings !== undefined && { settings }),
    },
  });

  return NextResponse.json({ data: tenant });
}

/**
 * DELETE /api/admin/tenants/[id] — 지점 비활성화 (SUPER_ADMIN 전용, 소프트 삭제)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const { id } = await params;

  // default 테넌트는 삭제 불가
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (tenant?.slug === 'default') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '기본 지점은 삭제할 수 없습니다' } },
      { status: 403 }
    );
  }

  await prisma.tenant.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ data: { success: true } });
}
