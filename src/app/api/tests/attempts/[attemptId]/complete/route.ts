import { NextRequest, NextResponse } from 'next/server';
import { completeAttempt } from '@/lib/services/grading';
import { prisma } from '@/lib/db';
import { requireAuthViewAs, isResponse, badRequest } from '@/lib/api';

/** POST: 시험 완료 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const user = await requireAuthViewAs(request);
  if (isResponse(user)) return user;

  const { attemptId } = await params;

  try {
    const result = await completeAttempt(attemptId);

    // 레벨테스트인 경우 자동 분석 트리거
    const attempt = await prisma.testAttempt.findUnique({
      where: { id: attemptId },
      include: { test: { select: { testType: true } } },
    });
    if (attempt?.test.testType === 'level_test') {
      try {
        const { analyzeLevelTest } = await import('@/lib/services/level-test');
        await analyzeLevelTest(attemptId, user.id);
      } catch {
        // Non-fatal: 분석은 수동으로 재실행 가능
      }
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('시험 완료 오류:', error);
    return badRequest('시험 완료 중 오류가 발생했습니다');
  }
}
