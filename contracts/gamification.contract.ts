import type { ApiResponse } from './types';

/** GET /api/gamification/points */
export type PointsResponse = ApiResponse<{
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  xpToNextLevel: number;
}>;

/** GET /api/gamification/ranking */
export type RankingResponse = ApiResponse<
  Array<{
    rank: number;
    userId: string;
    name: string;
    level: number;
    totalXp: number;
    isMe: boolean;
  }>
>;

/** POST /api/gamification/award (internal) */
export interface AwardPointsRequest {
  userId: string;
  amount: number;
  reason: string;
  referenceId?: string;
}

export type AwardPointsResponse = ApiResponse<{
  totalXp: number;
  level: number;
  leveledUp: boolean;
  previousLevel: number;
}>;
