import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { updateUserSchema } from '@/lib/schemas/auth';

// PATCH /api/users/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== 'TEACHER' && currentUser.role !== 'ADMIN')) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '입력값이 올바르지 않습니다' } },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id, deletedAt: null } });
  if (!user) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '사용자를 찾을 수 없습니다' } },
      { status: 404 }
    );
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name) updateData.name = parsed.data.name;
  if (parsed.data.grade !== undefined) updateData.grade = parsed.data.grade;
  if (parsed.data.password) {
    updateData.passwordHash = await bcrypt.hash(parsed.data.password, 10);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, username: true, name: true, role: true, grade: true },
  });

  return NextResponse.json({ data: updated });
}
