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
