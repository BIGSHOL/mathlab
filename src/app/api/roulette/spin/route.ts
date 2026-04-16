import { NextRequest, NextResponse } from 'next/server';
import { requireAuthViewAs, isResponse } from '@/lib/api';
import { spinRoulette } from '@/lib/services/daily-roulette';

/** POST /api/roulette/spin — 오늘의 룰렛 돌리기 (1일 1회) */
export async function POST(request: NextRequest) {
  const user = await requireAuthViewAs(request);
  if (isResponse(user)) return user;

  const result = await spinRoulette(user.id);

  return NextResponse.json({ data: result });
}
