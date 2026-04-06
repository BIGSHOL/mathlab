import { NextRequest, NextResponse } from 'next/server';
import { requireAuthViewAs, isResponse, badRequest, requireLicense } from '@/lib/api';
import { startHomeworkAttempt } from '@/lib/services/homework';

/** POST: 숙제 시작 (ArithmeticAttempt 생성 + 문제 반환) */
export async function POST(request: NextRequest) {
  const user = await requireAuthViewAs(request);
  if (isResponse(user)) return user;
  const licenseCheck = await requireLicense(user, 'homework');
  if (licenseCheck) return licenseCheck;

  const body = await request.json();
  const { planId, dayIndex, isRetry } = body;

  if (!planId || dayIndex === undefined) {
    return badRequest('planId와 dayIndex가 필요합니다');
  }

  try {
    const result = await startHomeworkAttempt(user.id, planId, dayIndex, !!isRetry);
    return NextResponse.json({ data: result });
  } catch (err) {
    console.error('숙제 시작 오류:', err);
    return NextResponse.json(
      { error: { code: 'START_FAILED', message: '숙제 시작에 실패했습니다' } },
      { status: 400 }
    );
  }
}
