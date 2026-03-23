import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { requireTeacher, validateBody, isResponse, conflict, hasRole, getStudentScope, getTenantFilter } from '@/lib/api';
import { createUserSchema } from '@/lib/schemas/auth';

// GET /api/users - List students (역할 기반 스코핑)
export async function GET() {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  // OWNER 이상: 자기 테넌트 전체 사용자 (선생님 포함), TEACHER: 담당 반 학생만
  const isOwnerOrAbove = hasRole(user, 'OWNER');
  const tenantFilter = getTenantFilter(user);
  const where = isOwnerOrAbove
    ? { deletedAt: null, ...tenantFilter }
    : await getStudentScope(user);

  const users = await prisma.user.findMany({
    where,
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
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const parsed = await validateBody(request, createUserSchema);
  if (isResponse(parsed)) return parsed;

  const existing = await prisma.user.findUnique({ where: { username: parsed.username } });
  if (existing) return conflict('이미 사용 중인 아이디입니다');

  const passwordHash = await bcrypt.hash(parsed.password, 10);

  const created = await prisma.user.create({
    data: {
      username: parsed.username,
      passwordHash,
      name: parsed.name,
      role: 'STUDENT',
      grade: parsed.grade,
      phone: parsed.phone || undefined,
      email: parsed.email || undefined,
      school: parsed.school || undefined,
      address: parsed.address || undefined,
      notes: parsed.notes || undefined,
      parentName: parsed.parentName || undefined,
      parentPhone: parsed.parentPhone || undefined,
      birthDate: parsed.birthDate ? new Date(parsed.birthDate) : undefined,
      startDate: parsed.startDate ? new Date(parsed.startDate) : undefined,
      tenantId: user.tenantId || undefined,
      profile: { create: {} },
    },
    select: { id: true, seq: true, username: true, name: true, role: true, grade: true },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
