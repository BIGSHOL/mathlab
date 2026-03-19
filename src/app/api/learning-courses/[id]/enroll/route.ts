import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse } from '@/lib/api';
import { z } from 'zod';

type Ctx = { params: Promise<{ id: string }> };

const enrollSchema = z.object({
  studentIds: z.array(z.string()).min(1, '최소 1명의 학생을 선택하세요'),
});

// POST /api/learning-courses/[id]/enroll — 학생 배정
export async function POST(request: NextRequest, { params }: Ctx) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { id } = await params;
  const seq = Number(id);
  const body = await request.json();
  const parsed = enrollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION', message: parsed.error.errors[0]?.message || '입력값 오류' } },
      { status: 400 }
    );
  }

  const { studentIds } = parsed.data;

  // 과정 존재 확인 (seq 또는 id)
  const course = await prisma.learningCourse.findUnique({ where: seq > 0 ? { seq } : { id }, select: { id: true } });
  if (!course) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: '과정을 찾을 수 없습니다' } }, { status: 404 });
  }

  const results = await prisma.$transaction(async (tx) => {
    const created: string[] = [];
    const skipped: string[] = [];

    for (const studentId of studentIds) {
      // 이미 배정된 학생 스킵
      const existing = await tx.learningCourseEnrollment.findUnique({
        where: { courseId_studentId: { courseId: course.id, studentId } },
      });
      if (existing) {
        skipped.push(studentId);
        continue;
      }

      // 학생의 기존 enrollment 수로 sortOrder 결정
      const enrollmentCount = await tx.learningCourseEnrollment.count({
        where: { studentId },
      });

      // 첫 번째 과정이고 다른 ACTIVE가 없으면 ACTIVE
      const hasActive = await tx.learningCourseEnrollment.findFirst({
        where: { studentId, status: 'ACTIVE' },
      });

      const isFirst = enrollmentCount === 0 && !hasActive;

      await tx.learningCourseEnrollment.create({
        data: {
          courseId: course.id,
          studentId,
          sortOrder: enrollmentCount,
          status: isFirst ? 'ACTIVE' : 'LOCKED',
          startedAt: isFirst ? new Date() : null,
        },
      });

      created.push(studentId);
    }

    return { created, skipped };
  });

  return NextResponse.json({
    data: {
      enrolled: results.created.length,
      skipped: results.skipped.length,
    },
  }, { status: 201 });
}
