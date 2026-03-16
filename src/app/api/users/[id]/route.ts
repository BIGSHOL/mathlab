import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, validateBody, requireResource } from '@/lib/api';
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
