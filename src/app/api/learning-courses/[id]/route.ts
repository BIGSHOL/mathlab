import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse } from '@/lib/api';
import { z } from 'zod';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/learning-courses/[id] — 과정 상세 (개념 + 학생별 진행률)
export async function GET(_req: NextRequest, { params }: Ctx) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { id } = await params;
  const seq = Number(id);

  const course = await prisma.learningCourse.findUnique({
    where: seq > 0 ? { seq } : { id },
    include: {
      concepts: {
        orderBy: { sortOrder: 'asc' },
        include: {
          concept: { select: { id: true, title: true, conceptCode: true, grade: true, chapter: true, section: true } },
        },
      },
      enrollments: {
        include: {
          student: { select: { id: true, name: true, grade: true, username: true } },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!course) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: '과정을 찾을 수 없습니다' } }, { status: 404 });
  }

  // 학생별 진행률 계산
  const conceptIds = course.concepts.map((c) => c.conceptId);
  const totalConcepts = conceptIds.length;

  const enrollmentsWithProgress = await Promise.all(
    course.enrollments.map(async (enrollment) => {
      const completedCount = totalConcepts > 0
        ? await prisma.learningProgress.count({
            where: {
              userId: enrollment.studentId,
              conceptId: { in: conceptIds },
              stage: 'BLANK_FULL',
              completed: true,
            },
          })
        : 0;

      return {
        id: enrollment.id,
        student: enrollment.student,
        sortOrder: enrollment.sortOrder,
        status: enrollment.status,
        startedAt: enrollment.startedAt,
        completedAt: enrollment.completedAt,
        completedConcepts: completedCount,
        totalConcepts,
        progressPercent: totalConcepts > 0 ? Math.round((completedCount / totalConcepts) * 100) : 0,
      };
    })
  );

  return NextResponse.json({
    data: {
      id: course.id,
      seq: course.seq,
      title: course.title,
      description: course.description,
      isActive: course.isActive,
      createdAt: course.createdAt,
      concepts: course.concepts.map((c) => ({
        ...c.concept,
        coursConceptId: c.id,
        sortOrder: c.sortOrder,
      })),
      enrollments: enrollmentsWithProgress,
    },
  });
}

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  conceptIds: z.array(z.string()).min(1).optional(),
  isActive: z.boolean().optional(),
  removeEnrollmentId: z.string().optional(),
});

// PATCH /api/learning-courses/[id] — 과정 수정
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { id } = await params;
  const seq = Number(id);
  const where = seq > 0 ? { seq } : { id };

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION', message: parsed.error.errors[0]?.message || '입력값 오류' } },
      { status: 400 }
    );
  }

  const { title, description, conceptIds, isActive, removeEnrollmentId } = parsed.data;

  // 학생 배정 삭제
  if (removeEnrollmentId) {
    await prisma.learningCourseEnrollment.delete({ where: { id: removeEnrollmentId } });
    return NextResponse.json({ data: { removed: true } });
  }

  // seq로 조회 시 실제 id를 먼저 가져옴
  const existing = await prisma.learningCourse.findUnique({ where, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: '과정을 찾을 수 없습니다' } }, { status: 404 });
  }
  const courseId = existing.id;

  const updated = await prisma.$transaction(async (tx) => {
    const course = await tx.learningCourse.update({
      where: { id: courseId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    if (conceptIds) {
      await tx.learningCourseConcept.deleteMany({ where: { courseId } });
      await tx.learningCourseConcept.createMany({
        data: conceptIds.map((conceptId, i) => ({
          courseId,
          conceptId,
          sortOrder: i,
        })),
      });
    }

    return course;
  });

  return NextResponse.json({ data: { id: updated.id, title: updated.title } });
}

// DELETE /api/learning-courses/[id] — 과정 삭제
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { id } = await params;
  const seq = Number(id);

  await prisma.learningCourse.delete({ where: seq > 0 ? { seq } : { id } });

  return NextResponse.json({ data: { deleted: true } });
}
