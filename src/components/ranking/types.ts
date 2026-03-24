export interface RankingEntry {
  rank: number;
  userId: string;
  name: string;
  level: number;
  totalXp: number;
  weeklyXp: number;
  rankChange: number;
  currentStreak: number;
  isMe: boolean;
  isNew: boolean;
  badgeIcon: string | null;
  /** 보석 랭킹용: 완성 보석 수 */
  completedGems?: number;
}

export type RankingPeriod = 'week' | 'month' | 'all';
export type RankingCategory = 'xp' | 'gem';
export type RankingScope = 'tenant' | 'all';
