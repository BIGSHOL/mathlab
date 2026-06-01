import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOwner, isResponse, badRequest } from '@/lib/api';

/** PATCH /api/users/[id] — OWNER 이상이 같은 테넌트 사용자 이름 수정 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : null;
  if (!name) return badRequest('name은 필수입니다');

  const target = await prisma.user.findUnique({
    where: { id },
    select: { tenantId: true },
  });
  if (!target) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '사용자를 찾을 수 없습니다' } },
      { status: 404 }
    );
  }

  // SUPER_ADMIN이 아니라면 같은 테넌트 소속인지 확인
  if (user.role !== 'SUPER_ADMIN' && target.tenantId !== user.tenantId) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '접근 권한이 없습니다' } },
      { status: 403 }
    );
  }

  await prisma.user.update({ where: { id }, data: { name } });
  return NextResponse.json({ data: { ok: true } });
}
