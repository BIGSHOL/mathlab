import { NextResponse } from 'next/server';
import { requireAuth, isResponse } from '@/lib/api';
import { getOrCreateTodayMission, checkMissionProgress } from '@/lib/services/daily-mission';

/** GET /api/missions/today — 오늘의 미션 (자동 생성 + 진행도 계산) */
export async function GET() {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  await getOrCreateTodayMission(user.id);
  const mission = await checkMissionProgress(user.id);

  return NextResponse.json({ data: mission });
}
