import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createUserSchema } from '@/lib/schemas/auth';

// GET /api/users - List students
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      seq: true,
      username: true,
      name: true,
      role: true,
      grade: true,
      createdAt: true,
      profile: {
        select: { totalXp: true, level: true, currentStreak: true, longestStreak: true, lastActiveAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    data: users,
    meta: { total: users.length },
  });
}

// POST /api/users - Create student account
export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== 'TEACHER' && currentUser.role !== 'ADMIN')) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '선생님 권한이 필요합니다' } },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: '입력값이 올바르지 않습니다',
          details: parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        },
      },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { username: parsed.data.username } });
  if (existing) {
    return NextResponse.json(
      { error: { code: 'CONFLICT', message: '이미 사용 중인 아이디입니다' } },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const user = await prisma.user.create({
    data: {
      username: parsed.data.username,
      passwordHash,
      name: parsed.data.name,
      role: 'STUDENT',
      grade: parsed.data.grade,
      profile: { create: {} },
    },
    select: { id: true, seq: true, username: true, name: true, role: true, grade: true },
  });

  return NextResponse.json({ data: user }, { status: 201 });
}
