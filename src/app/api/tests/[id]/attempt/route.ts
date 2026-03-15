import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/** POST: 시험 시작 → TestAttempt 생성 (재시험/마감일/배정 지원) */
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

  const { id: rawId } = await params;

  // Resolve by seq (numeric) or id (cuid)
  const seqNum = Number(rawId);
  const test = !isNaN(seqNum) && String(seqNum) === rawId
    ? await prisma.test.findUnique({ where: { seq: seqNum } })
    : await prisma.test.findUnique({ where: { id: rawId } });
  const testId = test?.id ?? rawId;
  if (!test || !test.isActive) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '시험을 찾을 수 없습니다' } },
      { status: 404 }
    );
  }

  // 배정 확인
  const assignment = await prisma.testAssignment.findUnique({
    where: { testId_studentId: { testId, studentId: currentUser.id } },
  });

  // 마감일 체크
  if (assignment?.dueDate && new Date() > assignment.dueDate && !assignment.allowLateSubmission) {
    return NextResponse.json(
      { error: { code: 'DEADLINE_PASSED', message: '마감 기한이 지났습니다' } },
      { status: 403 }
    );
  }

  // 완료된 시도 수 확인
  const completedAttempts = await prisma.testAttempt.count({
    where: { testId, studentId: currentUser.id, completedAt: { not: null } },
  });

  // maxAttempts 초과 체크
  if (test.maxAttempts !== null && completedAttempts >= test.maxAttempts) {
    return NextResponse.json(
      { error: { code: 'MAX_ATTEMPTS', message: `최대 응시 횟수(${test.maxAttempts}회)를 초과했습니다` } },
      { status: 403 }
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
      attemptNumber: completedAttempts + 1,
      assignmentId: assignment?.id ?? null,
    },
  });

  // 배정 상태 업데이트 (ASSIGNED → IN_PROGRESS)
  if (assignment && assignment.status === 'ASSIGNED') {
    await prisma.testAssignment.update({
      where: { id: assignment.id },
      data: { status: 'IN_PROGRESS' },
    });
  }

  return NextResponse.json({
    data: {
      ...attempt,
      questionOrder: orderedIds,
    },
  }, { status: 201 });
}
