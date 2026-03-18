import { NextRequest, NextResponse } from 'next/server';
import { requireAuthViewAs, isResponse } from '@/lib/api';
import { prisma } from '@/lib/db';
import { checkMissionProgress } from '@/lib/services/daily-mission';
import { awardXp, updateStreak } from '@/lib/utils/xp';

const MISSION_BONUS_XP = 20;

/** POST /api/missions/check — 미션 완료 확인 + 보너스 XP */
export async function POST(request: NextRequest) {
  const user = await requireAuthViewAs(request);
  if (isResponse(user)) return user;

  const mission = await checkMissionProgress(user.id);
  if (!mission) {
    return NextResponse.json({ data: { allComplete: false } });
  }

  // 이미 보상 받은 경우
  if (mission.xpAwarded > 0) {
    return NextResponse.json({ data: { allComplete: mission.allComplete, xpAwarded: 0, alreadyRewarded: true } });
  }

  // 전부 완료 시 보너스 XP
  if (mission.allComplete) {
    await prisma.$transaction(async (tx) => {
      await awardXp(tx, user.id, MISSION_BONUS_XP, 'DAILY_MISSION');
      await updateStreak(tx, user.id);
    });

    await prisma.dailyMission.update({
      where: { id: mission.id },
      data: { xpAwarded: MISSION_BONUS_XP },
    });

    return NextResponse.json({ data: { allComplete: true, xpAwarded: MISSION_BONUS_XP } });
  }

  return NextResponse.json({ data: { allComplete: false } });
}
