import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, badRequest } from '@/lib/api';
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

  // 학생별 진행률 계산 (배치 쿼리)
  const conceptIds = course.concepts.map((c) => c.conceptId);
  const totalConcepts = conceptIds.length;
  const studentIds = course.enrollments.map((e) => e.studentId);

  const allProgress = totalConcepts > 0 && studentIds.length > 0
    ? await prisma.learningProgress.findMany({
        where: {
          userId: { in: studentIds },
          conceptId: { in: conceptIds },
        },
        select: { userId: true, conceptId: true, stage: true, completed: true },
      })
    : [];

  // userId → conceptId → stage → completed
  const progressMap = new Map<string, Map<string, Map<string, boolean>>>();
  for (const p of allProgress) {
    if (!progressMap.has(p.userId)) progressMap.set(p.userId, new Map());
    const userMap = progressMap.get(p.userId)!;
    if (!userMap.has(p.conceptId)) userMap.set(p.conceptId, new Map());
    userMap.get(p.conceptId)!.set(p.stage, p.completed);
  }

  const STAGES = ['READING', 'BLANK_EASY', 'BLANK_HARD', 'BLANK_FULL'] as const;

  const enrollmentsWithProgress = course.enrollments.map((enrollment) => {
    const userProgress = progressMap.get(enrollment.studentId);

    let completedCount = 0;
    let currentConceptTitle: string | null = null;
    let currentConceptIndex: number | null = null;
    let currentStage = 'NOT_STARTED';
    let foundCurrent = false;
    const perConceptStatus: string[] = [];

    for (let i = 0; i < course.concepts.length; i++) {
      const cc = course.concepts[i];
      const conceptProgress = userProgress?.get(cc.conceptId);
      const isBlankFullCompleted = conceptProgress?.get('BLANK_FULL') === true;

      if (isBlankFullCompleted) {
        completedCount++;
        perConceptStatus.push('completed');
      } else if (!foundCurrent) {
        foundCurrent = true;
        currentConceptIndex = i + 1; // 1-based
        currentConceptTitle = cc.concept.title;
        perConceptStatus.push('current');

        // 현재 단계 판별
        if (!conceptProgress || conceptProgress.size === 0) {
          currentStage = 'NOT_STARTED';
        } else {
          for (const stage of STAGES) {
            const stageCompleted = conceptProgress.get(stage);
            if (stageCompleted === undefined || stageCompleted === false) {
              currentStage = stage;
              break;
            }
          }
        }
      } else {
        perConceptStatus.push('locked');
      }
    }

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
      currentConceptTitle,
      currentConceptIndex,
      currentStage: completedCount === totalConcepts && totalConcepts > 0 ? 'ALL_COMPLETED' : currentStage,
      perConceptStatus,
    };
  });

  return NextResponse.json({
    data: {
      id: course.id,
      seq: course.seq,
      title: course.title,
      description: course.description,
      mode: course.mode,
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
  mode: z.enum(['free', 'sequential']).optional(),
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
    return badRequest(parsed.error.errors[0]?.message || '입력값 오류');
  }

  const { title, description, mode, conceptIds, isActive, removeEnrollmentId } = parsed.data;

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
        ...(mode !== undefined && { mode }),
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
