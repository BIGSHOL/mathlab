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

  // 모든 XP 획득 활동에서 출석 스트릭 업데이트 (dayDiff===0이면 즉시 리턴되므로 안전)
  await updateStreak(tx, userId);
}

/**
 * 트랜잭션 내에서 XP 차감 + PointTransaction(SPEND) 기록.
 * totalXp는 건드리지 않고 spentXp만 증가 → 레벨 하락 없음.
 * @returns 성공 여부 (잔액 부족 시 false)
 */
export async function spendXp(
  tx: PrismaTx,
  userId: string,
  amount: number,
  reason: string,
  referenceId?: string
): Promise<boolean> {
  if (amount <= 0) return false;

  const profile = await tx.studentProfile.findUnique({
    where: { userId },
    select: { totalXp: true, spentXp: true },
  });
  if (!profile) return false;

  const spendable = profile.totalXp - profile.spentXp;
  if (spendable < amount) return false;

  await tx.studentProfile.update({
    where: { userId },
    data: { spentXp: { increment: amount } },
  });

  await tx.pointTransaction.create({
    data: { userId, amount, type: 'SPEND', reason, referenceId },
  });

  return true;
}

/** 스트릭 업데이트 — 모든 XP 획득 활동 시 자동 호출 */
export async function updateStreak(tx: PrismaTx, userId: string) {
  const profile = await tx.studentProfile.findUnique({
    where: { userId },
    select: { currentStreak: true, longestStreak: true, lastActiveAt: true },
  });
  if (!profile) return;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastActive = profile.lastActiveAt
    ? new Date(profile.lastActiveAt.getFullYear(), profile.lastActiveAt.getMonth(), profile.lastActiveAt.getDate())
    : null;

  const dayDiff = lastActive ? Math.floor((today.getTime() - lastActive.getTime()) / 86400000) : 999;

  if (dayDiff === 0) return; // 오늘 이미 갱신됨
  if (dayDiff === 1) {
    // 어제 활동 → 연속
    const newStreak = profile.currentStreak + 1;
    await tx.studentProfile.update({
      where: { userId },
      data: {
        currentStreak: newStreak,
        longestStreak: Math.max(profile.longestStreak, newStreak),
        lastActiveAt: now,
      },
    });
  } else {
    // 하루 이상 빠짐 → 리셋
    await tx.studentProfile.update({
      where: { userId },
      data: { currentStreak: 1, lastActiveAt: now },
    });
  }
}
