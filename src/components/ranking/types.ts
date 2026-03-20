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
}

export type RankingPeriod = 'week' | 'month' | 'all';
