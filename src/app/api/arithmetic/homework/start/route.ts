import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { startHomeworkAttempt } from '@/lib/services/homework';

/** POST: 숙제 시작 (ArithmeticAttempt 생성 + 문제 반환) */
export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { planId, dayIndex, isRetry } = body;

  if (!planId || dayIndex === undefined) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'planId와 dayIndex가 필요합니다' } },
      { status: 400 }
    );
  }

  try {
    const result = await startHomeworkAttempt(currentUser.id, planId, dayIndex, !!isRetry);
    return NextResponse.json({ data: result });
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'START_FAILED', message: (err as Error).message } },
      { status: 400 }
    );
  }
}
