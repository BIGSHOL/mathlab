import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { submitAnswer } from '@/lib/services/grading';
import { forbidden, badRequest, clamp } from '@/lib/api';

/** POST: 답안 제출 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'STUDENT') {
    return forbidden('학생만 답안을 제출할 수 있습니다');
  }

  const { attemptId } = await params;
  const body = await request.json();
  const { questionId, selectedAnswer, timeSpentSeconds, tabSwitchCount, isRetry } = body;

  if (!questionId || selectedAnswer === undefined || timeSpentSeconds === undefined) {
    return badRequest('필수 항목이 누락되었습니다');
  }

  try {
    const result = await submitAnswer({
      attemptId,
      questionId,
      selectedAnswer: String(selectedAnswer),
      timeSpentSeconds: clamp(Math.round(timeSpentSeconds), 0, 3600),
      tabSwitchCount: tabSwitchCount ? Math.max(0, Number(tabSwitchCount)) : undefined,
      isRetry: isRetry === true,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('답안 제출 채점 오류:', error);
    return badRequest('채점 중 오류가 발생했습니다');
  }
}
