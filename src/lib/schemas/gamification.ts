import { z } from 'zod';

export const awardPointsSchema = z.object({
  userId: z.string().min(1, '학생 ID가 필요합니다'),
  amount: z.number().int().positive('포인트는 양수여야 합니다'),
  reason: z.string().min(1, '사유가 필요합니다').max(50),
  referenceId: z.string().optional(),
});

export const rankingQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type AwardPointsInput = z.infer<typeof awardPointsSchema>;
export type RankingQuery = z.infer<typeof rankingQuerySchema>;
