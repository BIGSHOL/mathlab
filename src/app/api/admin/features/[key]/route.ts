import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin, isResponse, notFound, badRequest, getTenantFilter } from '@/lib/api';

/** PATCH /api/admin/features/:key — Feature Flag 토글 */
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

  const tenantWhere = getTenantFilter(user);

  const flag = await prisma.featureFlag.findFirst({ where: { key, ...tenantWhere } });
  if (!flag) return notFound('기능 플래그를 찾을 수 없습니다');

  const updated = await prisma.featureFlag.update({
    where: { id: flag.id },
    data: { enabled: body.enabled },
  });

  return NextResponse.json({ data: updated });
}
