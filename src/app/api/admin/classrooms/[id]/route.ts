import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOwner, isResponse, notFound, forbidden, hasRole } from '@/lib/api';

/** 테넌트 소유권 검증 후 반 조회 */
async function findClassroomWithTenantCheck(id: string, user: { tenantId: string | null; role: string }) {
  const classroom = await prisma.classroom.findUnique({ where: { id } });
  if (!classroom) return null;

  // SUPER_ADMIN은 모든 반 접근 가능, 나머지는 자기 테넌트만
  if (!hasRole(user, 'SUPER_ADMIN') && user.tenantId && classroom.tenantId !== user.tenantId) {
    return 'FORBIDDEN' as const;
  }
  return classroom;
}

/** PATCH /api/admin/classrooms/:id — 반 수정 (테넌트 검증) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireOwner();
  if (isResponse(user)) return user;
  const { id } = await params;

  const result = await findClassroomWithTenantCheck(id, user);
  if (!result) return notFound('반을 찾을 수 없습니다');
  if (result === 'FORBIDDEN') return forbidden('다른 지점의 반은 수정할 수 없습니다');

  const body = await request.json();
  const updated = await prisma.classroom.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.grade !== undefined && { grade: body.grade }),
    },
  });

  return NextResponse.json({ data: updated });
}

/** DELETE /api/admin/classrooms/:id — 반 삭제 (테넌트 검증) */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireOwner();
  if (isResponse(user)) return user;
  const { id } = await params;

  const result = await findClassroomWithTenantCheck(id, user);
  if (!result) return notFound('반을 찾을 수 없습니다');
  if (result === 'FORBIDDEN') return forbidden('다른 지점의 반은 삭제할 수 없습니다');

  // 학생들의 classroomId를 null로 초기화
  await prisma.user.updateMany({ where: { classroomId: id }, data: { classroomId: null } });
  await prisma.classroom.delete({ where: { id } });

  return NextResponse.json({ data: { id } });
}
