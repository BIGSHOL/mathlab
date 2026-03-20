import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireTeacher, isResponse, badRequest } from '@/lib/api';

/** POST: 진단평가 생성 (기존 Test 시스템 활용, testType='diagnostic') */
export async function POST(request: NextRequest) {
  const currentUser = await requireTeacher();
  if (isResponse(currentUser)) return currentUser;

  const body = await request.json();
  const { title, grade, diagnosticType, questionIds } = body;

  if (!title || !grade || !diagnosticType || !questionIds?.length) {
    return badRequest('필수 필드가 누락되었습니다');
  }

  const test = await prisma.$transaction(async (tx) => {
    const created = await tx.test.create({
      data: {
        title: `[진단] ${title}`,
        grade,
        testType: `diagnostic_${diagnosticType.toLowerCase()}`,
        questionIds,
        questionCount: questionIds.length,
        maxAttempts: 1,
        createdBy: currentUser.id,
      },
    });

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

/** GET: 진단평가 목록 조회 */
export async function GET() {
  const currentUser = await requireAuth();
  if (isResponse(currentUser)) return currentUser;

  const where = {
    testType: { startsWith: 'diagnostic_' },
    isActive: true,
    ...(currentUser.role === 'STUDENT' ? {
      assignments: { some: { studentId: currentUser.id } },
    } : {}),
  };

  const tests = await prisma.test.findMany({
    where,
    select: {
      id: true,
      seq: true,
      title: true,
      grade: true,
      testType: true,
      questionCount: true,
      createdAt: true,
      _count: { select: { attempts: true, assignments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data: tests });
}
