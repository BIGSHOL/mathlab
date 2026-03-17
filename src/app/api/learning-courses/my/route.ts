import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, isResponse } from '@/lib/api';

// GET /api/learning-courses/my — 학생용: 내 배정 과정 조회
export async function GET() {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const enrollments = await prisma.learningCourseEnrollment.findMany({
    where: { studentId: user.id },
    include: {
      course: {
        include: {
          concepts: {
            orderBy: { sortOrder: 'asc' },
            include: {
              concept: {
                select: {
                  id: true,
                  title: true,
                  conceptCode: true,
                  grade: true,
                  chapter: true,
                  section: true,
                  part: true,
                  subject: { select: { title: true, gradeLevel: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  // 각 개념의 학습 진행률
  const conceptIds = enrollments.flatMap((e) => e.course.concepts.map((c) => c.conceptId));
  const progress = await prisma.learningProgress.findMany({
    where: { userId: user.id, conceptId: { in: conceptIds } },
    select: { conceptId: true, stage: true, completed: true },
  });

  const progressMap = new Map<string, Array<{ stage: string; completed: boolean }>>();
  for (const p of progress) {
    if (!progressMap.has(p.conceptId)) progressMap.set(p.conceptId, []);
    progressMap.get(p.conceptId)!.push({ stage: p.stage, completed: p.completed });
  }

  const mapEnrollment = (e: (typeof enrollments)[0]) => {
    const concepts = e.course.concepts.map((cc) => {
      const conceptProgress = progressMap.get(cc.conceptId) ?? [];
      const blankFullDone = conceptProgress.some((p) => p.stage === 'BLANK_FULL' && p.completed);
      return {
        ...cc.concept,
        sortOrder: cc.sortOrder,
        progress: conceptProgress,
        completed: blankFullDone,
      };
    });

    const completedCount = concepts.filter((c) => c.completed).length;

    return {
      enrollmentId: e.id,
      courseId: e.courseId,
      courseTitle: e.course.title,
      courseDescription: e.course.description,
      sortOrder: e.sortOrder,
      status: e.status,
      startedAt: e.startedAt,
      completedAt: e.completedAt,
      concepts,
      completedCount,
      totalCount: concepts.length,
      progressPercent: concepts.length > 0 ? Math.round((completedCount / concepts.length) * 100) : 0,
    };
  };

  const active = enrollments.find((e) => e.status === 'ACTIVE');
  const upcoming = enrollments.filter((e) => e.status === 'LOCKED');
  const completed = enrollments.filter((e) => e.status === 'COMPLETED');

  return NextResponse.json({
    data: {
      active: active ? mapEnrollment(active) : null,
      upcoming: upcoming.map(mapEnrollment),
      completed: completed.map(mapEnrollment),
    },
  });
}
