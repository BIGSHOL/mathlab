import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireOwner, isResponse, notFound, forbidden, hasRole, validateBody } from '@/lib/api';

const classroomSettingsSchema = z.object({
  blankInputMode: z.enum(['chip', 'typing']).optional(),
}).passthrough();

const updateClassroomSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  grade: z.number().int().min(1).max(12).nullable().optional(),
  teacherId: z.string().min(1).nullable().optional(),
  settings: classroomSettingsSchema.optional(),
});

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

  const parsed = await validateBody(request, updateClassroomSchema);
  if (isResponse(parsed)) return parsed;

  const updated = await prisma.classroom.update({
    where: { id },
    data: {
      ...(parsed.name && { name: parsed.name }),
      ...(parsed.grade !== undefined && { grade: parsed.grade }),
      ...(parsed.teacherId !== undefined && { teacherId: parsed.teacherId }),
      ...(parsed.settings !== undefined && { settings: parsed.settings as Prisma.InputJsonValue }),
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
