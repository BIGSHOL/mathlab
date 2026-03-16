import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin, isResponse, notFound } from '@/lib/api';

/** PATCH /api/admin/classrooms/:id — 반 수정 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  const { id } = await params;

  const exists = await prisma.classroom.findUnique({ where: { id } });
  if (!exists) return notFound('반을 찾을 수 없습니다');

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

/** DELETE /api/admin/classrooms/:id — 반 삭제 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  const { id } = await params;

  // 학생들의 classroomId를 null로 초기화
  await prisma.user.updateMany({ where: { classroomId: id }, data: { classroomId: null } });
  await prisma.classroom.delete({ where: { id } });

  return NextResponse.json({ data: { id } });
}
