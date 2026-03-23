import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireTeacher, isResponse, badRequest, getTenantFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const currentUser = await requireAuth();
  if (isResponse(currentUser)) return currentUser;

  const { searchParams } = new URL(request.url);
  const grade = searchParams.get('grade');
  const testType = searchParams.get('testType');

  const tenantWhere = getTenantFilter(currentUser);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = { isActive: true, ...tenantWhere };
  if (grade) where.grade = parseInt(grade);
  if (testType) where.testType = testType;

  // 학생: 자기 학년 시험 + 배정된 시험 (학년 무관)
  if (currentUser.role === 'STUDENT' && currentUser.grade) {
    const assignedTestIds = await prisma.testAssignment.findMany({
      where: { studentId: currentUser.id },
      select: { testId: true },
    });
    where.OR = [
      { grade: currentUser.grade },
      { id: { in: assignedTestIds.map((a) => a.testId) } },
    ];
  }

  const tests = await prisma.test.findMany({
    where,
    include: {
      creator: { select: { name: true } },
      _count: { select: { attempts: true, assignments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 학생인 경우 본인 시도 정보 + 배정 정보 추가
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let testsWithStatus: any[] = tests;
  if (currentUser.role === 'STUDENT') {
    const [attempts, assignments] = await Promise.all([
      prisma.testAttempt.findMany({
        where: {
          studentId: currentUser.id,
          testId: { in: tests.map((t) => t.id) },
        },
        select: { testId: true, completedAt: true, score: true, maxScore: true, attemptNumber: true },
        orderBy: { score: 'desc' },
      }),
      prisma.testAssignment.findMany({
        where: {
          studentId: currentUser.id,
          testId: { in: tests.map((t) => t.id) },
        },
        select: { testId: true, dueDate: true, status: true, bestScore: true, allowLateSubmission: true },
      }),
    ]);

    // 시도: testId별로 그룹
    const attemptsByTest = new Map<string, typeof attempts>();
    for (const a of attempts) {
      const list = attemptsByTest.get(a.testId) ?? [];
      list.push(a);
      attemptsByTest.set(a.testId, list);
    }
    const assignmentMap = new Map(assignments.map((a) => [a.testId, a]));

    testsWithStatus = tests.map((t) => {
      const testAttempts = attemptsByTest.get(t.id) ?? [];
      const completedAttempts = testAttempts.filter((a) => a.completedAt);
      const bestAttempt = completedAttempts[0]; // sorted by score desc
      const assignment = assignmentMap.get(t.id);

      return {
        ...t,
        myAttempt: bestAttempt
          ? {
              completed: true,
              score: bestAttempt.score,
              maxScore: bestAttempt.maxScore,
            }
          : testAttempts.length > 0
            ? { completed: false, score: testAttempts[0].score, maxScore: testAttempts[0].maxScore }
            : null,
        attemptCount: completedAttempts.length,
        assignment: assignment ?? null,
      };
    });
  }

  return NextResponse.json({ data: testsWithStatus });
}

export async function POST(request: NextRequest) {
  const currentUser = await requireTeacher();
  if (isResponse(currentUser)) return currentUser;

  const body = await request.json();
  const { title, description, grade, testType, questionIds, timeLimitMin, shuffleOptions, maxAttempts, defaultDueDate, allowLateSubmission } = body;

  if (!title || !grade || !questionIds?.length) {
    return badRequest('필수 항목이 누락되었습니다');
  }

  const test = await prisma.$transaction(async (tx) => {
    const created = await tx.test.create({
      data: {
        title,
        description: description || null,
        grade,
        testType: testType || 'concept',
        questionIds,
        questionCount: questionIds.length,
        timeLimitMin: timeLimitMin || null,
        shuffleOptions: shuffleOptions || false,
        maxAttempts: maxAttempts ?? null,
        defaultDueDate: defaultDueDate ? new Date(defaultDueDate) : null,
        allowLateSubmission: allowLateSubmission || false,
        createdBy: currentUser.id,
        tenantId: currentUser.tenantId,
      },
    });

    // Dual-Write: 중간테이블에도 기록
    await tx.testQuestion.createMany({
      data: (questionIds as string[]).map((qId: string, idx: number) => ({
        testId: created.id,
        questionId: qId,
        sortOrder: idx,
      })),
    });

    return created;
  });

  return NextResponse.json({ data: test }, { status: 201 });
}
