import { NextRequest, NextResponse } from 'next/server';
import { requireAuthViewAs, isResponse } from '@/lib/api';
import { getTodayRoulette } from '@/lib/services/daily-roulette';

/** GET /api/roulette/today — 오늘 결과 (없으면 null) */
export async function GET(request: NextRequest) {
  const user = await requireAuthViewAs(request);
  if (isResponse(user)) return user;

  const result = await getTodayRoulette(user.id);

  return NextResponse.json({ data: result });
}
