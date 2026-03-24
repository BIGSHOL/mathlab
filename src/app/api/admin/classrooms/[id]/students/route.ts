import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOwner, isResponse, badRequest, notFound, forbidden, getTenantFilter, hasRole } from '@/lib/api';

/** PATCH /api/admin/classrooms/:id/students — 학생 배정 (테넌트 검증) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireOwner();
  if (isResponse(user)) return user;
  const { id } = await params;

  // 반 존재 + 테넌트 소유권 확인
  const classroom = await prisma.classroom.findUnique({ where: { id } });
  if (!classroom) return notFound('반을 찾을 수 없습니다');
  if (!hasRole(user, 'SUPER_ADMIN') && user.tenantId && classroom.tenantId !== user.tenantId) {
    return forbidden('다른 지점의 반에 학생을 배정할 수 없습니다');
  }

  const body = await request.json();
  const { studentIds } = body;
  if (!Array.isArray(studentIds)) return badRequest('studentIds 배열이 필요합니다');

  const tenantFilter = getTenantFilter(user);

  // 기존 학생들 해제 (같은 테넌트 내에서만)
  await prisma.user.updateMany({ where: { classroomId: id }, data: { classroomId: null } });

  // 새 학생들 배정 (같은 테넌트 학생만)
  if (studentIds.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: studentIds }, role: 'STUDENT', ...tenantFilter },
      data: { classroomId: id },
    });
  }

  const updatedClassroom = await prisma.classroom.findUnique({
    where: { id },
    include: { students: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ data: updatedClassroom });
}
