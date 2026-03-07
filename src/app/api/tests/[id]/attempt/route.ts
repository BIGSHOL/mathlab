import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/** POST: 시험 시작 → TestAttempt 생성 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '학생만 시험에 응시할 수 있습니다' } },
      { status: 403 }
    );
  }

  const { id: testId } = await params;

  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test || !test.isActive) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '시험을 찾을 수 없습니다' } },
      { status: 404 }
    );
  }

  // 진행 중인 시도가 있는지 확인
  const existingAttempt = await prisma.testAttempt.findFirst({
    where: { testId, studentId: currentUser.id, completedAt: null },
  });

  if (existingAttempt) {
    return NextResponse.json({ data: existingAttempt });
  }

  // 문제 순서 (셔플 옵션)
  let orderedIds = test.questionIds as string[];
  if (test.shuffleOptions) {
    orderedIds = [...orderedIds].sort(() => Math.random() - 0.5);
  }

  // 각 문제의 배점 합산 → maxScore
  const questions = await prisma.question.findMany({
    where: { id: { in: orderedIds } },
    select: { id: true, difficulty: true },
  });

  const POINTS: Record<string, number> = {
    BASIC: 10, MEDIUM: 20, HIGH: 30, HIGHEST: 40,
  };
  const maxScore = questions.reduce(
    (sum, q) => sum + (POINTS[q.difficulty] ?? 20), 0
  );

  const attempt = await prisma.testAttempt.create({
    data: {
      testId,
      studentId: currentUser.id,
      totalCount: orderedIds.length,
      maxScore,
    },
  });

  return NextResponse.json({
    data: {
      ...attempt,
      questionOrder: orderedIds,
    },
  }, { status: 201 });
}
