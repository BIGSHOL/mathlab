import { NextResponse } from 'next/server';
import { requireAuth, isResponse } from '@/lib/api';
import { getDailyTestItems } from '@/lib/services/spaced-review';

/**
 * GET /api/learning/review-daily-test
 * 매 수업일마다 치르는 짧은 복습 테스트 (최근 오답 우선 3~4문항)
 *
 * 쿼리: ?count=4 (기본 4, 최소 1, 최대 10)
 */
export async function GET(request: Request) {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const url = new URL(request.url);
  const countParam = Number(url.searchParams.get('count') ?? 4);
  const count = Math.max(1, Math.min(10, Number.isFinite(countParam) ? countParam : 4));

  const items = await getDailyTestItems(user.id, count);
  return NextResponse.json({ data: items });
}
