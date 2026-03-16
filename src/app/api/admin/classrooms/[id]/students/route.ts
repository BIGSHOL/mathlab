import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin, isResponse, badRequest } from '@/lib/api';

/** PATCH /api/admin/classrooms/:id/students — 학생 배정 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  const { id } = await params;

  const body = await request.json();
  const { studentIds } = body;
  if (!Array.isArray(studentIds)) return badRequest('studentIds 배열이 필요합니다');

  // 기존 학생들 해제
  await prisma.user.updateMany({ where: { classroomId: id }, data: { classroomId: null } });

  // 새 학생들 배정
  if (studentIds.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: studentIds }, role: 'STUDENT' },
      data: { classroomId: id },
    });
  }

  const classroom = await prisma.classroom.findUnique({
    where: { id },
    include: { students: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ data: classroom });
}
