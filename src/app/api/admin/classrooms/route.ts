import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin, isResponse, badRequest } from '@/lib/api';

/** GET /api/admin/classrooms — 반 목록 */
export async function GET() {
  const user = await requireAdmin();
  if (isResponse(user)) return user;

  const classrooms = await prisma.classroom.findMany({
    include: { students: { select: { id: true, name: true, grade: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ data: classrooms });
}

/** POST /api/admin/classrooms — 반 생성 */
export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;

  const body = await request.json();
  const { name, grade } = body;
  if (!name || typeof name !== 'string') return badRequest('반 이름이 필요합니다');

  const classroom = await prisma.classroom.create({
    data: { name, grade: grade ?? null, teacherId: user.id },
  });

  return NextResponse.json({ data: classroom });
}
