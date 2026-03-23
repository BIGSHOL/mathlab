import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, isResponse, notFound, forbidden } from '@/lib/api';
import { getTestQuestionIds } from '@/lib/utils/question-order';
import { completeAttempt } from '@/lib/services/grading';

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
          hintUsed: true,
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

  // 시간 초과 체크: 미완료 시도에 제한시간이 있으면 서버에서 자동 완료
  if (
    !attempt.completedAt &&
    attempt.test.timeLimitMin &&
    attempt.test.timeLimitMin > 0
  ) {
    const elapsed = (Date.now() - new Date(attempt.startedAt).getTime()) / 1000;
    if (elapsed > attempt.test.timeLimitMin * 60 + 30) { // 30초 유예
      try {
        await completeAttempt(attempt.id);
        // 완료 후 재조회
        const updated = await prisma.testAttempt.findUnique({
          where: { id: attemptId },
          include: { test: true, answers: { orderBy: { createdAt: 'asc' }, select: {
            questionId: true, isCorrect: true, timeSpentSeconds: true,
            comboCount: true, pointsEarned: true, selectedAnswer: true, hintUsed: true,
          }}},
        });
        if (updated) {
          return NextResponse.json({ data: { ...updated, isExpired: true } });
        }
      } catch {
        // 이미 완료된 경우 무시
      }
    }
  }

  const answeredIds = attempt.answers.map((a) => a.questionId);
  // 저장된 셔플 순서 우선, 없으면 중간테이블에서 조회
  const questionOrder = (Array.isArray(attempt.questionOrder) && attempt.questionOrder.length > 0)
    ? attempt.questionOrder as string[]
    : await getTestQuestionIds(attempt.test.id);
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
