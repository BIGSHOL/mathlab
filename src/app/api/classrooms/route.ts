import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, hasRole, getTenantFilter } from '@/lib/api';

/** GET /api/classrooms — 반 목록 (TEACHER+, 역할 기반 스코핑) */
export async function GET() {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const isManagerOrAbove = hasRole(user, 'MANAGER');

  const where = isManagerOrAbove
    ? { ...getTenantFilter(user) }
    : { teacherId: user.id, ...getTenantFilter(user) };

  const classrooms = await prisma.classroom.findMany({
    where,
    include: {
      students: {
        where: { deletedAt: null },
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
