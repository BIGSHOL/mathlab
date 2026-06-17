import { NextResponse } from 'next/server';
import { requireOwner, isResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * POST /api/entitlements/allocate — 폐지(2026-06-17).
 * 기출분석 이용권은 학생별 배정 없이 지점 풀에서 분석당 직접 차감된다(consumeExamAnalysisCredit).
 * 배정은 풀 크레딧을 학생 lot 으로 옮겨 풀 차감 경로에서 사라지게(stranding) 만들 수 있어 비활성화.
 */
export async function POST() {
  const user = await requireOwner();
  if (isResponse(user)) return user;
  return NextResponse.json(
    { error: { code: 'DEPRECATED', message: '학생별 이용권 배정은 폐지되었습니다. 기출분석은 지점 이용권에서 자동 차감됩니다.' } },
    { status: 410 },
  );
}
