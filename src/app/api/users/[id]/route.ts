import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { requireOwner, requireTeacher, isResponse, validateBody, requireResource, hasRole } from '@/lib/api';
import { updateUserSchema } from '@/lib/schemas/auth';

// PATCH /api/users/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const parsed = await validateBody(request, updateUserSchema);
  if (isResponse(parsed)) return parsed;

  const targetUser = await requireResource(
    () => prisma.user.findUnique({ where: { id, deletedAt: null } }),
    '사용자를 찾을 수 없습니다'
  );
  if (isResponse(targetUser)) return targetUser;

  const updateData: Record<string, unknown> = {};
  if (parsed.name) updateData.name = parsed.name;
  if (parsed.grade !== undefined) updateData.grade = parsed.grade;
  if (parsed.password) {
    updateData.passwordHash = await bcrypt.hash(parsed.password, 10);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, username: true, name: true, role: true, grade: true },
  });

  return NextResponse.json({ data: updated });
}

// DELETE /api/users/:id (OWNER+ only, soft-delete)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const targetUser = await requireResource(
    () => prisma.user.findUnique({ where: { id, deletedAt: null }, select: { id: true, role: true } }),
    '사용자를 찾을 수 없습니다'
  );
  if (isResponse(targetUser)) return targetUser;

  // OWNER 이상은 삭제 불가 (자기보다 높은 역할 보호)
  if (hasRole(targetUser, 'OWNER')) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '해당 사용자를 삭제할 수 없습니다.' } },
      { status: 403 }
    );
  }

  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ data: { success: true } });
}
