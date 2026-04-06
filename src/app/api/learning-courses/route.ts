import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, getTenantFilter, badRequest } from '@/lib/api';
import { z } from 'zod';

// GET /api/learning-courses — 과정 목록 (선생님용)
export async function GET() {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const tenantWhere = getTenantFilter(user);

  const courses = await prisma.learningCourse.findMany({
    where: { isActive: true, ...tenantWhere },
    include: {
      _count: { select: { concepts: true, enrollments: true } },
      creator: { select: { name: true } },
      enrollments: { select: { student: { select: { id: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    data: courses.map((c) => ({
      id: c.id,
      seq: c.seq,
      title: c.title,
      description: c.description,
      mode: c.mode,
      createdBy: c.createdBy,
      creatorName: c.creator.name,
      conceptCount: c._count.concepts,
      enrollmentCount: c._count.enrollments,
      enrollments: c.enrollments.map((e) => ({ student: { id: e.student.id } })),
      createdAt: c.createdAt,
    })),
  });
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  conceptIds: z.array(z.string()).min(1, '최소 1개 개념을 선택하세요'),
  mode: z.enum(['free', 'sequential']).default('free'),
});

// POST /api/learning-courses — 과정 생성
export async function POST(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.errors[0]?.message || '입력값 오류');
  }

  const { title, description, conceptIds, mode } = parsed.data;

  const course = await prisma.learningCourse.create({
    data: {
      title,
      description,
      mode,
      createdBy: user.id,
      tenantId: user.viewingTenantId ?? user.tenantId,
      concepts: {
        create: conceptIds.map((conceptId, i) => ({
          conceptId,
          sortOrder: i,
        })),
      },
    },
    include: { _count: { select: { concepts: true } } },
  });

  return NextResponse.json({ data: { id: course.id, seq: course.seq, title: course.title } }, { status: 201 });
}
