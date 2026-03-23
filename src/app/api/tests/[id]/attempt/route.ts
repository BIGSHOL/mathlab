import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { forbidden, notFound, requireLicense } from '@/lib/api';
import { getTestQuestionIds } from '@/lib/utils/question-order';

/** POST: 시험 시작 → TestAttempt 생성 (재시험/마감일/배정 지원) */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'STUDENT') {
    return forbidden('학생만 시험에 응시할 수 있습니다');
  }
  const licenseCheck = await requireLicense(currentUser, 'test');
  if (licenseCheck) return licenseCheck;

  const { id: rawId } = await params;

  // Resolve by seq (numeric) or id (cuid)
  const seqNum = Number(rawId);
  const test = !isNaN(seqNum) && String(seqNum) === rawId
    ? await prisma.test.findUnique({ where: { seq: seqNum } })
    : await prisma.test.findUnique({ where: { id: rawId } });
  const testId = test?.id ?? rawId;
  if (!test || !test.isActive) {
    return notFound('시험을 찾을 수 없습니다');
  }

  // 배정 확인
  const assignment = await prisma.testAssignment.findUnique({
    where: { testId_studentId: { testId, studentId: currentUser.id } },
  });

  // 마감일 체크
  if (assignment?.dueDate && new Date() > assignment.dueDate && !assignment.allowLateSubmission) {
    return forbidden('마감 기한이 지났습니다');
  }

  // 완료된 시도 수 확인
  const completedAttempts = await prisma.testAttempt.count({
    where: { testId, studentId: currentUser.id, completedAt: { not: null } },
  });

  // maxAttempts 초과 체크
  if (test.maxAttempts !== null && completedAttempts >= test.maxAttempts) {
    return forbidden(`최대 응시 횟수(${test.maxAttempts}회)를 초과했습니다`);
  }

  // 진행 중인 시도가 있는지 확인
  const existingAttempt = await prisma.testAttempt.findFirst({
    where: { testId, studentId: currentUser.id, completedAt: null },
    include: {
      test: true,
      answers: {
        orderBy: { createdAt: 'asc' },
        select: {
          questionId: true, isCorrect: true, timeSpentSeconds: true,
          comboCount: true, pointsEarned: true, selectedAnswer: true, hintUsed: true,
        },
      },
    },
  });

  if (existingAttempt) {
    const eqOrder = (Array.isArray(existingAttempt.questionOrder) && (existingAttempt.questionOrder as string[]).length > 0)
      ? existingAttempt.questionOrder as string[]
      : await getTestQuestionIds(existingAttempt.test.id);
    const answeredCount = existingAttempt.answers.length;
    return NextResponse.json({
      data: {
        ...existingAttempt,
        questionOrder: eqOrder,
        currentQuestionIndex: answeredCount,
        nextQuestionId: eqOrder[answeredCount] ?? null,
      },
    });
  }

  // 문제 순서 (중간테이블 우선, 셔플 옵션)
  let orderedIds = await getTestQuestionIds(testId);
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
      questionOrder: orderedIds,
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
      currentQuestionIndex: 0,
      nextQuestionId: orderedIds[0] ?? null,
      answers: [],
      test,
    },
  }, { status: 201 });
}
