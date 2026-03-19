import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { requireTeacher, validateBody, isResponse, conflict } from '@/lib/api';
import { createUserSchema } from '@/lib/schemas/auth';

// GET /api/users - List students
export async function GET() {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

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
      profile: { create: {} },
    },
    select: { id: true, seq: true, username: true, name: true, role: true, grade: true },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
