import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, isResponse, notFound, forbidden } from '@/lib/api';

/** GET: 진행 중인 시도 상태 조회 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const currentUser = await requireAuth();
  if (isResponse(currentUser)) return currentUser;

  const { attemptId } = await params;

  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: {
      test: true,
      answers: {
        orderBy: { createdAt: 'asc' },
        select: {
          questionId: true,
          isCorrect: true,
          timeSpentSeconds: true,
          comboCount: true,
          pointsEarned: true,
          selectedAnswer: true,
        },
      },
    },
  });

  if (!attempt) {
    return notFound('시도를 찾을 수 없습니다');
  }

  // 본인 시도만 조회 가능 (교사는 모두 조회 가능)
  if (currentUser.role === 'STUDENT' && attempt.studentId !== currentUser.id) {
    return forbidden();
  }

  const answeredIds = attempt.answers.map((a) => a.questionId);
  const questionOrder = attempt.test.questionIds as string[];
  const currentIndex = answeredIds.length;

  // 레벨테스트인 경우 진단 결과 포함
  let diagnosticResult = null;
  if (attempt.test.testType === 'level_test' && attempt.completedAt) {
    diagnosticResult = await prisma.diagnosticResult.findUnique({
      where: { attemptId },
    });
  }

  return NextResponse.json({
    data: {
      ...attempt,
      currentQuestionIndex: currentIndex,
      nextQuestionId: questionOrder[currentIndex] ?? null,
      questionOrder,
      diagnosticResult,
    },
  });
}
