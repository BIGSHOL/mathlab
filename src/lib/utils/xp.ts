/**
 * XP/Level calculation utilities
 * Based on 04-database-design.md section 2.7
 */

/** Level thresholds (cumulative XP required) */
const LEVEL_THRESHOLDS: Record<number, number> = {
  1: 0,
  2: 100,
  3: 250,
  4: 500,
  5: 800,
};

/** For levels 6+, each level requires previous + 400 */
function getXpForLevel(level: number): number {
  if (level <= 5) return LEVEL_THRESHOLDS[level] ?? 0;
  return getXpForLevel(level - 1) + 400;
}

/** Calculate level from total XP */
export function calculateLevel(totalXp: number): number {
  let level = 1;
  while (getXpForLevel(level + 1) <= totalXp) {
    level++;
  }
  return level;
}

/** Get XP needed for next level */
export function xpToNextLevel(totalXp: number): { current: number; required: number; remaining: number } {
  const currentLevel = calculateLevel(totalXp);
  const currentLevelXp = getXpForLevel(currentLevel);
  const nextLevelXp = getXpForLevel(currentLevel + 1);

  return {
    current: totalXp - currentLevelXp,
    required: nextLevelXp - currentLevelXp,
    remaining: nextLevelXp - totalXp,
  };
}

/** XP rewards per activity (from 04-database-design.md section 2.6) */
export const XP_REWARDS = {
  READING_COMPLETE: 5,
  BLANK_EASY: 10,
  BLANK_HARD: 15,
  BLANK_FULL: 20,
  BLANK_PAGE: 30,
  BONUS: 5,
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaTx = { studentProfile: any; pointTransaction: any };

/**
 * 트랜잭션 내에서 XP 부여 + 레벨 갱신 + PointTransaction 기록
 * grading.ts, manual-grading.ts 등에서 반복되던 패턴 통합
 */
export async function awardXp(
  tx: PrismaTx,
  userId: string,
  amount: number,
  reason: string,
  referenceId?: string
) {
  if (amount <= 0) return;

  const profile = await tx.studentProfile.findUnique({
    where: { userId },
    select: { totalXp: true },
  });

  if (profile) {
    const newTotalXp = profile.totalXp + amount;
    await tx.studentProfile.update({
      where: { userId },
      data: {
        totalXp: newTotalXp,
        level: calculateLevel(newTotalXp),
        lastActiveAt: new Date(),
      },
    });
  }

  await tx.pointTransaction.create({
    data: {
      userId,
      amount,
      type: 'EARN',
      reason,
      referenceId,
    },
  });
}
