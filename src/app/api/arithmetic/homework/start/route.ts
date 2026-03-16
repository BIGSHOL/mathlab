import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isResponse, badRequest } from '@/lib/api';
import { startHomeworkAttempt } from '@/lib/services/homework';

/** POST: 숙제 시작 (ArithmeticAttempt 생성 + 문제 반환) */
export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const body = await request.json();
  const { planId, dayIndex, isRetry } = body;

  if (!planId || dayIndex === undefined) {
    return badRequest('planId와 dayIndex가 필요합니다');
  }

  try {
    const result = await startHomeworkAttempt(user.id, planId, dayIndex, !!isRetry);
    return NextResponse.json({ data: result });
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'START_FAILED', message: (err as Error).message } },
      { status: 400 }
    );
  }
}
