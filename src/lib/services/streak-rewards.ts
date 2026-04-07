import { prisma } from '@/lib/db';
import { STREAK_MILESTONES, type StreakMilestone } from '@/lib/constants/streak-milestones';
import { awardXp } from '@/lib/utils/xp';

interface StreakRewardResult {
  milestone: StreakMilestone | null;
  bonusXpAwarded: number;
}

/**
 * 스트릭 마일스톤 도달 확인 + 보너스 XP 지급.
 * PointTransaction reason으로 중복 방지.
 */
export async function checkStreakMilestone(userId: string): Promise<StreakRewardResult> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { currentStreak: true },
  });
  if (!profile) return { milestone: null, bonusXpAwarded: 0 };

  const milestone = STREAK_MILESTONES.find((m) => m.days === profile.currentStreak);
  if (!milestone) return { milestone: null, bonusXpAwarded: 0 };

  // 이미 지급했는지 확인
  const existing = await prisma.pointTransaction.findFirst({
    where: { userId, reason: `STREAK_MILESTONE_${milestone.days}` },
  });
  if (existing) return { milestone: null, bonusXpAwarded: 0 };

  // 보너스 XP 지급
  await prisma.$transaction(async (tx) => {
    await awardXp(tx, userId, milestone.bonusXp, `STREAK_MILESTONE_${milestone.days}`);
  });

  return { milestone, bonusXpAwarded: milestone.bonusXp };
}
