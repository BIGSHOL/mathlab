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

  // teacherId → teacher name 해결 (Classroom에 teacher relation 없음)
  const teacherIds = [...new Set(classrooms.map((c) => c.teacherId).filter(Boolean))] as string[];
  const teachers = teacherIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: teacherIds } }, select: { id: true, name: true } })
    : [];
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));

  const data = classrooms.map((c) => ({
    ...c,
    teacher: c.teacherId ? teacherMap.get(c.teacherId) ?? null : null,
  }));

  return NextResponse.json({ data });
}

/** POST /api/admin/classrooms — 반 생성 (테넌트 자동 연결) */
export async function POST(request: NextRequest) {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const body = await request.json();
  const { name, grade, teacherId } = body;
  if (!name || typeof name !== 'string') return badRequest('반 이름이 필요합니다');

  const effectiveTenantId = user.viewingTenantId ?? user.tenantId;
  const classroom = await prisma.classroom.create({
    data: { name, grade: grade ?? null, teacherId: teacherId || user.id, tenantId: effectiveTenantId || undefined },
  });

  return NextResponse.json({ data: classroom });
}
