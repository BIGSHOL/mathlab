import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOwner, isResponse, badRequest, getTenantFilter } from '@/lib/api';

/** GET /api/admin/classrooms — 반 목록 (테넌트 스코핑) */
export async function GET() {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const tenantFilter = getTenantFilter(user);

  const classrooms = await prisma.classroom.findMany({
    where: { ...tenantFilter },
    include: {
      students: {
        select: {
          id: true,
          name: true,
          grade: true,
          profile: { select: { totalXp: true, level: true, lastActiveAt: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ data: classrooms });
}

/** POST /api/admin/classrooms — 반 생성 (테넌트 자동 연결) */
export async function POST(request: NextRequest) {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const body = await request.json();
  const { name, grade } = body;
  if (!name || typeof name !== 'string') return badRequest('반 이름이 필요합니다');

  const classroom = await prisma.classroom.create({
    data: { name, grade: grade ?? null, teacherId: user.id, tenantId: user.tenantId || undefined },
  });

  return NextResponse.json({ data: classroom });
}
