import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { submitAnswer } from '@/lib/services/grading';

/** POST: 답안 제출 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '학생만 답안을 제출할 수 있습니다' } },
      { status: 403 }
    );
  }

  const { attemptId } = await params;
  const body = await request.json();
  const { questionId, selectedAnswer, timeSpentSeconds } = body;

  if (!questionId || selectedAnswer === undefined || timeSpentSeconds === undefined) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '필수 항목이 누락되었습니다' } },
      { status: 400 }
    );
  }

  try {
    const result = await submitAnswer({
      attemptId,
      questionId,
      selectedAnswer: String(selectedAnswer),
      timeSpentSeconds: Math.max(0, Math.round(timeSpentSeconds)),
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : '채점 중 오류가 발생했습니다';
    return NextResponse.json(
      { error: { code: 'GRADING_ERROR', message } },
      { status: 400 }
    );
  }
}
