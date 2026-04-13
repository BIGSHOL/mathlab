import { NextRequest, NextResponse } from 'next/server';
import { requireAuthViewAs, isResponse } from '@/lib/api';
import { getFailedReviews } from '@/lib/services/spaced-review';

/**
 * GET /api/learning/review-failed
 * 복습 중 탈락한 항목 목록 (별도 관리 대상)
 * 학생 본인 + ?_as=studentId View-As 지원 (선생님이 학생 실패 목록 확인)
 */
export async function GET(request: NextRequest) {
  const user = await requireAuthViewAs(request);
  if (isResponse(user)) return user;

  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get('limit') ?? 50);
  const limit = Math.max(1, Math.min(200, Number.isFinite(limitParam) ? limitParam : 50));

  const items = await getFailedReviews(user.id, limit);
  return NextResponse.json({ data: items });
}
