import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { completeAttempt } from '@/lib/services/grading';

/** POST: 시험 완료 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '학생만 시험을 완료할 수 있습니다' } },
      { status: 403 }
    );
  }

  const { attemptId } = await params;

  try {
    const result = await completeAttempt(attemptId);
    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : '시험 완료 중 오류가 발생했습니다';
    return NextResponse.json(
      { error: { code: 'COMPLETE_ERROR', message } },
      { status: 400 }
    );
  }
}
